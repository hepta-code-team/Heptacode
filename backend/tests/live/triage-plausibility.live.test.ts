import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type {
  CareLevel,
  TriageResponse,
} from '../../src/modules/triage/triage.types.js'
import {
  TRIAGE_PLAUSIBILITY_CATEGORIES,
  TRIAGE_PLAUSIBILITY_LIVE_CASES,
  type TriagePlausibilityCategory,
} from '../fixtures/triagePlausibilityLiveCases.js'

/** Live AI evaluations are opt-in because they call an external model. */
const runLiveAiEval = process.env.RUN_AI_TRIAGE_EVAL === 'true' || process.env.RUN_AI_TRIAGE_EVAL === '1'
const itLive = runLiveAiEval ? it : it.skip

/** Captures one evaluated case for the final accuracy report. */
type EvaluationResult = {
  id: string
  name: string
  category: TriagePlausibilityCategory
  expectedCareLevel: CareLevel
  actualCareLevel?: CareLevel
  aiModel?: string
  passed: boolean
  fallbackUsed: boolean
  unavailable: boolean
  reasons: string[]
  error?: string
}

/** Stores case outcomes until the category and total summaries are printed. */
const evaluationResults: EvaluationResult[] = []

/** Reuses the availability probe as the first evaluated case. */
const cachedResults = new Map<string, TriageResponse>()

/** Distinguishes an unreachable AI service from a rejected plausibility response. */
function isAvailabilityFallback(result: TriageResponse): boolean {
  return (
    result.aiUnavailable === true &&
    !result.reasons.some((reason) =>
      reason.includes('KI-Antwort wurde verworfen'),
    )
  )
}

/** Formats a case ratio as a percentage for console reporting. */
function formatRate(passed: number, total: number): string {
  return total === 0 ? 'n/a' : `${((passed / total) * 100).toFixed(1)}%`
}

/** Prints total accuracy, category rates, and failed case details. */
function logEvaluationSummary(): void {
  const availableResults = evaluationResults.filter((result) => !result.unavailable)
  const passed = evaluationResults.filter((result) => result.passed).length

  const categories = TRIAGE_PLAUSIBILITY_CATEGORIES.map((category) => {
    const results = availableResults.filter((result) => result.category === category)
    const categoryPassed = results.filter((result) => result.passed).length

    return {
      category,
      passed: categoryPassed,
      total: results.length,
      rate: formatRate(categoryPassed, results.length),
    }
  })

  console.info('Live AI triage plausibility evaluation summary', {
    passed,
    evaluated: availableResults.length,
    unavailable: evaluationResults.length - availableResults.length,
    total: evaluationResults.length,
    rate: formatRate(passed, availableResults.length),
    categories,
    failures: evaluationResults
      .filter((result) => !result.passed)
      .map(({ id, expectedCareLevel, actualCareLevel, fallbackUsed, unavailable, reasons, error }) => ({
        id,
        expectedCareLevel,
        actualCareLevel,
        fallbackUsed,
        unavailable,
        reasons,
        error,
      })),
  })
}

describe('live AI triage plausibility evaluation', () => {
  /** Aborts before evaluation when neither configured AI model is reachable. */
  beforeAll(async () => {
    if (!runLiveAiEval) {
      return
    }

    const firstCase = TRIAGE_PLAUSIBILITY_LIVE_CASES[0]

    if (!firstCase) {
      throw new Error('No live AI triage plausibility cases configured')
    }

    const { evaluateTriage } = await import('../../src/modules/triage/triage.service.js')
    const result = await evaluateTriage(firstCase.patientData, firstCase.symptoms)

    if (isAvailabilityFallback(result)) {
      throw new Error(
        'Live AI triage evaluation aborted: primary and fallback AI were unavailable. No correctness rate was calculated.',
      )
    }

    cachedResults.set(firstCase.id, result)
  }, 120_000)

  /** Reports accuracy only when at least one live case was evaluated. */
  afterAll(() => {
    if (runLiveAiEval && evaluationResults.length > 0) {
      logEvaluationSummary()
    }
  })

  /** Each case should be classified by the AI without a local availability or plausibility fallback. */
  itLive.each(TRIAGE_PLAUSIBILITY_LIVE_CASES)(
    'ordnet $category: $name korrekt zu',
    async ({ id, name, category, expectedCareLevel, patientData, symptoms }) => {
      try {
        const cachedResult = cachedResults.get(id)
        const result = cachedResult ?? await (async () => {
          const { evaluateTriage } = await import('../../src/modules/triage/triage.service.js')
          return evaluateTriage(patientData, symptoms)
        })()
        const fallbackUsed = result.aiUnavailable === true
        const unavailable = isAvailabilityFallback(result)
        const passed = !fallbackUsed && result.careLevel === expectedCareLevel

        evaluationResults.push({
          id,
          name,
          category,
          expectedCareLevel,
          actualCareLevel: result.careLevel,
          aiModel: result.aiModel,
          passed,
          fallbackUsed,
          unavailable,
          reasons: result.reasons,
        })

        console.info('Live AI plausibility case result', {
          id,
          category,
          expectedCareLevel,
          actualCareLevel: result.careLevel,
          fallbackUsed,
          unavailable,
          aiModel: result.aiModel,
          reasons: result.reasons,
        })

        expect(
          unavailable,
          'AI availability fallback used; this case cannot measure model correctness',
        ).toBe(false)
        expect(result.aiUnavailable).toBeUndefined()
        expect(result.careLevel).toBe(expectedCareLevel)
      } catch (error) {
        if (!evaluationResults.some((result) => result.id === id)) {
          evaluationResults.push({
            id,
            name,
            category,
            expectedCareLevel,
            passed: false,
            fallbackUsed: false,
            unavailable: false,
            reasons: [],
            error: error instanceof Error ? error.message : String(error),
          })
        }

        throw error
      }
    },
    120_000,
  )
})

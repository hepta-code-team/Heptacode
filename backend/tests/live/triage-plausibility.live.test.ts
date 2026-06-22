import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type {
  CareLevel,
} from '../../src/modules/triage/triage.types.js'
import type { TriageEvaluationDiagnostics } from '../../src/modules/triage/triage.service.js'
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
  directAiCareLevel?: CareLevel
  finalCareLevel?: CareLevel
  aiModel?: string
  directAiPassed: boolean
  systemPassed: boolean
  fallbackType: TriageEvaluationDiagnostics['fallbackType']
  unavailable: boolean
  aiReasons: string[]
  finalReasons: string[]
  plausibilityIssues: string[]
  error?: string
}

/** Stores case outcomes until the category and total summaries are printed. */
const evaluationResults: EvaluationResult[] = []

/** Reuses the availability probe as the first evaluated case. */
const cachedResults = new Map<string, TriageEvaluationDiagnostics>()

/** Distinguishes an unreachable AI service from a rejected plausibility response. */
function isAvailabilityFallback(result: TriageEvaluationDiagnostics): boolean {
  return result.fallbackType === 'availability'
}

/** Formats a case ratio as a percentage for console reporting. */
function formatRate(passed: number, total: number): string {
  return total === 0 ? 'n/a' : `${((passed / total) * 100).toFixed(1)}%`
}

/** Prints total accuracy, category rates, and failed case details. */
function logEvaluationSummary(): void {
  const availableResults = evaluationResults.filter((result) => !result.unavailable)
  const directAiPassed = availableResults.filter((result) => result.directAiPassed).length
  const systemPassed = availableResults.filter((result) => result.systemPassed).length

  const categories = TRIAGE_PLAUSIBILITY_CATEGORIES.map((category) => {
    const results = availableResults.filter((result) => result.category === category)
    const categoryDirectAiPassed = results.filter((result) => result.directAiPassed).length
    const categorySystemPassed = results.filter((result) => result.systemPassed).length

    return {
      category,
      total: results.length,
      directAi: {
        passed: categoryDirectAiPassed,
        rate: formatRate(categoryDirectAiPassed, results.length),
      },
      finalSystem: {
        passed: categorySystemPassed,
        rate: formatRate(categorySystemPassed, results.length),
      },
    }
  })

  console.info('Live AI triage plausibility evaluation summary', {
    evaluated: availableResults.length,
    unavailable: evaluationResults.length - availableResults.length,
    total: evaluationResults.length,
    directAi: {
      passed: directAiPassed,
      rate: formatRate(directAiPassed, availableResults.length),
    },
    finalSystem: {
      passed: systemPassed,
      rate: formatRate(systemPassed, availableResults.length),
    },
    categories,
    failures: evaluationResults
      .filter((result) => !result.directAiPassed || !result.systemPassed)
      .map(({
        id,
        expectedCareLevel,
        directAiCareLevel,
        finalCareLevel,
        fallbackType,
        unavailable,
        aiReasons,
        finalReasons,
        plausibilityIssues,
        error,
      }) => ({
        id,
        expectedCareLevel,
        directAiCareLevel,
        finalCareLevel,
        fallbackType,
        unavailable,
        aiReasons,
        finalReasons,
        plausibilityIssues,
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

    const { evaluateTriageWithDiagnostics } = await import('../../src/modules/triage/triage.service.js')
    const result = await evaluateTriageWithDiagnostics(firstCase.patientData, firstCase.symptoms)

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
          const { evaluateTriageWithDiagnostics } = await import('../../src/modules/triage/triage.service.js')
          return evaluateTriageWithDiagnostics(patientData, symptoms)
        })()
        const unavailable = isAvailabilityFallback(result)
        const directAiPassed = result.aiResponse?.careLevel === expectedCareLevel
        const systemPassed = result.finalResponse.careLevel === expectedCareLevel

        evaluationResults.push({
          id,
          name,
          category,
          expectedCareLevel,
          directAiCareLevel: result.aiResponse?.careLevel,
          finalCareLevel: result.finalResponse.careLevel,
          aiModel: result.aiResponse?.aiModel,
          directAiPassed,
          systemPassed,
          fallbackType: result.fallbackType,
          unavailable,
          aiReasons: result.aiResponse?.reasons ?? [],
          finalReasons: result.finalResponse.reasons,
          plausibilityIssues: result.plausibilityIssues,
        })

        console.info('Live AI plausibility case result', {
          id,
          category,
          expectedCareLevel,
          directAiCareLevel: result.aiResponse?.careLevel,
          finalCareLevel: result.finalResponse.careLevel,
          directAiPassed,
          systemPassed,
          fallbackType: result.fallbackType,
          unavailable,
          aiModel: result.aiResponse?.aiModel,
          aiReasons: result.aiResponse?.reasons ?? [],
          finalReasons: result.finalResponse.reasons,
          plausibilityIssues: result.plausibilityIssues,
        })

        expect(
          unavailable,
          'AI availability fallback used; this case cannot measure model correctness',
        ).toBe(false)
        expect(result.aiResponse?.careLevel).toBe(expectedCareLevel)
      } catch (error) {
        if (!evaluationResults.some((result) => result.id === id)) {
          evaluationResults.push({
            id,
            name,
            category,
            expectedCareLevel,
            directAiPassed: false,
            systemPassed: false,
            fallbackType: 'none',
            unavailable: false,
            aiReasons: [],
            finalReasons: [],
            plausibilityIssues: [],
            error: error instanceof Error ? error.message : String(error),
          })
        }

        throw error
      }
    },
    120_000,
  )
})

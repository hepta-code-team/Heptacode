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
const selectedCaseId = process.env.TRIAGE_LIVE_CASE_ID?.trim()
const selectedLiveCases = selectedCaseId
  ? TRIAGE_PLAUSIBILITY_LIVE_CASES.filter((testCase) => testCase.id === selectedCaseId)
  : TRIAGE_PLAUSIBILITY_LIVE_CASES
const hasInvalidSelectedCaseId = selectedCaseId !== undefined && selectedLiveCases.length === 0
const liveCasesToEvaluate = hasInvalidSelectedCaseId
  ? TRIAGE_PLAUSIBILITY_LIVE_CASES.slice(0, 1)
  : selectedLiveCases

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
  reasoningPassed: boolean
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

/** Normalizes German and ASCII fallback spellings so keyword checks are stable. */
function normalizeReasoningText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

/** Checks whether the AI explanation contains wording that matches the expected care level. */
function hasCareLevelReasoning(result: TriageEvaluationDiagnostics, expectedCareLevel: CareLevel): boolean {
  const explanationText = normalizeReasoningText([
    ...(result.aiResponse?.reasons ?? []),
    result.aiResponse?.reviewSummary?.plainLanguage,
    result.aiResponse?.reviewSummary?.professionalSummary,
  ].filter((part): part is string => Boolean(part)).join(' '))

  const keywordsByCareLevel: Record<CareLevel, string[]> = {
    emergency: ['notfall', 'sofort', 'umgehend', 'akut', 'notaufnahme', '112'],
    specialist: ['fachaerzt', 'facharzt', 'fachrichtung', 'spezialist', 'spezialisierte', 'intern', 'pneumolog', 'urolog', 'diabetolog', 'gastroenterolog'],
    doctor: ['arzt', 'aerzt', 'hausarzt', 'allgemeinmedizin', 'abklaerung', 'einschaetzung', 'zeitnah'],
    selfcare: ['selbst', 'haeuslich', 'beobachten', 'schonung', 'keine warnzeichen', 'harmlos'],
  }

  return keywordsByCareLevel[expectedCareLevel].some((keyword) => explanationText.includes(keyword))
}

/** Prints total accuracy, category rates, and failed case details. */
function logEvaluationSummary(): void {
  const availableResults = evaluationResults.filter((result) => !result.unavailable)
  const directAiPassed = availableResults.filter((result) => result.directAiPassed).length
  const systemPassed = availableResults.filter((result) => result.systemPassed).length
  const reasoningPassed = availableResults.filter((result) => result.reasoningPassed).length

  const categories = TRIAGE_PLAUSIBILITY_CATEGORIES.map((category) => {
    const results = availableResults.filter((result) => result.category === category)
    const categoryDirectAiPassed = results.filter((result) => result.directAiPassed).length
    const categorySystemPassed = results.filter((result) => result.systemPassed).length
    const categoryReasoningPassed = results.filter((result) => result.reasoningPassed).length

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
      reasoning: {
        passed: categoryReasoningPassed,
        rate: formatRate(categoryReasoningPassed, results.length),
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
    reasoning: {
      passed: reasoningPassed,
      rate: formatRate(reasoningPassed, availableResults.length),
    },
    categories,
    failures: evaluationResults
      .filter((result) => !result.directAiPassed || !result.systemPassed || !result.reasoningPassed)
      .map(({
        id,
        expectedCareLevel,
        directAiCareLevel,
        finalCareLevel,
        reasoningPassed,
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
        reasoningPassed,
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

    if (hasInvalidSelectedCaseId) {
      throw new Error(`No live AI triage plausibility case found for TRIAGE_LIVE_CASE_ID=${selectedCaseId}`)
    }

    const firstCase = liveCasesToEvaluate[0]

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
  itLive.each(liveCasesToEvaluate)(
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
        const reasoningPassed = hasCareLevelReasoning(result, expectedCareLevel)

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
          reasoningPassed,
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
          reasoningPassed,
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
        expect(
          reasoningPassed,
          'AI reasoning should explain why the expected care level is appropriate',
        ).toBe(true)
      } catch (error) {
        if (!evaluationResults.some((result) => result.id === id)) {
          evaluationResults.push({
            id,
            name,
            category,
            expectedCareLevel,
            directAiPassed: false,
            systemPassed: false,
            reasoningPassed: false,
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

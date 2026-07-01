import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { CareLevel } from '../../src/modules/triage/triage.types.js'
import {
  TRIAGE_FREETEXT_LIVE_CASES,
} from '../fixtures/triageFreetextLiveCases.js'
import { hasCareLevelReasoning } from './triageLiveReasoning.js'

/** Live AI evaluations are opt-in because they call external models. */
const runLiveAiEval = process.env.RUN_AI_TRIAGE_EVAL === 'true' || process.env.RUN_AI_TRIAGE_EVAL === '1'
const itLive = runLiveAiEval ? it : it.skip
const selectedCaseId = process.env.TRIAGE_FREETEXT_LIVE_CASE_ID?.trim()
const selectedLiveCases = selectedCaseId
  ? TRIAGE_FREETEXT_LIVE_CASES.filter((testCase) => testCase.id === selectedCaseId)
  : TRIAGE_FREETEXT_LIVE_CASES
const hasInvalidSelectedCaseId = selectedCaseId !== undefined && selectedLiveCases.length === 0
const liveCasesToEvaluate = hasInvalidSelectedCaseId
  ? TRIAGE_FREETEXT_LIVE_CASES.slice(0, 1)
  : selectedLiveCases

/** Reuses the availability probe as the first evaluated case. */
const cachedResults = new Map<string, Awaited<ReturnType<typeof import('../../src/modules/triage/triage.service.js')['evaluateTriage']>>>()

type FreetextEvaluationResult = {
  id: string
  name: string
  expectedCareLevel: CareLevel
  finalCareLevel?: CareLevel
  passed: boolean
  reasoningPassed: boolean
  aiUnavailable: boolean
  reasons: string[]
  error?: string
}

const evaluationResults: FreetextEvaluationResult[] = []

function formatRate(passed: number, total: number): string {
  return total === 0 ? 'n/a' : `${((passed / total) * 100).toFixed(1)}%`
}

function logEvaluationSummary(): void {
  const availableResults = evaluationResults.filter((result) => !result.aiUnavailable)
  const passed = availableResults.filter((result) => result.passed).length
  const reasoningPassed = availableResults.filter((result) => result.reasoningPassed).length

  console.info('Live AI triage freetext emergency evaluation summary', {
    evaluated: availableResults.length,
    unavailable: evaluationResults.length - availableResults.length,
    total: evaluationResults.length,
    passed,
    rate: formatRate(passed, availableResults.length),
    reasoning: {
      passed: reasoningPassed,
      rate: formatRate(reasoningPassed, availableResults.length),
    },
    failures: evaluationResults
      .filter((result) => !result.passed || !result.reasoningPassed || result.aiUnavailable)
      .map(({
        id,
        expectedCareLevel,
        finalCareLevel,
        reasoningPassed,
        aiUnavailable,
        reasons,
        error,
      }) => ({
        id,
        expectedCareLevel,
        finalCareLevel,
        reasoningPassed,
        aiUnavailable,
        reasons,
        error,
      })),
  })
}

describe('live AI triage freetext emergency evaluation', () => {
  beforeAll(async () => {
    if (!runLiveAiEval) {
      return
    }

    if (hasInvalidSelectedCaseId) {
      throw new Error(`No live AI triage freetext case found for TRIAGE_FREETEXT_LIVE_CASE_ID=${selectedCaseId}`)
    }

    if (liveCasesToEvaluate.length === 0) {
      throw new Error('No live AI triage freetext cases configured')
    }

    const firstCase = liveCasesToEvaluate[0]

    if (!firstCase) {
      throw new Error('No live AI triage freetext cases configured')
    }

    const { evaluateTriage } = await import('../../src/modules/triage/triage.service.js')
    const result = await evaluateTriage(firstCase.patientData, undefined, false, firstCase.text, 'text')

    if (result.aiUnavailable === true) {
      throw new Error(
        'Live AI triage freetext evaluation aborted: AI was unavailable. No correctness rate was calculated.',
      )
    }

    cachedResults.set(firstCase.id, result)
  })

  afterAll(() => {
    if (runLiveAiEval && evaluationResults.length > 0) {
      logEvaluationSummary()
    }
  })

  /** Emergency symptoms entered as free text should remain emergency after extraction and triage. */
  itLive.each(liveCasesToEvaluate)(
    'ordnet Freitext-Notfall "$name" korrekt zu',
    async ({ id, name, expectedCareLevel, patientData, text }) => {
      try {
        const cachedResult = cachedResults.get(id)
        const result = cachedResult ?? await (async () => {
          const { evaluateTriage } = await import('../../src/modules/triage/triage.service.js')
          return evaluateTriage(patientData, undefined, false, text, 'text')
        })()
        const passed = result.careLevel === expectedCareLevel
        const reasoningPassed = hasCareLevelReasoning(result, expectedCareLevel)
        const aiUnavailable = result.aiUnavailable === true

        evaluationResults.push({
          id,
          name,
          expectedCareLevel,
          finalCareLevel: result.careLevel,
          passed,
          reasoningPassed,
          aiUnavailable,
          reasons: result.reasons,
        })

        console.info('Live AI freetext triage case result', {
          id,
          expectedCareLevel,
          finalCareLevel: result.careLevel,
          passed,
          reasoningPassed,
          aiUnavailable,
          reasons: result.reasons,
        })

        expect(
          aiUnavailable,
          'AI availability fallback used; this case cannot measure freetext model correctness',
        ).toBe(false)
        expect(result.careLevel).toBe(expectedCareLevel)
        expect(
          reasoningPassed,
          'AI reasoning should explain why the expected care level is appropriate',
        ).toBe(true)
      } catch (error) {
        if (!evaluationResults.some((result) => result.id === id)) {
          evaluationResults.push({
            id,
            name,
            expectedCareLevel,
            passed: false,
            reasoningPassed: false,
            aiUnavailable: false,
            reasons: [],
            error: error instanceof Error ? error.message : String(error),
          })
        }

        throw error
      }
    },
    180_000,
  )
})

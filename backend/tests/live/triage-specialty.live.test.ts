import { describe, expect, it } from 'vitest'

import { TRIAGE_SPECIALTY_CASES } from '../fixtures/triageSpecialtyCases.js'

const runLiveAiEval = process.env.RUN_AI_TRIAGE_EVAL === 'true' || process.env.RUN_AI_TRIAGE_EVAL === '1'
const itLive = runLiveAiEval ? it : it.skip

describe('live AI triage specialty mapping', () => {
  itLive.each(TRIAGE_SPECIALTY_CASES)(
    'ordnet $name korrekt zu',
    async ({ expectedSpecialty, patientData, symptoms }) => {
      const { evaluateTriage } = await import('../../src/modules/triage/triage.service.js')

      const result = await evaluateTriage(patientData, symptoms)
      const actual = {
        careLevel: result.careLevel,
        recommendedSpecialty: result.recommendedSpecialty,
      }

      console.info('Live AI triage result', {
        expectedSpecialty,
        ...actual,
      })

      expect(result.aiUnavailable).toBeUndefined()
      expect(actual).toEqual({
        careLevel: 'specialist',
        recommendedSpecialty: expectedSpecialty,
      })
    },
    120_000,
  )
})

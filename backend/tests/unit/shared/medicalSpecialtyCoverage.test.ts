import { describe, expect, it } from 'vitest'

import { MEDICAL_SPECIALTIES } from '../../../../shared/result.types.js'
import { SPECIALIST_MEDICAL_SPECIALTIES, TRIAGE_SPECIALTY_CASES } from '../../fixtures/triageSpecialtyCases.js'
import { triageAiResponseSchema } from '../../../src/shared/validation.js'

const NON_SPECIALIST_SPECIALTIES = [
  'home_care',
  'emergency_medicine',
  'general_practice',
] as const

describe('MedicalSpecialty coverage', () => {
  it('hat genau einen Triage-Testfall fuer jede fachaerztliche Disziplin', () => {
    const expectedSpecialties = MEDICAL_SPECIALTIES.filter(
      (specialty) => !NON_SPECIALIST_SPECIALTIES.includes(specialty as typeof NON_SPECIALIST_SPECIALTIES[number]),
    )
    const testCaseSpecialties = TRIAGE_SPECIALTY_CASES.map((testCase) => testCase.expectedSpecialty)

    expect([...testCaseSpecialties].sort()).toEqual([...expectedSpecialties].sort())
    expect(new Set(testCaseSpecialties).size).toBe(testCaseSpecialties.length)
    expect([...SPECIALIST_MEDICAL_SPECIALTIES].sort()).toEqual([...expectedSpecialties].sort())
  })

  it.each(TRIAGE_SPECIALTY_CASES)(
    'akzeptiert $name als Specialist-Antwort',
    ({ expectedSpecialty }) => {
      const result = triageAiResponseSchema.safeParse({
        careLevel: 'specialist',
        recommendedSpecialty: expectedSpecialty,
        reasons: [`Fachaerztliche Abklaerung durch ${expectedSpecialty} empfohlen.`],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden fachaerztlich abklaeren.',
          professionalSummary: `Care Level: specialist. Empfohlene Fachrichtung: ${expectedSpecialty}.`,
        },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.careLevel).toBe('specialist')
        expect(result.data.recommendedSpecialty).toBe(expectedSpecialty)
      }
    },
  )
})

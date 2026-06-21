import { describe, expect, it } from 'vitest'

import {
  TRIAGE_PLAUSIBILITY_CATEGORIES,
  TRIAGE_PLAUSIBILITY_LIVE_CASES,
} from '../../fixtures/triagePlausibilityLiveCases.js'

describe('Triage plausibility live-case coverage', () => {
  /** Every reporting category should contain at least one live evaluation case. */
  it('enthaelt mindestens einen Testfall fuer jede Auswertungskategorie', () => {
    const coveredCategories = new Set(
      TRIAGE_PLAUSIBILITY_LIVE_CASES.map((testCase) => testCase.category),
    )

    expect([...coveredCategories].sort()).toEqual(
      [...TRIAGE_PLAUSIBILITY_CATEGORIES].sort(),
    )
  })

  /** Stable unique IDs should make results comparable across prompt versions. */
  it('verwendet eindeutige IDs fuer alle Live-Testfaelle', () => {
    const ids = TRIAGE_PLAUSIBILITY_LIVE_CASES.map((testCase) => testCase.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.trim().length > 0)).toBe(true)
  })

  /** Category labels should remain consistent with the expected care level. */
  it('ordnet Kategorien und erwartete Versorgungsebenen konsistent zu', () => {
    for (const testCase of TRIAGE_PLAUSIBILITY_LIVE_CASES) {
      const expectedCareLevel =
        testCase.category === 'false_positive'
          ? 'selfcare'
          : testCase.category

      expect(testCase.expectedCareLevel).toBe(expectedCareLevel)
      expect(testCase.symptoms.length).toBeGreaterThan(0)
    }
  })
})

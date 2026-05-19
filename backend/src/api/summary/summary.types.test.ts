import { describe, expect, it } from 'vitest'

import { SummaryRequestSchema } from './summary.types.js'

const validSummaryRequest = {
  patient: {
    age: 34,
    sex: 'female',
  },
  symptoms: {
    freeText: 'Seit gestern Husten und Fieber.',
  },
  consent: {
    acceptedDataProcessing: true,
  },
}

describe('SummaryRequestSchema', () => {
  it('akzeptiert eine minimale gueltige Anfrage', () => {
    const result = SummaryRequestSchema.safeParse(validSummaryRequest)

    expect(result.success).toBe(true)
  })

  it('lehnt Alter ausserhalb des erlaubten Bereichs ab', () => {
    const result = SummaryRequestSchema.safeParse({
      ...validSummaryRequest,
      patient: {
        ...validSummaryRequest.patient,
        age: 130,
      },
    })

    expect(result.success).toBe(false)
  })

  it('lehnt Schweregrade ausserhalb der Skala ab', () => {
    const result = SummaryRequestSchema.safeParse({
      ...validSummaryRequest,
      symptoms: {
        ...validSummaryRequest.symptoms,
        severity: 11,
      },
    })

    expect(result.success).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import { triageRequestSchema } from '../../../../src/modules/triage/triage.types.js'

describe('triageRequestSchema', () => {
  /** Free-text triage requests should be valid without structured symptoms. */
  it('akzeptiert Freitext ohne ausgewaehlte Symptome', () => {
    const result = triageRequestSchema.safeParse({
      text: 'Ich habe seit gestern Kopfschmerzen.',
      inputType: 'text',
    })

    expect(result.success).toBe(true)
  })

  /** Structured triage requests should allow the frontend maximum of three symptoms. */
  it('akzeptiert bis zu drei strukturierte Symptome', () => {
    const result = triageRequestSchema.safeParse({
      symptoms: [
        { region: 'Kopf', details: 'Seit dem Aufwachen schlimmer', painLevel: 5, duration: 'days' },
        { region: 'Bauch', painLevel: 3, duration: 'today' },
        { region: 'Ruecken', painLevel: 4, duration: 'week' },
      ],
    })

    expect(result.success).toBe(true)
  })

  /** Triage requests need either text, symptoms, or the explicit emergency shortcut. */
  it('lehnt Anfragen ohne Text und ohne Symptome ab', () => {
    const result = triageRequestSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  /** More than three symptoms should fail the public request contract. */
  it('lehnt mehr als drei Symptome ab', () => {
    const result = triageRequestSchema.safeParse({
      symptoms: [
        { region: 'Kopf' },
        { region: 'Bauch' },
        { region: 'Ruecken' },
        { region: 'Brust' },
      ],
    })

    expect(result.success).toBe(false)
  })
})

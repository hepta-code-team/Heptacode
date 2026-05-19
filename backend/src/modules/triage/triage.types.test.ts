import { describe, expect, it } from 'vitest'

import { triageAiResultSchema, triageRequestSchema } from './triage.types.js'

describe('triageAiResultSchema', () => {
  it('akzeptiert gueltige Selfcare-Antworten ohne Fachrichtung', () => {
    const result = triageAiResultSchema.safeParse({
      careLevel: 'selfcare',
      medicalSpecialty: null,
      reasons: ['Die Beschwerden wirken aktuell mild.'],
    })

    expect(result.success).toBe(true)
  })

  it('akzeptiert gueltige Specialist-Antworten mit Fachrichtung', () => {
    const result = triageAiResultSchema.safeParse({
      careLevel: 'specialist',
      medicalSpecialty: 'cardiology',
      reasons: ['Die Beschwerden sollten kardiologisch abgeklaert werden.'],
    })

    expect(result.success).toBe(true)
  })

  it('lehnt Specialist-Antworten ohne Fachrichtung ab', () => {
    const result = triageAiResultSchema.safeParse({
      careLevel: 'specialist',
      medicalSpecialty: null,
      reasons: ['Eine fachliche Abklaerung ist sinnvoll.'],
    })

    expect(result.success).toBe(false)
  })

  it('lehnt Fachrichtungen ab, wenn careLevel nicht specialist ist', () => {
    const result = triageAiResultSchema.safeParse({
      careLevel: 'doctor',
      medicalSpecialty: 'neurology',
      reasons: ['Eine aerztliche Abklaerung ist sinnvoll.'],
    })

    expect(result.success).toBe(false)
  })

  it('lehnt leere reasons ab', () => {
    const result = triageAiResultSchema.safeParse({
      careLevel: 'doctor',
      medicalSpecialty: null,
      reasons: [],
    })

    expect(result.success).toBe(false)
  })
})

describe('triageRequestSchema', () => {
  it('akzeptiert Freitext ohne ausgewaehlte Symptome', () => {
    const result = triageRequestSchema.safeParse({
      text: 'Ich habe seit gestern Kopfschmerzen.',
      inputType: 'text',
    })

    expect(result.success).toBe(true)
  })

  it('akzeptiert bis zu drei strukturierte Symptome', () => {
    const result = triageRequestSchema.safeParse({
      symptoms: [
        { region: 'Kopf', painLevel: 5, duration: 'days' },
        { region: 'Bauch', painLevel: 3, duration: 'today' },
        { region: 'Ruecken', painLevel: 4, duration: 'week' },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('lehnt Anfragen ohne Text und ohne Symptome ab', () => {
    const result = triageRequestSchema.safeParse({})

    expect(result.success).toBe(false)
  })

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

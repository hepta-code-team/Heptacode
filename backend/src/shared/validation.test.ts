import { describe, expect, it } from 'vitest'

import { triageAiResponseSchema } from './validation.js'

describe('triageAiResponseSchema', () => {
  it('akzeptiert gueltige Selfcare-Antworten ohne Fachrichtung', () => {
    const result = triageAiResponseSchema.safeParse({
      careLevel: 'selfcare',
      reasons: ['Die Beschwerden wirken aktuell mild.'],
      reviewSummary: {
        plainLanguage: 'Die Beschwerden wirken aktuell mild.',
        professionalSummary: 'Care Level: selfcare.',
      },
    })

    expect(result.success).toBe(true)
  })

  it('akzeptiert gueltige Specialist-Antworten mit Fachrichtung', () => {
    const result = triageAiResponseSchema.safeParse({
      careLevel: 'specialist',
      recommendedSpecialty: 'cardiology',
      reasons: ['Die Beschwerden sollten kardiologisch abgeklaert werden.'],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden kardiologisch abklaeren.',
        professionalSummary: 'Care Level: specialist. Empfohlene Fachrichtung: cardiology.',
      },
    })

    expect(result.success).toBe(true)
  })

  it('akzeptiert Review-Summaries in KI-Antworten', () => {
    const result = triageAiResponseSchema.safeParse({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich einordnen.',
        professionalSummary: 'Care Level: doctor.',
      },
    })

    expect(result.success).toBe(true)
  })

  it('lehnt KI-Antworten ohne Review-Summary ab', () => {
    const result = triageAiResponseSchema.safeParse({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
    })

    expect(result.success).toBe(false)
  })

  it('lehnt Specialist-Antworten ohne fachmedizinische Richtung ab', () => {
    const result = triageAiResponseSchema.safeParse({
      careLevel: 'specialist',
      recommendedSpecialty: undefined,
      reasons: ['Eine fachliche Abklaerung ist sinnvoll.'],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden fachlich abklaeren.',
        professionalSummary: 'Widerspruechliche Fachrichtung fuer specialist.',
      },
    })

    expect(result.success).toBe(false)
  })

  it('lehnt Fachrichtungen fuer Doctor-Antworten ab', () => {
    const result = triageAiResponseSchema.safeParse({
      careLevel: 'doctor',
      recommendedSpecialty: 'neurology',
      reasons: ['Eine aerztliche Abklaerung ist sinnvoll.'],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich abklaeren.',
        professionalSummary: 'Widerspruechliche Fachrichtung fuer doctor.',
      },
    })

    expect(result.success).toBe(false)
  })

  it('lehnt leere reasons ab', () => {
    const result = triageAiResponseSchema.safeParse({
      careLevel: 'doctor',
      reasons: [],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich abklaeren.',
        professionalSummary: 'Care Level: doctor.',
      },
    })

    expect(result.success).toBe(false)
  })
})

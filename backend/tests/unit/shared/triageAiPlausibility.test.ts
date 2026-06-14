import { describe, expect, it } from 'vitest'

import { getTriageAiPlausibilityIssues } from '../../../src/shared/triageAiPlausibility.js'

/** Baseline doctor response used for symptoms without emergency contradictions. */
const plausibleDoctorResponse = {
  careLevel: 'doctor' as const,
  reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
  reviewSummary: {
    plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich einordnen.',
    professionalSummary: 'Care Level: doctor.',
  },
}

/** Baseline emergency response used for explicit warning-pattern scenarios. */
const plausibleEmergencyResponse = {
  careLevel: 'emergency' as const,
  reasons: ['Die Beschwerden enthalten Warnzeichen und sollten sofort abgeklärt werden.'],
  reviewSummary: {
    plainLanguage: 'Bitte suchen Sie sofort medizinische Hilfe.',
    professionalSummary: 'Care Level: emergency.',
  },
}

describe('getTriageAiPlausibilityIssues', () => {
  /** Chest pain with breathing-related context should not be accepted as self-care. */
  it('markiert Selfcare bei Brustschmerz mit Atembezug als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden wirken aktuell mild.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden wirken aktuell mild.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Brust',
          side: 'atemabhaengig',
          measurementType: 'pain',
          measurementValue: 6,
          duration: 'today',
        },
      ],
    )

    expect(issues).toContain('Warnsymptome duerfen nicht als selfcare eingestuft werden.')
  })

  /** Chest pain with dyspnea should be caught as unsafe under-triage. */
  it('markiert Selfcare bei Brustschmerz mit Atemnot als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden koennen beobachtet werden.'],
        reviewSummary: {
          plainLanguage: 'Sie koennen die Beschwerden zunaechst beobachten.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Brust',
          details: 'Druckgefuehl und Atemnot',
          measurementType: 'pain',
          measurementValue: 4,
          duration: 'today',
        },
      ],
    )

    expect(issues).toContain('Warnsymptome duerfen nicht als selfcare eingestuft werden.')
  })

  /** Possible stroke indicators should be caught as unsafe under-triage. */
  it('markiert Selfcare bei moeglichen Schlaganfallzeichen als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden wirken aktuell mild.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden wirken aktuell mild.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Gesicht',
          side: 'halbseitige Laehmung',
          details: 'Sprachprobleme und Verwirrtheit seit heute',
          measurementType: 'severity',
          measurementValue: 5,
          duration: 'today',
        },
      ],
    )

    expect(issues).toContain('Warnsymptome duerfen nicht als selfcare eingestuft werden.')
  })

  /** Suicidal ideation should not be accepted as self-care. */
  it('markiert Selfcare bei Suizidgedanken als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Selbsthilfe und Ruhe erscheinen ausreichend.'],
        reviewSummary: {
          plainLanguage: 'Versuchen Sie sich auszuruhen und Unterstuetzung zu suchen.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Psychische Probleme',
          side: 'Suizidgedanken',
          details: 'Gedanken an Selbstverletzung',
          measurementType: 'severity',
          measurementValue: 6,
        },
      ],
    )

    expect(issues).toContain('Warnsymptome duerfen nicht als selfcare eingestuft werden.')
  })

  /** High fever with confusion should be treated as a warning-pattern contradiction. */
  it('markiert Selfcare bei hohem Fieber mit Verwirrtheit als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden wirken aktuell mild.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden koennen zunaechst selbst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Allgemein',
          side: 'Fieber',
          details: 'Verwirrtheit und starkes Krankheitsgefuehl',
          measurementType: 'temperature',
          measurementValue: 40.2,
          duration: 'today',
        },
      ],
    )

    expect(issues).toContain('Warnsymptome duerfen nicht als selfcare eingestuft werden.')
  })

  /** High fever alone should remain compatible with doctor-level escalation. */
  it('akzeptiert hohes Fieber ohne weitere Warnzeichen als Doctor-Fall', () => {
    const issues = getTriageAiPlausibilityIssues(
      plausibleDoctorResponse,
      [
        {
          region: 'Allgemein',
          side: 'Fieber',
          measurementType: 'temperature',
          measurementValue: 40.1,
          duration: 'today',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Moderate fever without warning signs should not be forced into emergency care. */
  it('akzeptiert moderates Fieber ohne weitere Warnzeichen als Doctor-Fall', () => {
    const issues = getTriageAiPlausibilityIssues(
      plausibleDoctorResponse,
      [
        {
          region: 'Allgemein',
          side: 'Fieber',
          measurementType: 'temperature',
          measurementValue: 38.4,
          duration: 'days',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Elevated fever below the emergency threshold should stay plausible as doctor care. */
  it('akzeptiert erhoehtes Fieber unterhalb der Notfallgrenze als Doctor-Fall', () => {
    const issues = getTriageAiPlausibilityIssues(
      plausibleDoctorResponse,
      [
        {
          region: 'Allgemein',
          side: 'Fieber',
          measurementType: 'temperature',
          measurementValue: 39.4,
          duration: 'today',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Missing measurements should not create emergency risk without warning text. */
  it('bewertet fehlende Messwerte ohne Warntext nicht automatisch als Notfall', () => {
    const issues = getTriageAiPlausibilityIssues(
      plausibleDoctorResponse,
      [
        {
          region: 'Bauch',
          duration: 'days',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Dyspnea should remain a warning sign even outside chest-pain cases. */
  it('markiert Selfcare bei Atemnot ausserhalb von Brustschmerz als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden koennen zunaechst beobachtet werden.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden koennen zunaechst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Allgemein',
          details: 'Atemnot beim Sitzen',
          measurementType: 'severity',
          measurementValue: 5,
        },
      ],
    )

    expect(issues).toContain('Warnsymptome duerfen nicht als selfcare eingestuft werden.')
  })

  /** Strong bleeding descriptions should not be accepted as self-care. */
  it('markiert Selfcare bei starker Blutung als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Ein Verband und Beobachtung reichen aus.'],
        reviewSummary: {
          plainLanguage: 'Ein Verband und Beobachtung reichen aus.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Arm',
          details: 'Schnittwunde blutet stark',
          measurementType: 'severity',
          measurementValue: 6,
        },
      ],
    )

    expect(issues).toContain('Warnsymptome duerfen nicht als selfcare eingestuft werden.')
  })

  /** Mild symptoms without warning signs should not be escalated to emergency care. */
  it('markiert Emergency bei milden Beschwerden ohne Warnzeichen als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'emergency',
        reasons: ['Die Beschwerden werden als Notfall eingestuft.'],
        reviewSummary: {
          plainLanguage: 'Bitte suchen Sie sofort medizinische Hilfe.',
          professionalSummary: 'Care Level: emergency.',
        },
      },
      [
        {
          region: 'Kopf',
          measurementType: 'pain',
          measurementValue: 2,
          duration: 'today',
        },
      ],
    )

    expect(issues).toContain(
      'Milde Beschwerden ohne Warnzeichen duerfen nicht als emergency eingestuft werden.',
    )
  })

  /** Emergency classification should be plausible for chest pain with dyspnea. */
  it('akzeptiert Emergency bei Brustschmerz mit Atemnot als plausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      plausibleEmergencyResponse,
      [
        {
          region: 'Brust',
          details: 'Engegefuehl mit Atemnot',
          measurementType: 'pain',
          measurementValue: 7,
          duration: 'today',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Emergency classification should be plausible for suicidal ideation. */
  it('akzeptiert Emergency bei Suizidgedanken als plausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      plausibleEmergencyResponse,
      [
        {
          region: 'Psychische Probleme',
          side: 'Suizidgedanken',
          measurementType: 'severity',
          measurementValue: 7,
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Medium-intensity symptoms should remain compatible with doctor-level care. */
  it('akzeptiert plausible Doctor-Antworten bei mittleren Beschwerden', () => {
    const issues = getTriageAiPlausibilityIssues(
      plausibleDoctorResponse,
      [
        {
          region: 'Bauch',
          measurementType: 'pain',
          measurementValue: 5,
          duration: 'days',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Specialist responses should be plausible when the specialty is present and coherent. */
  it('akzeptiert Specialist-Antworten mit passender Fachrichtung', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'specialist',
        recommendedSpecialty: 'cardiology',
        reasons: ['Die Beschwerden sollten kardiologisch abgeklärt werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden kardiologisch abklaeren.',
          professionalSummary: 'Care Level: specialist. Empfohlene Fachrichtung: cardiology.',
        },
      },
      [
        {
          region: 'Brust',
          measurementType: 'pain',
          measurementValue: 4,
          duration: 'days',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Doctor responses should not contain specialist recommendations in their explanation text. */
  it('markiert Doctor-Antworten mit fachaerztlicher Empfehlung im Text als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'doctor',
        reasons: ['Die Beschwerden sollten kardiologisch abgeklart werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden kardiologisch abklaeren.',
          professionalSummary: 'Care Level: doctor. Empfehlung zur Kardiologie.',
        },
      },
      [
        {
          region: 'Brust',
          measurementType: 'pain',
          measurementValue: 4,
          duration: 'days',
        },
      ],
    )

    expect(issues).toContain(
      'Fachaerztliche Empfehlungen muessen als specialist mit Fachrichtung modelliert werden.',
    )
  })

  /** Specialist responses should not name a different specialty than recommendedSpecialty. */
  it('markiert Specialist-Antworten mit widerspruechlicher Fachrichtung als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'specialist',
        recommendedSpecialty: 'cardiology',
        reasons: ['Die Beschwerden sollten neurologisch abgeklart werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden neurologisch abklaeren.',
          professionalSummary: 'Care Level: specialist. Empfohlene Fachrichtung: cardiology.',
        },
      },
      [
        {
          region: 'Kopf',
          measurementType: 'pain',
          measurementValue: 5,
        },
      ],
    )

    expect(issues).toContain('Genannte Fachrichtung muss zur empfohlenen Fachrichtung passen.')
  })

  /** Specialist responses without a specialty should fail plausibility even after schema-like shaping. */
  it('markiert Specialist-Antworten ohne Fachrichtung als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'specialist',
        reasons: ['Eine fachärztliche Abklaerung ist sinnvoll.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden fachärztlich abklaeren.',
          professionalSummary: 'Care Level: specialist.',
        },
      },
      [
        {
          region: 'Kopf',
          measurementType: 'pain',
          measurementValue: 5,
        },
      ],
    )

    expect(issues).toContain('Specialist-Antworten benoetigen eine passende Fachrichtung.')
  })

  /** Mild headache without warning signs should remain compatible with self-care. */
  it('akzeptiert Selfcare bei sehr milden Kopfschmerzen ohne Warnzeichen', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden sind mild und ohne erkennbare Warnzeichen.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden koennen zunaechst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Kopf',
          measurementType: 'pain',
          measurementValue: 2,
          duration: 'today',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Placeholder-style reasons and summaries should be rejected as insufficient content. */
  it('markiert sehr kurze Begruendungen und Summaries als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'doctor',
        reasons: ['ok'],
        reviewSummary: {
          plainLanguage: 'Kurz',
          professionalSummary: 'Kurz',
        },
      },
      [
        {
          region: 'Bauch',
          measurementType: 'pain',
          measurementValue: 5,
        },
      ],
    )

    expect(issues).toEqual(
      expect.arrayContaining([
        'Begruendungen muessen nachvollziehbar und nicht nur Platzhalter sein.',
        'Review-Summary muss in beiden Feldern ausreichend aussagekraeftig sein.',
      ]),
    )
  })
})

import { describe, expect, it } from 'vitest'

import { getTriageAiPlausibilityIssues } from '../../../src/shared/triageAiPlausibility.js'

/** Baseline doctor response used for symptoms without emergency contradictions. */
const plausibleDoctorResponse = {
  careLevel: 'doctor' as const,
  reasons: ['Die Beschwerden sollten ärztlich eingeordnet werden.'],
  reviewSummary: {
    plainLanguage: 'Bitte lassen Sie die Beschwerden ärztlich einordnen.',
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
          side: 'atemabhängig',
          measurementType: 'pain',
          measurementValue: 6,
          duration: 'today',
        },
      ],
    )

    expect(issues).toContain('Warnsymptome dürfen nicht als selfcare eingestuft werden.')
  })

  /** Chest pain with dyspnea should be caught as unsafe under-triage. */
  it('markiert Selfcare bei Brustschmerz mit Atemnot als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden können beobachtet werden.'],
        reviewSummary: {
          plainLanguage: 'Sie können die Beschwerden zunächst beobachten.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Brust',
          details: 'Druckgefühl und Atemnot',
          measurementType: 'pain',
          measurementValue: 4,
          duration: 'today',
        },
      ],
    )

    expect(issues).toContain('Warnsymptome dürfen nicht als selfcare eingestuft werden.')
  })

  /** Possible stroke indicators should be caught as unsafe under-triage. */
  it('markiert Selfcare bei möglichen Schlaganfallzeichen als unplausibel', () => {
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
          side: 'halbseitige Lähmung',
          details: 'Sprachprobleme und Verwirrtheit seit heute',
          measurementType: 'severity',
          measurementValue: 5,
          duration: 'today',
        },
      ],
    )

    expect(issues).toContain('Warnsymptome dürfen nicht als selfcare eingestuft werden.')
  })

  /** Time-critical warning scenarios should remain incompatible with self-care. */
  it.each([
    {
      name: 'vorübergehenden Schlaganfallzeichen',
      symptom: {
        region: 'Gesicht',
        side: 'halbseitig',
        details: 'Vor 20 Minuten hing ein Mundwinkel herab, der Arm war schwach und die Sprache undeutlich; inzwischen sind die Beschwerden wieder verschwunden',
        measurementType: 'severity' as const,
        measurementValue: 5,
        duration: 'today' as const,
      },
    },
    {
      name: 'einem mehr als fünf Minuten anhaltenden Krampfanfall',
      symptom: {
        region: 'Allgemein',
        details: 'Generalisierter Krampfanfall, der seit sieben Minuten ununterbrochen anhält',
        measurementType: 'severity' as const,
        measurementValue: 7,
        duration: 'today' as const,
      },
    },
    {
      name: 'Sepsiszeichen',
      symptom: {
        region: 'Allgemein',
        side: 'Fieber',
        details: 'Hohes Fieber mit Schüttelfrost, plötzlicher Verwirrtheit und schneller Atmung',
        measurementType: 'temperature' as const,
        measurementValue: 40.1,
        duration: 'today' as const,
      },
    },
    {
      name: 'Hinweisen auf eine Lungenembolie',
      symptom: {
        region: 'Brust',
        side: 'atemabhängig',
        details: 'Plötzliche Atemnot mit stechendem Brustschmerz und einseitig geschwollener Wade',
        measurementType: 'pain' as const,
        measurementValue: 7,
        duration: 'today' as const,
      },
    },
    {
      name: 'Meningitis-Warnzeichen',
      symptom: {
        region: 'Kopf',
        details: 'Fieber mit starken Kopfschmerzen, Nackensteifigkeit, Lichtempfindlichkeit und Erbrechen',
        measurementType: 'pain' as const,
        measurementValue: 7,
        duration: 'today' as const,
      },
    },
    {
      name: 'Kopfverletzung mit Bewusstlosigkeit',
      symptom: {
        region: 'Kopf',
        details: 'Sturz auf den Kopf mit kurzer Bewusstlosigkeit, danach Erbrechen und Verwirrtheit',
        measurementType: 'pain' as const,
        measurementValue: 5,
        duration: 'today' as const,
      },
    },
    {
      name: 'Eileiterschwangerschaft-Warnzeichen',
      symptom: {
        region: 'Unterbauch',
        side: 'einseitig',
        details: 'Schwanger mit einseitigem Unterbauchschmerz, vaginaler Blutung, Schulterschmerz und Schwindel',
        measurementType: 'pain' as const,
        measurementValue: 7,
        duration: 'today' as const,
      },
    },
    {
      name: 'diabetischer Ketoazidose',
      symptom: {
        region: 'Allgemein',
        details: 'Diabetes mit starkem Durst, häufigem Wasserlassen, Bauchschmerz, Erbrechen, tiefer Atmung und fruchtigem Atem',
        measurementType: 'severity' as const,
        measurementValue: 8,
        duration: 'today' as const,
      },
    },
  ])('markiert Selfcare bei $name als unplausibel', ({ symptom }) => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden können zunächst beobachtet werden.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden können zunächst selbst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [symptom],
    )

    expect(issues).toContainEqual(expect.stringContaining('selfcare'))
  })

  /** Common anticoagulants and antiplatelet drugs should count as head-injury risk factors. */
  it.each([
    'Apixaban',
    'Eliquis',
    'Rivaroxaban',
    'Xarelto',
    'Edoxaban',
    'Lixiana',
    'Savaysa',
    'Dabigatran',
    'Pradaxa',
    'Acetylsalicylsäure',
    'ASS',
    'Aspirin',
  ])('markiert Selfcare bei Kopfverletzung unter %s als unplausibel', (medication) => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden können zunächst beobachtet werden.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden können zunächst selbst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Kopf',
          details: `Sturz auf den Kopf unter ${medication}`,
          measurementType: 'pain',
          measurementValue: 3,
          duration: 'today',
        },
      ],
    )

    expect(issues).toContainEqual(expect.stringContaining('selfcare'))
  })

  /** Suicidal ideation should not be accepted as self-care. */
  it('markiert Selfcare bei Suizidgedanken als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Selbsthilfe und Ruhe erscheinen ausreichend.'],
        reviewSummary: {
          plainLanguage: 'Versuchen Sie sich auszuruhen und Unterstützung zu suchen.',
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

    expect(issues).toContain('Warnsymptome dürfen nicht als selfcare eingestuft werden.')
  })

  /** High fever with confusion should be treated as a warning-pattern contradiction. */
  it('markiert Selfcare bei hohem Fieber mit Verwirrtheit als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden wirken aktuell mild.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden können zunächst selbst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Allgemein',
          side: 'Fieber',
          details: 'Verwirrtheit und starkes Krankheitsgefühl',
          measurementType: 'temperature',
          measurementValue: 40.2,
          duration: 'today',
        },
      ],
    )

    expect(issues).toContain('Warnsymptome dürfen nicht als selfcare eingestuft werden.')
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
  it('akzeptiert erhöhtes Fieber unterhalb der Notfallgrenze als Doctor-Fall', () => {
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
  it('markiert Selfcare bei Atemnot außerhalb von Brustschmerz als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden können zunächst beobachtet werden.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden können zunächst beobachtet werden.',
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

    expect(issues).toContain('Warnsymptome dürfen nicht als selfcare eingestuft werden.')
  })

  /** Warning text should be enough to reject self-care even without a measurement value. */
  it('markiert Selfcare bei Atemnot ohne Messwert als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden können zunächst beobachtet werden.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden können zunächst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Allgemein',
          details: 'Atemnot in Ruhe',
        },
      ],
    )

    expect(issues).toContain('Warnsymptome dürfen nicht als selfcare eingestuft werden.')
  })

  /** Explicitly negated warning terms should not trigger emergency plausibility rules. */
  it.each([
    {
      name: 'Atemnot',
      symptom: {
        region: 'Brust',
        details: 'Leichter Muskelkater nach Sport, keine Atemnot und keine Luftnot',
        measurementType: 'pain' as const,
        measurementValue: 2,
      },
    },
    {
      name: 'neurologische Ausfälle',
      symptom: {
        region: 'Kopf',
        details: 'Leichte Kopfschmerzen, keine Lähmung und keine Sprachstörung',
        measurementType: 'pain' as const,
        measurementValue: 2,
      },
    },
    {
      name: 'Suizidgedanken',
      symptom: {
        region: 'Psychische Probleme',
        details: 'Leichte innere Unruhe, keine Suizidgedanken und keine Selbstverletzung',
        measurementType: 'severity' as const,
        measurementValue: 2,
      },
    },
    {
      name: 'allergische Reaktion',
      symptom: {
        region: 'Haut',
        details: 'Lokale Rötung, keine allergische Reaktion und keine Schwellung im Gesicht',
        measurementType: 'severity' as const,
        measurementValue: 2,
      },
    },
    {
      name: 'starke Blutung',
      symptom: {
        region: 'Finger',
        details: 'Kleiner Schnitt; eine zuvor starke Blutung besteht nicht mehr',
        measurementType: 'pain' as const,
        measurementValue: 2,
      },
    },
  ])('akzeptiert Selfcare bei ausdrücklich verneintem Warnzeichen: $name', ({ symptom }) => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden sind mild und können zunächst beobachtet werden.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden können zunächst selbst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare without warning signs.',
        },
      },
      [symptom],
    )

    expect(issues).toEqual([])
  })

  /** Airway-related allergic swelling should not be accepted as self-care. */
  it('markiert Selfcare bei allergischer Atemwegs-Schwellung als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden können zunächst beobachtet werden.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden können zunächst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Allgemein',
          details: 'Allergische Reaktion, Zunge schwillt an und Hals zugeschwollen',
          measurementType: 'severity',
          measurementValue: 4,
        },
      ],
    )

    expect(issues).toContainEqual(expect.stringContaining('selfcare'))
  })

  /** Local swelling without airway context should not become a warning pattern by itself. */
  it('akzeptiert Selfcare bei lokaler Schwellung ohne Atemwegsbezug als plausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden sind mild und ohne erkennbare Warnzeichen.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden können zunächst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Knie',
          details: 'Leicht geschwollen nach Belastung',
          measurementType: 'pain',
          measurementValue: 2,
        },
      ],
    )

    expect(issues).toEqual([])
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

    expect(issues).toContain('Warnsymptome dürfen nicht als selfcare eingestuft werden.')
  })

  /** Critical blood-related descriptions should not be accepted as self-care. */
  it.each([
    'Blutiges Erbrechen seit heute',
    'Bluthusten mit blutigem Auswurf',
    'Schwarzer Stuhl wie Teerstuhl',
  ])('markiert Selfcare bei "%s" als unplausibel', (details) => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden können zunächst beobachtet werden.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden können zunächst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      [
        {
          region: 'Allgemein',
          details,
          measurementType: 'severity',
          measurementValue: 4,
        },
      ],
    )

    expect(issues).toContainEqual(expect.stringContaining('selfcare'))
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
      'Milde Beschwerden ohne Warnzeichen dürfen nicht als emergency eingestuft werden.',
    )
  })

  /** Emergency classification should be plausible for chest pain with dyspnea. */
  it('akzeptiert Emergency bei Brustschmerz mit Atemnot als plausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      plausibleEmergencyResponse,
      [
        {
          region: 'Brust',
          details: 'Engegefühl mit Atemnot',
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

  /** Emergency responses may name the required specialty context without becoming specialist. */
  it('akzeptiert Emergency bei Suizidgedanken mit psychiatrischer Notfallversorgung im Text', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'emergency',
        reasons: ['Akute Suizidgefahr erfordert sofortige psychiatrische Notfallversorgung.'],
        reviewSummary: {
          plainLanguage: 'Bitte suchen Sie sofort psychiatrische Notfallhilfe.',
          professionalSummary: 'Care Level: emergency wegen akuter Eigengefährdung.',
        },
      },
      [
        {
          region: 'Psychische Probleme',
          side: 'Suizidgedanken',
          details: 'Konkrete Suizidabsicht mit Plan',
          measurementType: 'severity',
          measurementValue: 9,
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Pain below the emergency threshold should remain compatible with doctor-level care. */
  it('akzeptiert Doctor bei Schmerzstärke 7 ohne Warnzeichen als plausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      plausibleDoctorResponse,
      [
        {
          region: 'Rücken',
          measurementType: 'pain',
          measurementValue: 7,
          duration: 'today',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Severe pain without additional warning text should remain compatible with emergency care. */
  it('akzeptiert Emergency bei sehr starken Schmerzen als plausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      plausibleEmergencyResponse,
      [
        {
          region: 'Rücken',
          measurementType: 'pain',
          measurementValue: 8,
          duration: 'today',
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
          plainLanguage: 'Bitte lassen Sie die Beschwerden kardiologisch abklären.',
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

  /** Specialist responses may use specialist wording when the specialty is modeled correctly. */
  it('akzeptiert Specialist-Antworten mit passender Fachrichtung und Facharzt-Text', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'specialist',
        recommendedSpecialty: 'cardiology',
        reasons: ['Die Beschwerden sollten fachärztlich kardiologisch abgeklärt werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte vereinbaren Sie eine kardiologische Facharztabklärung.',
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

  /** Specialist responses do not have to repeat the specialty in every explanation text. */
  it('akzeptiert Specialist-Antworten mit Fachrichtung ohne Fachrichtungs-Text', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'specialist',
        recommendedSpecialty: 'cardiology',
        reasons: ['Eine fachärztliche Abklärung ist sinnvoll.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden fachärztlich abklären.',
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
  it('markiert Doctor-Antworten mit fachärztlicher Empfehlung im Text als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'doctor',
        reasons: ['Die Beschwerden sollten kardiologisch abgeklärt werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden kardiologisch abklären.',
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
      'Wenn eine Fachrichtung genannt wird, muss diese auch als Empfehlung eingestuft werden.',
    )
  })

  /** Explicitly excluded specialties should not be interpreted as recommendations. */
  it('akzeptiert Doctor-Antworten mit ausdruecklich nicht indizierten Fachrichtungen', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'doctor',
        reasons: [
          'Die Symptome deuten auf eine akute Infektion hin, die in der Regel ambulant behandelt werden kann. Da keine spezifischen Fachrichtungen wie Kardiologie, Neurologie etc. indiziert sind und es sich um allgemeine Symptome handelt, ist eine Vorstellung beim Hausarzt angemessen.',
        ],
        reviewSummary: {
          plainLanguage: 'Bitte stellen Sie sich zur Abklaerung bei Ihrem Hausarzt vor.',
          professionalSummary: 'Care Level: doctor. General practice is appropriate.',
        },
      },
      [
        {
          region: 'Allgemein',
          side: 'Fieber',
          details: 'Fieber und Gliederschmerzen ohne Atemnot',
          measurementType: 'temperature',
          measurementValue: 39.2,
          duration: 'days',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Descriptive specialty wording should not be mistaken for a specialist recommendation. */
  it('akzeptiert psychiatrischen Notfalltext ohne Facharztempfehlung', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'emergency',
        reasons: ['Es handelt sich um einen psychiatrischen Notfall mit akuter Eigengefaehrdung.'],
        reviewSummary: {
          plainLanguage: 'Bitte nehmen Sie sofort medizinische Hilfe in Anspruch.',
          professionalSummary: 'Psychiatrischer Notfall. Care Level: emergency.',
        },
      },
      [
        {
          region: 'Psychische Probleme',
          side: 'Suizidgedanken',
          details: 'Konkrete Suizidabsicht mit Plan',
          measurementType: 'severity',
          measurementValue: 9,
          duration: 'today',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Specialty wording with German umlauts should be normalized before matching. */
  it.each([
    ['orthopädische', 'orthopädisch'],
    ['gynäkologische', 'gynäkologisch'],
    ['pädiatrische', 'pädiatrisch'],
    ['zahnärztliche', 'zahnärztlich'],
  ])('markiert Doctor-Antworten mit %s Umlaut-Schreibweise als unplausibel', (_label, wording) => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'doctor',
        reasons: [`Die Beschwerden sollten ${wording} abgeklärt werden.`],
        reviewSummary: {
          plainLanguage: `Bitte lassen Sie die Beschwerden ${wording} abklären.`,
          professionalSummary: 'Care Level: doctor.',
        },
      },
      [
        {
          region: 'Beschwerden',
          measurementType: 'pain',
          measurementValue: 4,
          duration: 'days',
        },
      ],
    )

    expect(issues).toContain(
      'Wenn eine Fachrichtung genannt wird, muss diese auch als Empfehlung eingestuft werden.',
    )
  })

  /** General-practice wording should not be treated like specialist escalation. */
  it('akzeptiert Doctor-Antworten mit Hausarzt-Empfehlung als plausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'doctor',
        reasons: ['Bitte stellen Sie sich bei Ihrem Hausarzt vor.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden hausärztlich einordnen.',
          professionalSummary: 'Care Level: doctor. Empfehlung zur hausärztlichen Abklärung.',
        },
      },
      [
        {
          region: 'Bauch',
          measurementType: 'pain',
          measurementValue: 4,
          duration: 'days',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Generic specialist wording should not be treated like a concrete specialty recommendation. */
  it('akzeptiert Doctor-Antworten mit allgemeiner Facharzt-Empfehlung als plausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'doctor',
        reasons: ['Bitte stellen Sie sich bei einem Facharzt vor.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden durch einen Facharzt abklären.',
          professionalSummary: 'Care Level: doctor. Facharzt-Empfehlung.',
        },
      },
      [
        {
          region: 'Knie',
          measurementType: 'pain',
          measurementValue: 4,
          duration: 'weeks',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** General medical-help wording should not be mistaken for a specialty recommendation. */
  it('akzeptiert Doctor-Antworten mit allgemeinem medizinische-Hilfe-Text als plausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'doctor',
        reasons: ['Bitte suchen Sie bei Verschlechterung medizinische Hilfe.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden bei Bedarf medizinisch einschätzen.',
          professionalSummary: 'Care Level: doctor. Medizinische Hilfe bei Verschlechterung.',
        },
      },
      [
        {
          region: 'Bauch',
          measurementType: 'pain',
          measurementValue: 4,
          duration: 'days',
        },
      ],
    )

    expect(issues).toEqual([])
  })

  /** Specialist responses should not name a different specialty than recommendedSpecialty. */
  it('markiert Specialist-Antworten mit widersprüchlicher Fachrichtung als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'specialist',
        recommendedSpecialty: 'cardiology',
        reasons: ['Die Beschwerden sollten neurologisch abgeklärt werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden neurologisch abklären.',
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

  /** Neurology wording should not be misread as urology because of substring overlap. */
  it('verwechselt neurologische Empfehlungen nicht mit Urologie', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'specialist',
        recommendedSpecialty: 'neurology',
        reasons: ['Die Beschwerden sollten neurologisch abgeklärt werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden neurologisch abklären.',
          professionalSummary: 'Care Level: specialist. Empfohlene Fachrichtung: neurology.',
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

    expect(issues).toEqual([])
  })

  /** Specialist responses without a specialty should fail plausibility even after schema-like shaping. */
  it('markiert Specialist-Antworten ohne Fachrichtung als unplausibel', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'specialist',
        reasons: ['Eine fachärztliche Abklärung ist sinnvoll.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden fachärztlich abklären.',
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

    expect(issues).toContain(
      'Empfehlungen zu Fachrichtungen benötigen eine genaue Angabe der Fachrichtung.',
    )
  })

  /** Mild headache without warning signs should remain compatible with self-care. */
  it('akzeptiert Selfcare bei sehr milden Kopfschmerzen ohne Warnzeichen', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden sind mild und ohne erkennbare Warnzeichen.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden können zunächst beobachtet werden.',
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

  /** Independent contradictions should be reported together instead of stopping at the first issue. */
  it('meldet mehrere Plausibilitätsprobleme gemeinsam', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'selfcare',
        reasons: ['ok'],
        reviewSummary: {
          plainLanguage: 'Kurz',
          professionalSummary: 'Kurz',
        },
      },
      [
        {
          region: 'Brust',
          details: 'Druckgefühl und Atemnot',
          measurementType: 'pain',
          measurementValue: 6,
          duration: 'today',
        },
      ],
    )

    expect(issues).toEqual(
      expect.arrayContaining([
        'Warnsymptome dürfen nicht als selfcare eingestuft werden.',
        'Begründungen müssen nachvollziehbar und nicht nur Platzhalter sein.',
        'Review-Summary muss in beiden Feldern ausreichend aussagekräftig sein.',
      ]),
    )
  })

  /** Empty symptom input should not be treated as mild symptoms. */
  it('markiert Emergency ohne Symptome nicht als milde-Beschwerden-Widerspruch', () => {
    const issues = getTriageAiPlausibilityIssues(
      {
        careLevel: 'emergency',
        reasons: ['Ohne strukturierte Symptome wird vorsichtig eskaliert.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Situation medizinisch einschätzen.',
          professionalSummary: 'Care Level: emergency without structured symptoms.',
        },
      },
      [],
    )

    expect(issues).not.toContain(
      'Milde Beschwerden ohne Warnzeichen dürfen nicht als emergency eingestuft werden.',
    )
  })

  /** Placeholder-style reasons and summaries should be rejected as insufficient content. */
  it('markiert sehr kurze Begründungen und Summaries als unplausibel', () => {
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
        'Begründungen müssen nachvollziehbar und nicht nur Platzhalter sein.',
        'Review-Summary muss in beiden Feldern ausreichend aussagekräftig sein.',
      ]),
    )
  })
})

import type {
  PdfExportRequest,
  PdfExportResult,
  PdfSection,
  PdfTriageResult,
} from './pdf.types.js'
import type { PatientData, TriageSymptom } from '../triage/triage.types.js'

const DURATION_LABELS: Record<string, string> = {
  today: 'Seit heute',
  days: 'Seit ein paar Tagen',
  week: 'Seit einer Woche',
  weeks: 'Seit mehr als 2 Wochen',
}

function formatDuration(duration?: string): string | null {
  if (!duration) {
    return null
  }

  return DURATION_LABELS[duration] ?? duration
}

function formatCareLevel(careLevel: PdfTriageResult['careLevel']): string {
  switch (careLevel) {
    case 'emergency':
      return 'Notfallversorgung'
    case 'doctor':
      return 'hausärztliche Abklärung'
    case 'specialist':
      return 'fachärztliche Abklärung'
    case 'selfcare':
      return 'Selbstversorgung'
    default:
      return careLevel
  }
}

function symptomLabel(symptom: TriageSymptom): string {
  return symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region
}

function summarizePatient(data: PatientData): string {
  return [
    `Geburt: ${data.birthMonth}/${data.birthYear}`,
    `Größe / Gewicht: ${data.height} / ${data.weight}`,
    `Geschlecht: ${data.gender}`,
    `Schwangerschaft / Stillzeit: ${data.isPregnant ? 'Ja' : 'Nein'} / ${data.isBreastfeeding ? 'Ja' : 'Nein'}`,
    `Allergien: ${data.allergies || '—'}`,
    `Medikamente: ${data.medications || '—'}`,
    `Substanzbeeinflussung: ${data.substanceInfluence || '—'}`,
    `Reise ins Ausland: ${data.recentAbroad ? data.recentAbroadDetails || 'Ja' : 'Nein'}`,
    data.conditions.length > 0
      ? `Vorerkrankungen: ${data.conditions.join(', ')}`
      : 'Vorerkrankungen: —',
  ].join('\n')
}

function summarizeSymptoms(symptoms: TriageSymptom[]): string {
  if (symptoms.length === 0) {
    return 'Keine Symptome übergeben.'
  }

  return symptoms
    .map((symptom) => {
      const parts = [
        symptomLabel(symptom),
        symptom.painLevel !== undefined
          ? `Schmerzstärke ${symptom.painLevel}/10`
          : null,
        formatDuration(symptom.duration),
      ].filter((part): part is string => part !== null)

      return parts.join(', ')
    })
    .join('\n')
}

function summarizeTriage(triage: PdfTriageResult): string {
  return [
    `Versorgungsebene: ${formatCareLevel(triage.careLevel)}`,
    `Empfohlene Fachrichtung: ${triage.recommendedSpecialty}`,
    triage.reasons.length > 0
      ? `Begründungen: ${triage.reasons.join('; ')}`
      : 'Begründungen: —',
  ].join('\n')
}

function buildSections(request: PdfExportRequest): PdfSection[] {
  const sections: PdfSection[] = [
    {
      title: 'Laienverständliche Zusammenfassung',
      content: request.reviewSummary.plainLanguage,
    },
    {
      title: 'Medizinisch strukturierte Zusammenfassung',
      content: request.reviewSummary.professionalSummary,
    },
  ]

  if (request.triage) {
    sections.push({
      title: 'Triage-Einstufung',
      content: summarizeTriage(request.triage),
    })
  }

  if (request.patientData) {
    sections.push({
      title: 'Patientendaten',
      content: summarizePatient(request.patientData),
    })
  }

  if (request.symptoms && request.symptoms.length > 0) {
    sections.push({
      title: 'Beschwerden',
      content: summarizeSymptoms(request.symptoms),
    })
  }

  sections.push({
    title: 'Wichtiger Hinweis',
    content:
      'Diese Ersteinschätzung dient nur zur Orientierung und ersetzt keine ärztliche Diagnose oder Untersuchung. Bei akuten oder schweren Beschwerden sollte medizinische Hilfe in Anspruch genommen werden.',
  })

  return sections
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function buildPdfDocument(lines: string[]): Buffer {
  const contentLines = ['BT', '/F1 11 Tf', '50 780 Td', '14 TL']

  lines.forEach((line, index) => {
    const prefix = index === 0 ? '' : 'T* '
    contentLines.push(`${prefix}(${escapePdfText(line)}) Tj`)
  })

  contentLines.push('ET')

  const stream = contentLines.join('\n')

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${Buffer.byteLength(stream, 'utf8')} >> stream\n${stream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += `${object}\n`
  })

  const xrefOffset = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`
  })

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(pdf, 'utf8')
}

export function createPdfSummary(request: PdfExportRequest): PdfExportResult {
  const sections = buildSections(request)
  const generatedAt = new Date().toISOString()

  const printableLines = [
    'Triage Review Summary',
    `Erstellt am: ${generatedAt}`,
    '',
    ...sections.flatMap((section) => [
      section.title,
      ...section.content.split('\n'),
      '',
    ]),
  ]

  const pdfBuffer = buildPdfDocument(printableLines)

  return {
    fileName: 'triage-review-summary.pdf',
    mimeType: 'application/pdf',
    contentBase64: pdfBuffer.toString('base64'),
    generatedAt,
    sections,
  }
}
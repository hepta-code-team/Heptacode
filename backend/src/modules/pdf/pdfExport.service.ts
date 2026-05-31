import PDFDocument from 'pdfkit'
import { Buffer } from 'node:buffer'

import type { PatientData } from '../../../../shared/patientData.types.js'
import type { TriageSymptom } from '../../../../shared/symptom.types.js'
import type {
  PdfExportRequest,
  PdfExportResult,
  PdfSection,
  PdfTriageResult,
} from './pdf.types.js'

type PdfDoc = InstanceType<typeof PDFDocument>

const THEME = {
  lime: '#C1FF72',
  darkBlue: '#1B2930',
  cyan: '#2A7670',
  turquoise: '#249077',
  azure: '#2E6065',

  background: '#1B2930',
  header: '#1B2930',
  card: '#264F53',
  cardAlt: '#26786F',
  border: '#249077',
  text: '#FFFFFF',
  mutedText: '#D7E5E4',
  subtleText: '#A9C3C0',
  white: '#FFFFFF',

  emergency: '#C1FF72',
  doctor: '#249077',
  specialist: '#2A7670',
  selfcare: '#2E6065',
}

const PAGE = {
  marginX: 48,
  top: 48,
  bottom: 54,
}

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
      return 'Hausärztliche Abklärung'
    case 'specialist':
      return 'Fachärztliche Abklärung'
    case 'selfcare':
      return 'Selbstversorgung'
    default:
      return careLevel
  }
}

function getCareLevelColor(careLevel?: PdfTriageResult['careLevel']): string {
  switch (careLevel) {
    case 'emergency':
      return THEME.emergency
    case 'doctor':
      return THEME.doctor
    case 'specialist':
      return THEME.specialist
    case 'selfcare':
      return THEME.selfcare
    default:
      return THEME.turquoise
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
    `Schwangerschaft / Stillzeit: ${data.isPregnant ? 'Ja' : 'Nein'} / ${
      data.isBreastfeeding ? 'Ja' : 'Nein'
    }`,
    `Allergien: ${data.allergies || '-'}`,
    `Medikamente: ${data.medications || '-'}`,
    `Substanzbeeinflussung: ${data.substanceInfluence || '-'}`,
    `Reise ins Ausland: ${
      data.recentAbroad ? data.recentAbroadDetails || 'Ja' : 'Nein'
    }`,
    data.conditions.length > 0
      ? `Vorerkrankungen: ${data.conditions.join(', ')}`
      : 'Vorerkrankungen: -',
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
      : 'Begründungen: -',
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

function formatGeneratedAt(value: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function collectPdfBuffer(doc: PdfDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    doc.on('end', () => {
      resolve(Buffer.concat(chunks))
    })

    doc.on('error', reject)
  })
}

function paintPageBackground(doc: PdfDoc): void {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(THEME.background)
}

function addHeader(
  doc: PdfDoc,
  generatedAt: string,
  triage?: PdfTriageResult,
): void {
  const pageWidth = doc.page.width
  const headerHeight = 132

  doc.rect(0, 0, pageWidth, headerHeight).fill(THEME.header)

  doc
    .fillColor(THEME.lime)
    .font('Helvetica-Bold')
    .fontSize(24)
    .text('Triage Review Summary', PAGE.marginX, 38, {
      width: 380,
    })

  doc
    .fillColor(THEME.mutedText)
    .font('Helvetica')
    .fontSize(10)
    .text(`Erstellt am: ${formatGeneratedAt(generatedAt)}`, PAGE.marginX, 72)

  if (triage) {
    const careColor = getCareLevelColor(triage.careLevel)

    doc.roundedRect(PAGE.marginX, 94, 220, 24, 8).fill(careColor)

    doc
      .fillColor(THEME.darkBlue)
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .text(formatCareLevel(triage.careLevel), PAGE.marginX + 12, 101, {
        width: 196,
      })
  }
}

function addFooter(doc: PdfDoc, pageNumber: number, totalPages: number): void {
  const footerY = doc.page.height - 34
  const contentWidth = doc.page.width - PAGE.marginX * 2

  doc
    .moveTo(PAGE.marginX, footerY - 10)
    .lineTo(doc.page.width - PAGE.marginX, footerY - 10)
    .strokeColor(THEME.border)
    .lineWidth(0.7)
    .stroke()

  doc
    .fillColor(THEME.subtleText)
    .font('Helvetica')
    .fontSize(8)
    .text('HeptaPlus – Triage Review Summary', PAGE.marginX, footerY, {
      width: contentWidth / 2,
      align: 'left',
    })

  doc
    .fillColor(THEME.subtleText)
    .font('Helvetica')
    .fontSize(8)
    .text(`Seite ${pageNumber} von ${totalPages}`, PAGE.marginX, footerY, {
      width: contentWidth,
      align: 'right',
    })
}

function ensureSpace(doc: PdfDoc, neededHeight: number): void {
  const maxY = doc.page.height - PAGE.bottom

  if (doc.y + neededHeight > maxY) {
    doc.addPage()
    paintPageBackground(doc)
    doc.y = PAGE.top
  }
}

function addIntroBox(doc: PdfDoc): void {
  const x = PAGE.marginX
  const width = doc.page.width - PAGE.marginX * 2
  const y = doc.y

  doc.roundedRect(x, y, width, 64, 12).fill(THEME.cardAlt)

  doc
    .fillColor(THEME.lime)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('Übersicht', x + 16, y + 14)

  doc
    .fillColor(THEME.text)
    .font('Helvetica')
    .fontSize(9.5)
    .text(
      'Dieses Dokument fasst die eingegebenen Informationen und die Triage-Einschätzung strukturiert zusammen.',
      x + 16,
      y + 34,
      {
        width: width - 32,
        lineGap: 3,
      },
    )

  doc.y = y + 80
}

function addSectionCard(
  doc: PdfDoc,
  section: PdfSection,
  options?: {
    highlightColor?: string
  },
): void {
  const x = PAGE.marginX
  const width = doc.page.width - PAGE.marginX * 2
  const padding = 16
  const titleHeight = 18
  const contentWidth = width - padding * 2

  doc.font('Helvetica').fontSize(10)

  const contentHeight = doc.heightOfString(section.content, {
    width: contentWidth,
    lineGap: 4,
  })

  const cardHeight = padding + titleHeight + 8 + contentHeight + padding

  ensureSpace(doc, cardHeight + 14)

  const y = doc.y
  const highlightColor = options?.highlightColor ?? THEME.lime

  doc.roundedRect(x, y, width, cardHeight, 12).fill(THEME.card)

  doc.roundedRect(x, y, 7, cardHeight, 4).fill(highlightColor)

  doc
    .roundedRect(x, y, width, cardHeight, 12)
    .strokeColor(THEME.border)
    .lineWidth(0.8)
    .stroke()

  doc
    .fillColor(THEME.lime)
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(section.title, x + padding, y + padding, {
      width: contentWidth,
    })

  doc
    .fillColor(THEME.text)
    .font('Helvetica')
    .fontSize(10)
    .text(section.content, x + padding, y + padding + titleHeight + 8, {
      width: contentWidth,
      lineGap: 4,
    })

  doc.y = y + cardHeight + 14
}

function addPdfContent(
  doc: PdfDoc,
  request: PdfExportRequest,
  sections: PdfSection[],
  generatedAt: string,
): void {
  paintPageBackground(doc)
  addHeader(doc, generatedAt, request.triage)

  doc.y = 154

  addIntroBox(doc)

  sections.forEach((section) => {
    const isWarning = section.title === 'Wichtiger Hinweis'
    const isTriage = section.title === 'Triage-Einstufung'

    addSectionCard(doc, section, {
      highlightColor: isWarning
        ? THEME.turquoise
        : isTriage
          ? getCareLevelColor(request.triage?.careLevel)
          : THEME.lime,
    })
  })
}

function addPageNumbers(doc: PdfDoc): void {
  const range = doc.bufferedPageRange()
  const totalPages = range.count

  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index)
    addFooter(doc, index + 1, totalPages)
  }
}

export async function createPdfSummary(
  request: PdfExportRequest,
): Promise<PdfExportResult> {
  const sections = buildSections(request)
  const generatedAt = new Date().toISOString()

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    bufferPages: true,
    info: {
      Title: 'Triage Review Summary',
      Subject: 'Triage Review Summary',
      Creator: 'HeptaPlus',
      Producer: 'HeptaPlus',
    },
  })

  const pdfBufferPromise = collectPdfBuffer(doc)

  addPdfContent(doc, request, sections, generatedAt)
  addPageNumbers(doc)

  doc.end()

  const pdfBuffer = await pdfBufferPromise

  return {
    fileName: 'triage-review-summary.pdf',
    mimeType: 'application/pdf',
    contentBase64: pdfBuffer.toString('base64'),
    generatedAt,
    sections,
  }
}
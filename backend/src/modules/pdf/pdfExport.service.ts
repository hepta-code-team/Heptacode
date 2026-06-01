import PDFDocument from 'pdfkit'
import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import type { PatientData } from '../../../../shared/patientData.types.js'
import type { TriageSymptom } from '../../../../shared/symptom.types.js'
import type {
  PdfExportRequest,
  PdfExportResult,
  PdfSection,
  PdfTriageResult,
} from './pdf.types.js'

type PdfDoc = InstanceType<typeof PDFDocument>

const TEAM_LOGO_PATH = join(
  process.cwd(),
  'src',
  'modules',
  'pdf',
  'assets',
  'heptaplus-logo.png',
)

const PDF_TITLE = 'Ihre medizinische Ersteinschätzung'

const THEME = {
  lime: '#C1FF72',
  darkBlue: '#1B2930',
  cyan: '#2A7670',
  turquoise: '#249077',
  azure: '#2E6065',

  background: '#F7FAF9',
  header: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#EEF7F4',
  border: '#D6E7E3',
  strongBorder: '#249077',

  text: '#1B2930',
  mutedText: '#52676B',
  subtleText: '#7A8E91',
  white: '#FFFFFF',

  warning: '#D64545',
  warningLight: '#FFF1F1',
  warningBorder: '#F2B8B8',

  emergency: '#C1FF72',
  doctor: '#DFF8D2',
  specialist: '#D9F0EE',
  selfcare: '#EAF3F2',
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

function symptomLabel(symptom: TriageSymptom): string {
  return symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region
}

function normalizeGermanText(value: string): string {
  return value
    .replace(/verfuegbar/g, 'verfügbar')
    .replace(/Verfuegbar/g, 'Verfügbar')
    .replace(/uebergebenen/g, 'übergebenen')
    .replace(/Uebergebenen/g, 'Übergebenen')
    .replace(/fuer/g, 'für')
    .replace(/Fuer/g, 'Für')
    .replace(/enthaelt/g, 'enthält')
    .replace(/Enthaelt/g, 'Enthält')
    .replace(/Schmerzstaerke/g, 'Schmerzstärke')
    .replace(/schmerzstaerke/g, 'Schmerzstärke')
    .replace(/Ausgewaehlte/g, 'Ausgewählte')
    .replace(/ausgewaehlte/g, 'ausgewählte')
    .replace(/Begruendung/g, 'Begründung')
    .replace(/begruendung/g, 'Begründung')
}

function formatReason(reason: string): string {
  const cleanedReason = normalizeGermanText(reason)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.;:,\s]+$/g, '')

  return cleanedReason.length > 0 ? `${cleanedReason}.` : ''
}

function formatReasons(reasons: string[]): string {
  const cleanedReasons = reasons
    .map(formatReason)
    .filter((reason) => reason.length > 0)

  if (cleanedReasons.length === 0) {
    return '-'
  }

  return cleanedReasons.join(' ')
}

function formatValue(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') {
    return '-'
  }

  return String(value)
}

function summarizePatient(data?: PatientData): string {
  if (!data) {
    return 'Keine Stammdaten vorhanden.'
  }

  return [
    `Geburt: ${formatValue(data.birthMonth)}/${formatValue(data.birthYear)}`,
    `Größe / Gewicht: ${formatValue(data.height)} cm / ${formatValue(data.weight)} kg`,
    `Geschlecht: ${formatValue(data.gender)}`,
    `Schwangerschaft: ${data.isPregnant ? 'Ja' : 'Nein'}`,
    `Stillzeit: ${data.isBreastfeeding ? 'Ja' : 'Nein'}`,
    `Allergien: ${data.allergies || '-'}`,
    `Medikamente: ${data.medications || '-'}`,
    `Substanzbeeinflussung: ${data.substanceInfluence || 'Nein'}`,
    `Reise ins Ausland: ${
      data.recentAbroad ? data.recentAbroadDetails || 'Ja' : 'Nein'
    }`,
    data.conditions.length > 0
      ? `Vorerkrankungen: ${data.conditions.join(', ')}`
      : 'Vorerkrankungen: -',
  ].join('\n')
}

function summarizeSymptoms(symptoms?: TriageSymptom[]): string {
  if (!symptoms || symptoms.length === 0) {
    return 'Keine Beschwerden vorhanden.'
  }

  return symptoms
    .map((symptom, index) => {
      const details = [
        symptomLabel(symptom),
        symptom.painLevel !== undefined
          ? `Schmerzstärke: ${symptom.painLevel}/10`
          : null,
        formatDuration(symptom.duration)
          ? `Dauer: ${formatDuration(symptom.duration)}`
          : null,
      ].filter((part): part is string => part !== null)

      return `${index + 1}. ${details.join(', ')}`
    })
    .join('\n')
}

function mergeSymptomBlocks(summary: string, symptoms?: TriageSymptom[]): string {
  if (!symptoms || symptoms.length === 0) {
    return summary
  }

  const startMatch = summary.match(
    /(^|\n)\s*(?:(?:Ausgewählte|Ausgewaehlte)\s+Symptome|Detailangaben\s+zu\s+aktiven\s+Symptomen|Beschwerden\s*\/\s*Symptome|Beschwerden)\s*:/i,
  )

  if (!startMatch || startMatch.index === undefined) {
    return summary
  }

  const startIndex = startMatch.index + (startMatch[1]?.length ?? 0)
  const afterStart = summary.slice(startIndex)

  const endMarkerPatterns = [
    /\n\s*Begründung der Empfehlung\s*:/i,
    /\n\s*Begruendung der Empfehlung\s*:/i,
    /\n\s*Wichtiger Hinweis\s*:/i,
    /\n\s*Hinweis\s*:/i,
  ]

  const markerIndexes = endMarkerPatterns
    .map((pattern) => {
      const match = afterStart.match(pattern)
      return match?.index
    })
    .filter((index): index is number => index !== undefined)

  const endIndex =
    markerIndexes.length > 0 ? startIndex + Math.min(...markerIndexes) : summary.length

  const before = summary.slice(0, startIndex).trimEnd()
  const after = summary.slice(endIndex).trimStart()

  const mergedSymptoms = `Ausgewählte Symptome:\n${summarizeSymptoms(symptoms)}`

  return [before, mergedSymptoms, after]
    .filter((part) => part.trim().length > 0)
    .join('\n\n')
}

function summarizeCareReason(triage?: PdfTriageResult): string {
  if (!triage) {
    return 'Begründung der Empfehlung: Keine Begründung vorhanden.'
  }

  return `Begründung der Empfehlung: ${formatReasons(triage.reasons)}`
}

function summarizeMedicalOverview(request: PdfExportRequest): string {
  const rawProfessionalSummary = normalizeGermanText(
    request.reviewSummary.professionalSummary,
  ).trim()

  const editedProfessionalSummary = mergeSymptomBlocks(
    rawProfessionalSummary,
    request.symptoms,
  )

  if (editedProfessionalSummary.length > 0) {
    return [
      editedProfessionalSummary,
      '',
      summarizeCareReason(request.triage),
    ].join('\n')
  }

  return [
    'Patientendaten:',
    summarizePatient(request.patientData),
    '',
    'Ausgewählte Symptome:',
    summarizeSymptoms(request.symptoms),
    '',
    summarizeCareReason(request.triage),
  ].join('\n')
}

function buildSections(request: PdfExportRequest): PdfSection[] {
  return [
    {
      title: 'Zusammenfassung für Patient:innen',
      content: request.reviewSummary.plainLanguage,
    },
    {
      title: 'Medizinische Übersicht',
      content: summarizeMedicalOverview(request),
    },
    {
      title: 'Wichtiger Hinweis',
      content:
        'Diese Einschätzung ist keine medizinische Diagnose und ersetzt nicht den Besuch bei einem Arzt. KI-Systeme können Fehler machen. Bei Unsicherheit oder Verschlechterung Ihres Zustands suchen Sie bitte umgehend medizinische Hilfe.',
    },
  ]
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
    .moveTo(PAGE.marginX, headerHeight - 1)
    .lineTo(pageWidth - PAGE.marginX, headerHeight - 1)
    .strokeColor(THEME.border)
    .lineWidth(1)
    .stroke()

  doc
    .fillColor(THEME.darkBlue)
    .font('Helvetica-Bold')
    .fontSize(21)
    .text(PDF_TITLE, PAGE.marginX, 34, {
      width: 370,
    })

  doc
    .fillColor(THEME.mutedText)
    .font('Helvetica')
    .fontSize(10)
    .text(`Erstellt am: ${formatGeneratedAt(generatedAt)}`, PAGE.marginX, 68)

  if (triage) {
    doc
      .fillColor(THEME.mutedText)
      .font('Helvetica')
      .fontSize(9)
      .text('Empfohlene Versorgungsebene', PAGE.marginX, 92)

    doc
      .fillColor(THEME.darkBlue)
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(formatCareLevel(triage.careLevel), PAGE.marginX, 107)
  }

  if (existsSync(TEAM_LOGO_PATH)) {
    try {
      doc.image(TEAM_LOGO_PATH, pageWidth - PAGE.marginX - 105, 28, {
        fit: [105, 72],
        align: 'right',
        valign: 'center',
      })
    } catch {
      // Falls das Logo nicht geladen werden kann, wird es übersprungen.
    }
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
    .text(`HeptaPlus - ${PDF_TITLE}`, PAGE.marginX, footerY, {
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
  const boxHeight = 48

  const accentInset = 2
  const accentWidth = 7

  doc.roundedRect(x, y, width, boxHeight, 12).fill(THEME.cardAlt)

  doc
    .roundedRect(
      x + accentInset,
      y + accentInset,
      accentWidth,
      boxHeight - accentInset * 2,
      4,
    )
    .fill(THEME.lime)

  doc
    .fillColor(THEME.text)
    .font('Helvetica')
    .fontSize(9.5)
    .text(
      'Dieses Dokument fasst Ihre eingegebenen Gesundheitsangaben und die empfohlene Versorgung strukturiert zusammen.',
      x + 16,
      y + 15,
      {
        width: width - 32,
        lineGap: 3,
      },
    )

  doc.y = y + boxHeight + 16
}

function addSectionCard(
  doc: PdfDoc,
  section: PdfSection,
  options?: {
    highlightColor?: string
    backgroundColor?: string
    borderColor?: string
    titleColor?: string
  },
): void {
  const x = PAGE.marginX
  const width = doc.page.width - PAGE.marginX * 2
  const padding = 16
  const titleHeight = 18
  const contentWidth = width - padding * 2

  const accentInset = 2
  const accentWidth = 7

  doc.font('Helvetica').fontSize(10)

  const contentHeight = doc.heightOfString(section.content, {
    width: contentWidth,
    lineGap: 4,
  })

  const cardHeight = padding + titleHeight + 8 + contentHeight + padding

  ensureSpace(doc, cardHeight + 14)

  const y = doc.y
  const highlightColor = options?.highlightColor ?? THEME.lime
  const backgroundColor = options?.backgroundColor ?? THEME.card
  const borderColor = options?.borderColor ?? THEME.border
  const titleColor = options?.titleColor ?? THEME.darkBlue

  doc.roundedRect(x, y, width, cardHeight, 12).fill(backgroundColor)

  doc
    .roundedRect(
      x + accentInset,
      y + accentInset,
      accentWidth,
      cardHeight - accentInset * 2,
      4,
    )
    .fill(highlightColor)

  doc
    .roundedRect(x, y, width, cardHeight, 12)
    .strokeColor(borderColor)
    .lineWidth(0.9)
    .stroke()

  doc
    .fillColor(titleColor)
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

    addSectionCard(doc, section, {
      highlightColor: isWarning ? THEME.warning : THEME.lime,
      backgroundColor: isWarning ? THEME.warningLight : THEME.card,
      borderColor: isWarning ? THEME.warningBorder : THEME.border,
      titleColor: isWarning ? THEME.warning : THEME.darkBlue,
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
      Title: PDF_TITLE,
      Subject: PDF_TITLE,
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
    fileName: 'medizinische-ersteinschaetzung.pdf',
    mimeType: 'application/pdf',
    contentBase64: pdfBuffer.toString('base64'),
    generatedAt,
    sections,
  }
}
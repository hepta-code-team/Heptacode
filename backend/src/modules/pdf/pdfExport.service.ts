import PDFDocument from 'pdfkit'
import {Buffer} from 'node:buffer'
import {existsSync} from 'node:fs'
import {join} from 'node:path'

import type {PatientData} from '../../../../shared/patientData.types.js'
import type {MedicalSpecialty} from '../../../../shared/result.types.js'
import type {TriageSymptom} from '../../../../shared/symptom.types.js'
import type {PdfExportRequest, PdfExportResult, PdfSection, PdfTriageResult,} from './pdf.types.js'

type PdfDoc = InstanceType<typeof PDFDocument>

const TEAM_LOGO_PATH = join(
  process.cwd(),
  'src',
  'modules',
  'pdf',
  'assets',
  'HeptaCheck.png',
)

const PDF_TITLE = 'Ihre medizinische Ersteinschätzung'

const EMERGENCY_INFO_URL =
  'https://gesund.bund.de/wege-im-gesundheitswesen/erwachsenenleben/alter/notfaelle/notruf-und-notaufnahme'

const THEME = {
  darkBlue: '#1B2930',

  background: '#FFFFFF',
  header: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#FFFFFF',
  border: '#DDE6EA',

  text: '#1B2930',
  mutedText: '#52676B',
  subtleText: '#7A8E91',
  white: '#FFFFFF',

  warning: '#D64545',
  warningLight: '#FFF1F1',
  warningBorder: '#F2B8B8',

  emergency: '#F3F6F8',
  doctor: '#F3F6F8',
  specialist: '#F3F6F8',
  selfcare: '#F3F6F8',
}

const PAGE = {
  marginX: 48,
  top: 48,
  bottom: 54,
}

/**
 * Maps internal care-level identifiers to the wording shown in the PDF header.
 *
 * This keeps the exported document patient-readable while preserving the typed
 * care-level contract used by the API.
 */
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

const MEDICAL_SPECIALTY_LABELS: Record<MedicalSpecialty, string> = {
  home_care: 'Häusliche Versorgung',
  emergency_medicine: 'Notfallmedizin',
  general_practice: 'Allgemeinmedizin',
  internal_medicine: 'Innere Medizin',
  cardiology: 'Kardiologie',
  neurology: 'Neurologie',
  orthopedics: 'Orthopädie',
  gastroenterology: 'Gastroenterologie',
  pulmonology: 'Pneumologie',
  dermatology: 'Dermatologie',
  urology: 'Urologie',
  gynecology: 'Gynäkologie',
  psychiatry: 'Psychiatrie',
  pediatrics: 'Pädiatrie',
  dentistry: 'Zahnmedizin',
  ophthalmology: 'Augenheilkunde',
  otolaryngology: 'Hals-Nasen-Ohren-Heilkunde',
}

function formatCareRecommendation(triage: PdfTriageResult): string {
  const careLevel = formatCareLevel(triage.careLevel)

  if (!triage.recommendedSpecialty) {
    return careLevel
  }

  return `${careLevel} – ${MEDICAL_SPECIALTY_LABELS[triage.recommendedSpecialty]}`
}

function symptomLabel(symptom: TriageSymptom): string {
  return symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region
}

function formatGender(value: string): string {
  switch (value.toLowerCase()) {
    case 'female':
    case 'weiblich':
      return 'Weiblich'
    case 'male':
    case 'männlich':
    case 'maennlich':
      return 'Männlich'
    case 'diverse':
    case 'divers':
      return 'Divers'
    default:
      return formatValue(value)
  }
}

/**
 * Normalizes common ASCII spellings that can come from prompts or fallbacks.
 *
 * The PDF is a patient-facing artifact, so it should prefer proper German
 * characters even when upstream service text uses ue/ae/oe fallbacks.
 */
function normalizeGermanText(value: string): string {
  return value
    .replace(/Groesse/g, 'Größe')
    .replace(/groesse/g, 'Größe')
    .replace(/Grosse/g, 'Größe')
    .replace(/grosse/g, 'Größe')
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
    .replace(/Schilddruesenunterfunktion/g, 'Schilddrüsenunterfunktion')
    .replace(/schilddruesenunterfunktion/g, 'Schilddrüsenunterfunktion')
}

/**
 * Cleans an individual triage reason before it is joined into prose.
 *
 * Reasons may already contain punctuation depending on whether they came from
 * local fallbacks or AI output, so the formatter standardizes the ending.
 */
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

function formatIsoDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    return value
  }

  return `${match[3]}.${match[2]}.${match[1]}`
}

function splitTravelDetails(details: string) {
  const [country = '', startDate = '', endDate = ''] = details.split('|').map((part) => part.trim())

  if (startDate || endDate) {
    return { country, startDate, endDate }
  }

  return { country: details.trim(), startDate: '', endDate: '' }
}

function formatTravelDisplay(value: string): string {
  const { country, startDate, endDate } = splitTravelDetails(value)
  const formattedStartDate = startDate ? formatIsoDate(startDate) : ''
  const formattedEndDate = endDate ? formatIsoDate(endDate) : ''

  if (country && formattedStartDate && formattedEndDate) {
    return `${country}, ${formattedStartDate} bis ${formattedEndDate}`
  }

  if (country && formattedStartDate) {
    return `${country}, ab ${formattedStartDate}`
  }

  if (country && formattedEndDate) {
    return `${country}, bis ${formattedEndDate}`
  }

  return country || formattedStartDate || formattedEndDate || value
}

function formatRecentAbroad(data: PatientData): string {
  if (!data.recentAbroad) {
    return 'Nein'
  }

  return formatTravelDisplay(data.recentAbroadDetails) || 'Ja'
}

function normalizeTravelSummaryLine(line: string): string {
  return line.replace(
    /^(Reise ins Ausland|Auslandsreise|Auslandsaufenthalt(?: letzte 3 Monate)?):\s*(.+)$/i,
    (match, label: string, value: string) => {
      const formattedValue = formatTravelDisplay(value)

      return formattedValue ? `${label}: ${formattedValue}` : match
    },
  )
}

/**
 * Builds the patient-data block used when no structured professional summary exists.
 *
 * The output intentionally includes negative answers for important risk fields
 * so the PDF documents what was asked, not only what was positive.
 */
function summarizePatient(data?: PatientData): string {
  if (!data) {
    return 'Keine Stammdaten vorhanden.'
  }

  return [
    `Geburtsdatum: ${formatValue(data.birthMonth)}/${formatValue(data.birthYear)}`,
    `Größe: ${formatValue(data.height)} cm`,
    `Gewicht: ${formatValue(data.weight)} kg`,
    `Geschlecht: ${formatGender(data.gender)}`,
    `Schwanger: ${data.isPregnant ? 'Ja' : 'Nein'}`,
    `Stillzeit: ${data.isBreastfeeding ? 'Ja' : 'Nein'}`,
    `Allergien: ${data.allergies || '-'}`,
    `Medikamente: ${data.medications || '-'}`,
    `Einahmedauer Medikamente: ${data.medicationDuration || '-'}`,
    `Substanzbeeinflussung: ${data.substanceInfluence || 'Nein'}`,
    `Reise ins Ausland: ${formatRecentAbroad(data)}`,
    data.conditions.length > 0
      ? `Vorerkrankungen: ${data.conditions.join(', ')}`
      : 'Vorerkrankungen: —',
    `Raucher: ${data.isSmoker ? 'Ja' : 'Nein'}`,
    data.isSmoker ? `Rauchdauer: ${data.smokingSinceYears || '—'}` : null,
    data.isSmoker ? `Zigaretten pro Tag: ${data.cigarettesPerDay || '—'}` : null,
  ].filter((line): line is string => line !== null).join('\n')
}

function formatDuration(duration?: TriageSymptom['duration']): string | null {
  switch (duration) {
    case 'today':
      return 'Seit heute'
    case 'days':
      return 'Seit ein paar Tagen'
    case 'week':
      return 'Seit einer Woche'
    case 'weeks':
      return 'Seit mehreren Wochen'
    default:
      return null
  }
}

function formatMeasurement(symptom: TriageSymptom): string | null {
  if (symptom.measurementValue === undefined) {
    return null
  }

  if (symptom.measurementType === 'temperature') {
    return `Temperatur: ${symptom.measurementValue}°C`
  }

  if (symptom.measurementType === 'feeling') {
    return `Beschwerdegefühl: ${symptom.measurementValue}/10`
  }

  return `Schmerzstärke: ${symptom.measurementValue}/10`
}

/**
 * Formats symptoms as a readable multi-line complaint block for the PDF.
 *
 * Each symptom is separated by a blank line so measurement and duration details
 * remain visually grouped in the exported document.
 */
function summarizeSymptoms(symptoms?: TriageSymptom[]): string {
  if (!symptoms || symptoms.length === 0) {
    return 'Keine Beschwerden vorhanden.'
  }

  return symptoms
    .map((symptom, index) => {
      const detailLines = [
        `${index + 1}. ${symptomLabel(symptom)}`,
        symptom.details ? `Details: ${symptom.details}` : null,
        formatMeasurement(symptom),
        formatDuration(symptom.duration) ? `Dauer: ${formatDuration(symptom.duration)}` : null,
      ].filter((part): part is string => part !== null)

      return detailLines.join('\n')
    })
    .join('\n\n')
}

/**
 * Removes the short preselection section from backend-generated summaries.
 *
 * The detailed active symptom section carries better information for the PDF,
 * so keeping both would make the complaint block repetitive.
 */
function removeSelectedSymptomBlock(lines: string[]): string[] {
  const cleanedLines: string[] = []
  let skipSelectedSymptoms = false

  lines.forEach((line) => {
    const normalizedLine = line.trim().toLowerCase()

    if (normalizedLine === 'ausgewählte symptome:' || normalizedLine === 'ausgewaehlte symptome:') {
      skipSelectedSymptoms = true
      return
    }

    if (normalizedLine === 'detailangaben zu aktiven symptomen:') {
      skipSelectedSymptoms = false
      return
    }

    if (skipSelectedSymptoms) {
      return
    }

    cleanedLines.push(line)
  })

  return cleanedLines
}

/**
 * Normalizes patient summary lines into the current PDF section format.
 *
 * Older summaries can contain separate birth-month and birth-year lines; this
 * combines them into the single birth-date row shown in the export.
 */
function normalizePatientSummaryLines(lines: string[]): string[] {
  const normalizedLines: string[] = []
  let birthMonth: string | null = null
  let birthYear: string | null = null

  lines.forEach((line) => {
    const trimmedLine = normalizeGermanText(line.trim())
    const birthMonthMatch = trimmedLine.match(/^Geburtsmonat:\s*(.+)$/i)
    const birthYearMatch = trimmedLine.match(/^Geburtsjahr:\s*(.+)$/i)

    if (trimmedLine.length === 0 || /^Stammdaten:\s*$/i.test(trimmedLine)) {
      return
    }

    if (/^Keine Stammdaten vorhanden\.$/i.test(trimmedLine) && lines.length > 1) {
      return
    }

    if (/^Details zu(?:r|) Vorerkrankung(?:en)?:/i.test(trimmedLine)) {
      return
    }

    if (birthMonthMatch) {
      birthMonth = birthMonthMatch[1]?.trim() ?? null
      return
    }

    if (birthYearMatch) {
      birthYear = birthYearMatch[1]?.trim() ?? null
      return
    }

    normalizedLines.push(
      normalizeTravelSummaryLine(trimmedLine)
        .replace(/^Details zu Vorerkrankungen:\s*Sonstige(?:s)?\s*:\s*/i, 'Details zu Vorerkrankungen: ')
        .replace(/^Details zur Vorerkrankung:\s*Sonstige(?:s)?\s*:\s*/i, 'Details zu Vorerkrankungen: ')
        .replace(/^Details zu Vorerkrankungen:\s*([^:;]+):\s*/i, 'Details zu Vorerkrankungen: ')
        .replace(/^Details zur Vorerkrankung:\s*([^:;]+):\s*/i, 'Details zu Vorerkrankungen: '),
    )
  })

  if (birthMonth || birthYear) {
    normalizedLines.unshift(`Geburtsdatum: ${formatValue(birthMonth)}/${formatValue(birthYear)}`)
  }

  return normalizedLines
}

/**
 * Splits compact symptom detail rows into separate PDF lines.
 *
 * Backend fallback summaries often encode symptom, measurement, and duration on
 * one comma-separated line; the PDF layout reads better when they are separated.
 */
function normalizeComplaintSummaryLines(lines: string[]): string[] {
  return removeSelectedSymptomBlock(lines)
    .map((line) => normalizeGermanText(line.trim()))
    .filter((line) => line.length > 0)
    .flatMap((line) =>
      line
        .replace(/\s+(?=(Vorerkrankungen|Risikofaktoren|Indikation)\b)/g, '\n')
        .split('\n')
        .map((part) => part.trim())
        .filter((part) => part.length > 0),
    )
    .flatMap((line) => {
      const detailMatch = line.match(/^(\d+\.\s*[^,]+),\s*(.+)$/)

      if (!detailMatch) {
        return [line]
      }

      return [
        detailMatch[1]?.trim() ?? line,
        ...(detailMatch[2] ?? '')
          .split(/\s*,\s*/)
          .map((part) => part.trim())
          .filter((part) => part.length > 0),
      ]
    })
}

function extractComplaintsFromStructuredSummary(summary: string): string {
  const cleanedSummary = cleanStructuredProfessionalSummary(summary)
  const complaintMatch = cleanedSummary.match(/(?:^|\n)Beschwerden:\n([\s\S]*)$/i)

  return complaintMatch?.[1]?.trim() || 'Keine Beschwerden vorhanden.'
}

function extractPatientFromStructuredSummary(summary: string): string {
  const cleanedSummary = cleanStructuredProfessionalSummary(summary)
  const patientMatch = cleanedSummary.match(/(?:^|\n)Patientendaten:\n([\s\S]*?)(?:\n\nBeschwerden:|$)/i)

  return patientMatch?.[1]?.trim() || 'Keine Stammdaten vorhanden.'
}

function hasMedicalSummaryStructure(summary: string): boolean {
  return /(^|\n)\s*(Patientendaten|Stammdaten|Beschwerden|Ausgewählte Symptome|Ausgewaehlte Symptome|Detailangaben zu aktiven Symptomen)\s*:/i.test(summary)
}

/**
 * Cleans a structured professional summary before it is embedded in the PDF.
 *
 * The parser accepts both current and older heading names because summaries may
 * be produced by backend fallbacks, AI responses, or user edits in the frontend.
 */
function cleanStructuredProfessionalSummary(summary: string): string {
  const patientLines: string[] = []
  const complaintLines: string[] = []
  let activeSection: 'patientData' | 'complaints' | null = null
  let skipSelectedSymptoms = false

  // Rebuild only the patient and complaint sections to avoid duplicating the selection summary in the PDF.
  normalizeGermanText(summary)
    .split('\n')
    .forEach((line) => {
      const normalizedLine = line.trim().toLowerCase()

      if (normalizedLine === 'patientendaten:' || normalizedLine === 'stammdaten:') {
        activeSection = 'patientData'
        return
      }

      if (normalizedLine === 'beschwerden:') {
        activeSection = 'complaints'
        return
      }

      if (normalizedLine === 'ausgewählte symptome:' || normalizedLine === 'ausgewaehlte symptome:') {
        activeSection = 'complaints'
        skipSelectedSymptoms = true
        return
      }

      if (normalizedLine === 'detailangaben zu aktiven symptomen:') {
        activeSection = 'complaints'
        skipSelectedSymptoms = false
        return
      }

      if (activeSection === 'patientData') {
        patientLines.push(line)
        return
      }

      if (activeSection === 'complaints') {
        if (skipSelectedSymptoms) {
          return
        }

        complaintLines.push(line)
      }
    })

  const normalizedPatientLines = normalizePatientSummaryLines(patientLines)
  const normalizedComplaintLines = normalizeComplaintSummaryLines(complaintLines)

  return [
    'Patientendaten:',
    normalizedPatientLines.length > 0 ? normalizedPatientLines.join('\n') : 'Keine Stammdaten vorhanden.',
    '',
    'Beschwerden:',
    normalizedComplaintLines.length > 0 ? normalizedComplaintLines.join('\n') : 'Keine Beschwerden vorhanden.',
  ].join('\n')
}

function summarizeCareReason(request: PdfExportRequest): string {
  const plainLanguageSummary = normalizeGermanText(request.reviewSummary.plainLanguage).trim()
  const specialtyLine = request.triage?.recommendedSpecialty
    ? `Empfohlene Fachrichtung: ${MEDICAL_SPECIALTY_LABELS[request.triage.recommendedSpecialty]}\n`
    : ''

  if (plainLanguageSummary.length > 0) {
    return `${specialtyLine}Begründung der Empfehlung: \n${plainLanguageSummary}`
  }

  if (!request.triage) {
    return 'Begründung der Empfehlung: Keine Begründung vorhanden.'
  }

  return `${specialtyLine}Begründung der Empfehlung: ${formatReasons(request.triage.reasons)}`
}

/**
 * Chooses the best source for the PDF's medical overview section.
 *
 * Edited professional summaries win when they have recognizable headings;
 * otherwise the overview is rebuilt from structured patient and symptom data.
 */
function summarizeMedicalOverview(request: PdfExportRequest): string {
  const rawProfessionalSummary = normalizeGermanText(
    request.reviewSummary.professionalSummary,
  ).trim()

  // Preserve clinician-edited structured summaries, but normalize them into the PDF section format.
  if (rawProfessionalSummary.length > 0 && hasMedicalSummaryStructure(rawProfessionalSummary)) {
    return [
      'Patientendaten:',
      request.patientData
        ? summarizePatient(request.patientData)
        : extractPatientFromStructuredSummary(rawProfessionalSummary),
      '',
      'Beschwerden:',
      extractComplaintsFromStructuredSummary(rawProfessionalSummary),
      '',
      summarizeCareReason(request),
    ].join('\n')
  }

  return [
    'Patientendaten:',
    summarizePatient(request.patientData),
    '',
    'Beschwerden:',
    summarizeSymptoms(request.symptoms),
    '',
    summarizeCareReason(request),
  ].join('\n')
}

/**
 * Defines the ordered PDF sections.
 *
 * The medical overview stays first because it is the primary artifact, while
 * the warning remains a separate card for visual emphasis.
 */
function buildSections(request: PdfExportRequest): PdfSection[] {
  return [
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
    timeZone: 'Europe/Berlin',
  }).format(new Date(value))
}

/**
 * Collects PDFKit stream chunks into a single Buffer.
 *
 * PDFKit writes asynchronously, so callers must start collection before drawing
 * content and await the promise after doc.end().
 */
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

/**
 * Draws the repeating document header for the first page.
 *
 * The logo is optional so local development and production builds can still
 * export PDFs even if the asset is missing from the runtime image.
 */
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
      .text(formatCareRecommendation(triage), PAGE.marginX, 107)
  }

  if (existsSync(TEAM_LOGO_PATH)) {
    try {
      doc.image(TEAM_LOGO_PATH, pageWidth - PAGE.marginX - 105, 28, {
        fit: [105, 72],
        align: 'right',
        valign: 'center',
      })
    } catch {
      // Skip the logo if the asset cannot be loaded.
    }
  }
}

/**
 * Adds a footer after all pages are known.
 *
 * Page numbers are written in a second pass because PDFKit only knows the final
 * page count after content rendering has finished.
 */
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
    .text(`HeptaCheck - ${PDF_TITLE}`, PAGE.marginX, footerY, {
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

/**
 * Starts a new page when the next card would overflow the printable area.
 *
 * This keeps cards intact instead of splitting rounded backgrounds across page
 * boundaries, which would make the medical summary harder to scan.
 */
function ensureSpace(doc: PdfDoc, neededHeight: number): void {
  const maxY = doc.page.height - PAGE.bottom

  if (doc.y + neededHeight > maxY) {
    doc.addPage()
    paintPageBackground(doc)
    doc.y = PAGE.top
  }
}

function addIntroText(doc: PdfDoc): void {
  const x = PAGE.marginX
  const width = doc.page.width - PAGE.marginX * 2
  const y = doc.y
  const text =
    'Dieses Dokument fasst Ihre eingegebenen Daten und die empfohlene Versorgung zusammen.'

  doc
    .fillColor(THEME.text)
    .font('Helvetica')
    .fontSize(9.5)
    .text(text, x, y, {
      width,
    })

  doc.y += 16
}

/**
 * Strips Markdown URLs before measuring card height.
 *
 * The visible PDF text only displays link labels, so measurement must use the
 * same text that will be rendered to avoid oversized cards.
 */
function removeMarkdownLinkUrls(value: string): string {
  return value.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
}

/**
 * Renders one line of text with inline clickable links.
 *
 * PDFKit does not parse Markdown links automatically, so this function splits
 * the line into styled text runs and attaches link targets manually.
 */
function renderTextWithLinks(
  doc: PdfDoc,
  line: string,
  contentX: number,
  contentWidth: number,
  startsNewLine = true,
): void {
  const linkPattern =
    /(unter gesund\.bund\.de)|(gesund\.bund\.de)|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  const parts: Array<{
    text: string
    url?: string
  }> = []

  let lastIndex = 0
  let match: RegExpExecArray | null

  // Split linkable phrases from plain text because PDFKit applies link styling per text run.
  while ((match = linkPattern.exec(line)) !== null) {
    const linkText = match[1] ?? match[2] ?? match[3] ?? ''
    const linkUrl = match[4] ?? EMERGENCY_INFO_URL
    const beforeLink = line.slice(lastIndex, match.index)

    if (beforeLink.length > 0) {
      parts.push({ text: beforeLink })
    }

    parts.push({
      text: linkText,
      url: linkUrl,
    })

    lastIndex = match.index + match[0].length
  }

  const remainingText = line.slice(lastIndex)

  if (remainingText.length > 0) {
    parts.push({ text: remainingText })
  }

  if (parts.length === 0) {
    doc
      .fillColor(THEME.text)
      .font('Helvetica')
      .fontSize(10)
      .text(line, contentX, doc.y, {
        width: contentWidth,
        lineGap: 4,
      })
    return
  }

  parts.forEach((part, index) => {
    const isFirst = index === 0
    const isLast = index === parts.length - 1

    const startsAtExplicitPosition = startsNewLine && isFirst
    const xPosition = startsAtExplicitPosition ? contentX : undefined
    const yPosition = startsAtExplicitPosition ? doc.y : undefined
    const layoutOptions = startsAtExplicitPosition
      ? {
          width: contentWidth,
          lineGap: 4,
        }
      : {}

    if (part.url) {
      const linkedTextPrefix = 'unter '

      if (part.text.startsWith(linkedTextPrefix)) {
        doc
          .fillColor(THEME.text)
          .font('Helvetica')
          .fontSize(10)
          .text(
            `${linkedTextPrefix.trimEnd()}\u00A0`,
            xPosition,
            yPosition,
            {
              ...layoutOptions,
              continued: true,
            },
          )
          .fillColor(THEME.darkBlue)
          .font('Helvetica-Bold')
          .text(part.text.slice(linkedTextPrefix.length), {
            continued: !isLast,
            link: part.url,
            underline: true,
          })

        return
      }

      doc
        .fillColor(THEME.darkBlue)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(part.text, xPosition, yPosition, {
          ...layoutOptions,
          continued: !isLast,
          link: part.url,
          underline: true,
        })
    } else {
      doc
        .fillColor(THEME.text)
        .font('Helvetica')
        .fontSize(10)
        .text(part.text, xPosition, yPosition, {
          ...layoutOptions,
          continued: !isLast,
        })
    }
  })

  doc.fillColor(THEME.text).font('Helvetica').fontSize(10)
}

/**
 * Draws one rounded PDF section card and renders its formatted text.
 *
 * Height is calculated before drawing because PDFKit cannot auto-layout a card
 * background around content after the text has already been written.
 */
function addSectionCard(
  doc: PdfDoc,
  section: PdfSection,
  options?: {
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

  const displayContent = removeMarkdownLinkUrls(section.content)

  doc.font('Helvetica').fontSize(10)

  const contentHeight = doc.heightOfString(displayContent, {
    width: contentWidth,
    lineGap: 4,
  })

  const cardHeight = padding + titleHeight + 8 + contentHeight + padding + 8

  ensureSpace(doc, cardHeight + 14)

  const y = doc.y
  const backgroundColor = options?.backgroundColor ?? THEME.card
  const borderColor = options?.borderColor ?? THEME.border
  const titleColor = options?.titleColor ?? THEME.darkBlue

  doc.roundedRect(x, y, width, cardHeight, 12).fill(backgroundColor)

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

  doc.fillColor(THEME.text).font('Helvetica').fontSize(10)

  const contentX = x + padding
  doc.y = y + padding + titleHeight + 8

  section.content.split('\n').forEach((line) => {
    if (line.trim().length === 0) {
      doc.moveDown(1)
      return
    }

    const headingMatch = line.trim().match(/^([^:]+:)(\s*)(.*)$/)

    // Render "Label: value" lines with bold labels while keeping inline links clickable.
    if (headingMatch) {
      const prefix = headingMatch[1] ?? ''
      const spacing = headingMatch[2] ?? ''
      const rest = headingMatch[3] ?? ''

      doc
        .fillColor(THEME.text)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(prefix, contentX, doc.y, {
          width: contentWidth,
          lineGap: 4,
          continued: rest.length > 0,
        })

      if (rest.length > 0) {
        renderTextWithLinks(doc, `${spacing}${rest}`, contentX, contentWidth, false)
      }

      doc.fillColor(THEME.text).font('Helvetica').fontSize(10)
      return
    }

    renderTextWithLinks(doc, line, contentX, contentWidth)
  })

  doc.y = y + cardHeight + 14
}

/**
 * Draws all visible PDF content before page numbers are added.
 *
 * The warning section receives separate colors here so the data-building layer
 * does not need to know about presentation styling.
 */
function addPdfContent(
  doc: PdfDoc,
  request: PdfExportRequest,
  sections: PdfSection[],
  generatedAt: string,
): void {
  paintPageBackground(doc)
  addHeader(doc, generatedAt, request.triage)

  doc.y = 154

  addIntroText(doc)

  sections.forEach((section) => {
    const isWarning = section.title === 'Wichtiger Hinweis'

    addSectionCard(doc, section, {
      backgroundColor: isWarning ? THEME.warningLight : THEME.card,
      borderColor: isWarning ? THEME.warningBorder : THEME.border,
      titleColor: isWarning ? THEME.warning : THEME.darkBlue,
    })
  })
}

/**
 * Adds final page numbers to every buffered page.
 *
 * This function must run after addPdfContent because it switches between pages
 * that PDFKit has already buffered.
 */
function addPageNumbers(doc: PdfDoc): void {
  const range = doc.bufferedPageRange()
  const totalPages = range.count

  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index)
    addFooter(doc, index + 1, totalPages)
  }
}

/**
 * Public PDF export entry point.
 *
 * It builds sections, renders the buffered PDF, adds page numbers, and returns
 * a base64 payload that the frontend can download without handling binary data.
 */
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
      Creator: 'HeptaCheck',
      Producer: 'HeptaCheck',
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

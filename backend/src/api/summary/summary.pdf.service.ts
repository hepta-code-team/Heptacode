import PDFDocument from 'pdfkit'
import type { SummaryResponse } from './summary.types.js'

export function createSummaryPdfBuffer(summary: SummaryResponse): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    })

    const chunks: Buffer[] = []

    doc.on('data', (chunk) => {
      chunks.push(chunk as Buffer)
    })

    doc.on('end', () => {
      resolve(Buffer.concat(chunks))
    })

    doc.on('error', (error) => {
      reject(error)
    })

    doc.fontSize(20).text('KI Review Summary', { align: 'center' })
    doc.moveDown()

    doc.fontSize(12).text(`Summary-ID: ${summary.summaryId}`)
    doc.moveDown()

    if (summary.triage) {
      doc.fontSize(16).text('Triage-Einstufung')
      doc.moveDown(0.5)

      doc.fontSize(12).text(`Care Level: ${formatCareLevel(summary.triage.careLevel)}`)
      doc.text(`Empfohlene Fachrichtung: ${summary.triage.recommendedSpecialty}`)

      doc.moveDown(0.5)
      doc.text('Begründung:')

      if (summary.triage.reasons.length > 0) {
        summary.triage.reasons.forEach((reason) => {
          doc.text(`- ${reason}`)
        })
      } else {
        doc.text('- Keine Begründung übergeben.')
      }

      doc.moveDown()
    }

    doc.fontSize(16).text('Laienverständliche Zusammenfassung')
    doc.moveDown(0.5)
    doc.fontSize(12).text(summary.aiReviewSummary.plainLanguage, {
      align: 'left',
    })
    doc.moveDown()

    doc.fontSize(16).text('Medizinisch strukturierte Zusammenfassung')
    doc.moveDown(0.5)
    doc.fontSize(12).text(summary.aiReviewSummary.professionalSummary, {
      align: 'left',
    })
    doc.moveDown()

    doc.fontSize(16).text('FHIR-Hinweis')
    doc.moveDown(0.5)
    doc.fontSize(12).text(`Resource Type: ${summary.fhirPreview.resourceType}`)
    doc.text(`Type: ${summary.fhirPreview.type}`)
    doc.text(summary.fhirPreview.note)
    doc.moveDown()

    doc.fontSize(10).text(summary.safetyNotice, {
      align: 'left',
    })

    doc.end()
  })
}

function formatCareLevel(careLevel: string): string {
  switch (careLevel) {
    case 'emergency':
      return 'Notfallversorgung'
    case 'doctor':
      return 'ärztliche Abklärung'
    case 'selfcare':
      return 'Selbstversorgung'
    default:
      return careLevel
  }
}
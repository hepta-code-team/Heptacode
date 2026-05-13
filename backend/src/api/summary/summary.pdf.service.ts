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
    doc.text(`Dringlichkeitsstufe: ${summary.urgencyLevel}`)
    doc.text(`Human Review erforderlich: ${summary.humanReviewRequired ? 'Ja' : 'Nein'}`)
    doc.moveDown()

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

    doc.fontSize(16).text('Erkannte Warnsignale')
    doc.moveDown(0.5)

    if (summary.aiReviewSummary.detectedRedFlags.length > 0) {
      summary.aiReviewSummary.detectedRedFlags.forEach((redFlag) => {
        doc.fontSize(12).text(`- ${redFlag}`)
      })
    } else {
      doc.fontSize(12).text('Keine Warnsignale erkannt.')
    }

    doc.moveDown()

    doc.fontSize(16).text('Fehlende Informationen')
    doc.moveDown(0.5)

    if (summary.aiReviewSummary.missingInformation.length > 0) {
      summary.aiReviewSummary.missingInformation.forEach((item) => {
        doc.fontSize(12).text(`- ${item}`)
      })
    } else {
      doc.fontSize(12).text('Keine fehlenden Informationen.')
    }

    doc.moveDown()

    doc.fontSize(16).text('Empfehlung')
    doc.moveDown(0.5)
    doc.fontSize(12).text(`Nächster Schritt: ${summary.recommendation.nextStep}`)
    doc.text(summary.recommendation.message)
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
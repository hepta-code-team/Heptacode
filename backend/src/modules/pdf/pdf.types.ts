import { z } from 'zod'
import { assessmentSchema, type Assessment } from '../triage/triage.types.js'

export interface PdfSection {
  title: string
  content: string
}

export interface PdfExportRequest {
  assessment: Assessment
}

export interface PdfExportResult {
  fileName: string
  mimeType: 'application/pdf'
  contentBase64: string
  generatedAt: string
  sections: PdfSection[]
}

export const pdfExportRequestSchema = z.object({
  assessment: assessmentSchema,
})

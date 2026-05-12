import { z } from 'zod'
import { patientDataSchema, triageSymptomSchema, type PatientData, type TriageSymptom } from '../triage/triage.types.js'

export interface PdfSection {
  title: string
  content: string
}

export interface PdfAssessment {
  patientData?: PatientData
  symptoms: TriageSymptom[]
}

export interface PdfExportRequest {
  assessment: PdfAssessment
}

export interface PdfExportResult {
  fileName: string
  mimeType: 'application/pdf'
  contentBase64: string
  generatedAt: string
  sections: PdfSection[]
}

export const pdfAssessmentSchema = z.object({
  patientData: patientDataSchema.optional(),
  symptoms: z.array(triageSymptomSchema).max(3),
})

export const pdfExportRequestSchema = z.object({
  assessment: pdfAssessmentSchema,
})

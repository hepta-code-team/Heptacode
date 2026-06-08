import { z } from 'zod'
import { CARE_LEVELS } from '../../../../shared/result.types.js'
import type { CareLevel, MedicalSpecialty } from '../../../../shared/result.types.js'
import type { PatientData } from '../../../../shared/patientData.types.js'
import type { TriageSymptom } from '../../../../shared/symptom.types.js'
import { patientDataSchema, triageSymptomSchema, reviewSummarySchema, medicalSpecialtySchema } from '../triage/triage.types.js'
import type { ReviewSummary } from '../triage/triage.types.js'

export interface PdfSection {
  title: string
  content: string
}

export type PdfReviewSummary = ReviewSummary

export interface PdfTriageResult {
  careLevel: CareLevel
  recommendedSpecialty?: MedicalSpecialty
  reasons: string[]
}

export interface PdfExportRequest {
  reviewSummary: PdfReviewSummary
  triage?: PdfTriageResult
  patientData?: PatientData
  symptoms?: TriageSymptom[]
}

export interface PdfExportResult {
  fileName: string
  mimeType: 'application/pdf'
  contentBase64: string
  generatedAt: string
  sections: PdfSection[]
}

export const pdfTriageResultSchema = z.object({
  careLevel: z.enum(CARE_LEVELS),
  recommendedSpecialty: medicalSpecialtySchema.optional(),
  reasons: z.array(z.string().min(1)).max(5),
})

export const pdfExportRequestSchema = z.object({
  reviewSummary: reviewSummarySchema,
  triage: pdfTriageResultSchema.optional(),
  patientData: patientDataSchema.optional(),
  symptoms: z.array(triageSymptomSchema).max(3).optional(),
})

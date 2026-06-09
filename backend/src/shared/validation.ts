import { z } from 'zod'
import {
  careLevelSchema,
  medicalSpecialtySchema,
  reviewSummarySchema,
} from '../modules/triage/triage.types.js'

// Central validation for triage AI responses so the same response shape can be reused.
export const triageAiResponseSchema = z
  .object({
    careLevel: careLevelSchema,
    recommendedSpecialty: medicalSpecialtySchema.nullish().transform((value) => value ?? undefined),
    reasons: z
      .union([z.array(z.string().trim().min(1)).min(1).max(5), z.string().trim().min(1)])
      .transform((value) => (typeof value === 'string' ? [value] : value)),
    reviewSummary: reviewSummarySchema,
  })
  .superRefine((value, ctx) => {
    if (value.careLevel === 'specialist' && value.recommendedSpecialty === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recommendedSpecialty'],
        message: 'recommendedSpecialty ist erforderlich, wenn careLevel specialist ist',
      })
    }
  })
  .transform((value) => ({
    ...value,
    recommendedSpecialty:
      value.careLevel === 'specialist' ? value.recommendedSpecialty : undefined,
  }))

export type TriageAiResponse = z.infer<typeof triageAiResponseSchema>

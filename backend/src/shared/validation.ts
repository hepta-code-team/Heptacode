import { z } from 'zod'
import {
  careLevelSchema,
  medicalSpecialtySchema,
  reviewSummarySchema,
} from '../modules/triage/triage.types.js'
import type { MedicalSpecialty } from '../modules/triage/triage.types.js'

const NON_SPECIALIST_SPECIALTIES: MedicalSpecialty[] = [
  'home_care',
  'emergency_medicine',
  'general_practice',
]

function isSpecialistSpecialty(
  specialty: MedicalSpecialty | undefined,
): specialty is MedicalSpecialty {
  return specialty !== undefined && !NON_SPECIALIST_SPECIALTIES.includes(specialty)
}

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

    if (value.careLevel === 'specialist' && !isSpecialistSpecialty(value.recommendedSpecialty)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recommendedSpecialty'],
        message: 'recommendedSpecialty muss fuer careLevel specialist eine fachaerztliche Disziplin sein',
      })
    }
  })
  .transform((value) => {
    if (value.careLevel !== 'specialist' && isSpecialistSpecialty(value.recommendedSpecialty)) {
      return {
        ...value,
        careLevel: 'specialist' as const,
        recommendedSpecialty: value.recommendedSpecialty,
      }
    }

    return {
      ...value,
      recommendedSpecialty:
        value.careLevel === 'specialist' ? value.recommendedSpecialty : undefined,
    }
  })

export type TriageAiResponse = z.infer<typeof triageAiResponseSchema>

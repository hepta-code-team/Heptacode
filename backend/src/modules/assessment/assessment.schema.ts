import { z } from "zod";

export const assessmentRequestSchema = z
  .object({
    symptoms: z
      .array(z.string().min(1))
      .min(1, "At least one symptom is required"),

    triageLevel: z.string().min(1, "Triage level is required"),

    recommendation: z.string().optional(),

    reviewSummary: z.string().optional(),
  })
  .strict();

export type AssessmentRequestBody = z.infer<typeof assessmentRequestSchema>;
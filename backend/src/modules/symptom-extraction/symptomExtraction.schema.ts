import { z } from "zod";

export const symptomExtractionRequestSchema = z
  .object({
    freeText: z
      .string()
      .min(1, "Free text is required")
      .max(5000, "Free text is too long"),

    language: z.string().optional(),
  })
  .strict();

export type SymptomExtractionRequestBody = z.infer<
  typeof symptomExtractionRequestSchema
>;
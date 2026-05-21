import { z } from "zod";

export const triageRequestSchema = z
  .object({
    symptoms: z
      .array(z.string().min(1, "Symptom must not be empty"))
      .min(1, "At least one symptom is required"),

    age: z
      .number()
      .int("Age must be an integer")
      .min(0, "Age must not be negative")
      .max(120, "Age must not be greater than 120"),

    gender: z.string().optional(),

    painLevel: z
      .number()
      .int()
      .min(0, "Pain level must be at least 0")
      .max(10, "Pain level must be at most 10")
      .optional(),

    freeText: z.string().optional(),
  })
  .strict();

export type TriageRequestBody = z.infer<typeof triageRequestSchema>;
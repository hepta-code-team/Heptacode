import { z } from "zod";

export const pdfExportRequestSchema = z
  .object({
    reviewSummary: z.string().min(1, "Review summary is required"),

    triageResult: z.unknown().optional(),

    patientData: z.unknown().optional(),
  })
  .strict();

export type PdfExportRequestBody = z.infer<typeof pdfExportRequestSchema>;

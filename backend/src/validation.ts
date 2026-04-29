import { z } from "zod";

export const rewriteActions = ["fix_grammar", "professional", "casual", "shorter", "clearer"] as const;
export const editorTypes = ["input", "textarea", "contenteditable"] as const;

const installIdSchema = z.string().trim().min(12).max(80).regex(/^[a-zA-Z0-9_-]+$/);

const optionalString = (max: number) => z.string().trim().max(max).optional();

export const rewriteRequestSchema = z.object({
  installId: installIdSchema,
  text: z.string().trim().min(3).max(500),
  action: z.enum(rewriteActions).optional(),
  instruction: z
    .string()
    .trim()
    .max(240)
    .refine((value) => countWords(value) <= 30, "Instruction must be 30 words or fewer.")
    .optional(),
  source: z
    .object({
      origin: optionalString(255),
      hostname: optionalString(255),
      editorType: z.enum(editorTypes).optional()
    })
    .optional()
});

export const memoryParamsSchema = z.object({
  installId: installIdSchema
});

export const updateMemoryRequestSchema = z.object({
  memory: z.string().trim().max(500).nullable()
});

export function countWords(value: string | undefined) {
  if (!value) {
    return 0;
  }

  return value.split(/\s+/).filter(Boolean).length;
}

export type RewriteAction = (typeof rewriteActions)[number];
export type RewriteRequest = z.infer<typeof rewriteRequestSchema>;
export type UpdateMemoryRequest = z.infer<typeof updateMemoryRequestSchema>;

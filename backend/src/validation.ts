import { z } from "zod";

export const rewriteActions = ["fix_grammar", "professional", "casual", "shorter", "clearer"] as const;

export const rewriteRequestSchema = z.object({
  text: z.string().trim().min(3).max(8000),
  action: z.enum(rewriteActions)
});

export type RewriteAction = (typeof rewriteActions)[number];
export type RewriteRequest = z.infer<typeof rewriteRequestSchema>;

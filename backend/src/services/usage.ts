import { db } from "../db/index.js";
import { rewriteEvents } from "../db/schema.js";

interface RewriteEventInput {
  action?: string;
  cacheHit: boolean;
  editorType?: string;
  errorCode?: string;
  estimatedCostUsd: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  hasInstruction: boolean;
  hostname?: string;
  inputChars: number;
  installId: string;
  instructionWords: number;
  latencyMs: number;
  requestId: string;
  status: "failed" | "success";
}

export async function logRewriteEvent(event: RewriteEventInput) {
  try {
    await db.insert(rewriteEvents).values({
      action: event.action,
      cacheHit: event.cacheHit,
      editorType: event.editorType,
      errorCode: event.errorCode,
      estimatedCostUsd: event.estimatedCostUsd.toFixed(8),
      estimatedInputTokens: event.estimatedInputTokens,
      estimatedOutputTokens: event.estimatedOutputTokens,
      hasInstruction: event.hasInstruction,
      hostname: event.hostname,
      inputChars: event.inputChars,
      installId: event.installId,
      instructionWords: event.instructionWords,
      latencyMs: event.latencyMs,
      requestId: event.requestId,
      status: event.status
    });
  } catch (error) {
    console.error("Rewrite event log failed", error);
  }
}

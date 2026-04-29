import { randomUUID } from "node:crypto";

import { ApiError } from "../api.js";
import { runInBackground } from "../background.js";
import { estimateOpenAICost, estimateTokens } from "../cost.js";
import { cacheHash } from "../keys.js";
import { rewriteWithOpenAI } from "../openai.js";
import type { RewriteRequest } from "../validation.js";
import { countWords } from "../validation.js";
import { getCachedRewrite, setCachedRewrite } from "./cache.js";
import { acquireRewriteLock, releaseRewriteLock } from "./lock.js";
import { getLearnedBehavior, getMemory } from "./memory.js";
import { consumeDailyQuota } from "./quota.js";
import { logRewriteEvent } from "./usage.js";
import { recordWritingBehavior } from "./behavior.js";

interface RewriteResult {
  cached: boolean;
  remainingToday: number;
  requestId: string;
  result: string;
  resetAt: number;
}

export async function rewrite(payload: RewriteRequest, requestId = randomUUID()): Promise<RewriteResult> {
  const startedAt = Date.now();
  const quota = await consumeDailyQuota(payload.installId);
  const memory = await getMemory(payload.installId);
  const behavior = await getLearnedBehavior(payload.installId);
  const hash = cacheHash(payload, memory, behavior);
  const estimatedInputTokens = estimateTokens([payload.text, payload.instruction, memory, behavior].filter(Boolean).join("\n"));
  const instructionWords = countWords(payload.instruction);

  const cached = await getCachedRewrite(hash);
  if (cached) {
    runInBackground(() => logRewriteEvent({
      action: payload.action,
      cacheHit: true,
      editorType: payload.source?.editorType,
      estimatedCostUsd: 0,
      estimatedInputTokens,
      estimatedOutputTokens: estimateTokens(cached),
      hasInstruction: Boolean(payload.instruction),
      hostname: payload.source?.hostname,
      inputChars: payload.text.length,
      installId: payload.installId,
      instructionWords,
      latencyMs: Date.now() - startedAt,
      requestId,
      status: "success"
    }), "Rewrite cache-hit log");
    runInBackground(() => recordWritingBehavior({ cacheHit: true, latencyMs: Date.now() - startedAt, payload }), "Writing behavior cache-hit sync");

    return {
      cached: true,
      remainingToday: quota.remaining,
      requestId,
      resetAt: quota.resetAt,
      result: cached
    };
  }

  const lock = await acquireRewriteLock(hash);

  try {
    if (!lock) {
      await wait(350);
      const retryCached = await getCachedRewrite(hash);
      if (retryCached) {
        runInBackground(() => logRewriteEvent({
          action: payload.action,
          cacheHit: true,
          editorType: payload.source?.editorType,
          estimatedCostUsd: 0,
          estimatedInputTokens,
          estimatedOutputTokens: estimateTokens(retryCached),
          hasInstruction: Boolean(payload.instruction),
          hostname: payload.source?.hostname,
          inputChars: payload.text.length,
          installId: payload.installId,
          instructionWords,
          latencyMs: Date.now() - startedAt,
          requestId,
          status: "success"
        }), "Rewrite duplicate cache-hit log");
        runInBackground(() => recordWritingBehavior({ cacheHit: true, latencyMs: Date.now() - startedAt, payload }), "Writing behavior duplicate cache-hit sync");

        return {
          cached: true,
          remainingToday: quota.remaining,
          requestId,
          resetAt: quota.resetAt,
          result: retryCached
        };
      }

      throw new ApiError(503, "service_unavailable", "A matching rewrite is already in progress. Try again shortly.");
    }

    const openAiResult = await rewriteWithOpenAI({
      action: payload.action,
      behavior,
      instruction: payload.instruction,
      memory,
      text: payload.text
    });
    const estimatedOutputTokens = openAiResult.outputTokens ?? estimateTokens(openAiResult.text);
    const estimatedCostUsd = estimateOpenAICost(openAiResult.inputTokens ?? estimatedInputTokens, estimatedOutputTokens);

    await setCachedRewrite(hash, openAiResult.text);
    runInBackground(() => logRewriteEvent({
      action: payload.action,
      cacheHit: false,
      editorType: payload.source?.editorType,
      estimatedCostUsd,
      estimatedInputTokens: openAiResult.inputTokens ?? estimatedInputTokens,
      estimatedOutputTokens,
      hasInstruction: Boolean(payload.instruction),
      hostname: payload.source?.hostname,
      inputChars: payload.text.length,
      installId: payload.installId,
      instructionWords,
      latencyMs: Date.now() - startedAt,
      requestId,
      status: "success"
    }), "Rewrite success log");
    runInBackground(() => recordWritingBehavior({ cacheHit: false, latencyMs: Date.now() - startedAt, payload }), "Writing behavior success sync");

    return {
      cached: false,
      remainingToday: quota.remaining,
      requestId,
      resetAt: quota.resetAt,
      result: openAiResult.text
    };
  } catch (error) {
    runInBackground(() => logRewriteEvent({
      action: payload.action,
      cacheHit: false,
      editorType: payload.source?.editorType,
      errorCode: error instanceof ApiError ? error.code : "ai_failed",
      estimatedCostUsd: 0,
      estimatedInputTokens,
      estimatedOutputTokens: 0,
      hasInstruction: Boolean(payload.instruction),
      hostname: payload.source?.hostname,
      inputChars: payload.text.length,
      installId: payload.installId,
      instructionWords,
      latencyMs: Date.now() - startedAt,
      requestId,
      status: "failed"
    }), "Rewrite failure log");

    throw error;
  } finally {
    await releaseRewriteLock(lock);
  }
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

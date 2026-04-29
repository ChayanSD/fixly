import { sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { writingBehaviorDaily, writingProfiles } from "../db/schema.js";
import type { RewriteRequest } from "../validation.js";

interface BehaviorEventInput {
  cacheHit: boolean;
  latencyMs: number;
  payload: RewriteRequest;
}

interface ProfileSignal {
  casual: number;
  clarity: number;
  formality: number;
  professional: number;
  shorter: number;
}

export async function recordWritingBehavior({ cacheHit, latencyMs, payload }: BehaviorEventInput) {
  const signal = getProfileSignal(payload);
  const now = new Date();
  const hostname = payload.source?.hostname ?? "unknown";
  const action = payload.action ?? "auto_fix";
  const hasInstruction = Boolean(payload.instruction);

  await Promise.all([
    db
      .insert(writingProfiles)
      .values({
        casualScore: signal.casual,
        clarityScore: signal.clarity,
        commonContext: inferContext(payload),
        formalityScore: signal.formality,
        installId: payload.installId,
        preferredLength: signal.shorter > 0 ? "concise" : "normal",
        preferredTone: inferTone(signal),
        professionalScore: signal.professional,
        shorterScore: signal.shorter,
        updatedAt: now
      })
      .onConflictDoUpdate({
        set: {
          casualScore: sql`${writingProfiles.casualScore} + ${signal.casual}`,
          clarityScore: sql`${writingProfiles.clarityScore} + ${signal.clarity}`,
          commonContext: inferContext(payload),
          formalityScore: sql`${writingProfiles.formalityScore} + ${signal.formality}`,
          preferredLength: sql`case when ${writingProfiles.shorterScore} + ${signal.shorter} > 2 then 'concise' else ${writingProfiles.preferredLength} end`,
          preferredTone: inferTone(signal),
          professionalScore: sql`${writingProfiles.professionalScore} + ${signal.professional}`,
          shorterScore: sql`${writingProfiles.shorterScore} + ${signal.shorter}`,
          updatedAt: now
        },
        target: writingProfiles.installId
      }),
    db
      .insert(writingBehaviorDaily)
      .values({
        action,
        cacheHitCount: cacheHit ? 1 : 0,
        customInstructionCount: hasInstruction ? 1 : 0,
        day: now.toISOString().slice(0, 10),
        hostname,
        installId: payload.installId,
        rewriteCount: 1,
        totalInputChars: payload.text.length,
        totalLatencyMs: latencyMs,
        updatedAt: now
      })
      .onConflictDoUpdate({
        set: {
          cacheHitCount: sql`${writingBehaviorDaily.cacheHitCount} + ${cacheHit ? 1 : 0}`,
          customInstructionCount: sql`${writingBehaviorDaily.customInstructionCount} + ${hasInstruction ? 1 : 0}`,
          rewriteCount: sql`${writingBehaviorDaily.rewriteCount} + 1`,
          totalInputChars: sql`${writingBehaviorDaily.totalInputChars} + ${payload.text.length}`,
          totalLatencyMs: sql`${writingBehaviorDaily.totalLatencyMs} + ${latencyMs}`,
          updatedAt: now
        },
        target: [writingBehaviorDaily.installId, writingBehaviorDaily.day, writingBehaviorDaily.hostname, writingBehaviorDaily.action]
      })
  ]);
}

export function summarizeLearnedBehavior(profile: {
  casualScore: number;
  clarityScore: number;
  commonContext: string;
  formalityScore: number;
  preferredLength: string;
  preferredTone: string;
  professionalScore: number;
  shorterScore: number;
} | null) {
  if (!profile) {
    return null;
  }

  const preferences: string[] = [];
  if (profile.preferredTone !== "neutral") {
    preferences.push(`Often prefers ${profile.preferredTone.replace(/_/g, " ")} wording.`);
  }

  if (profile.preferredLength === "concise" || profile.shorterScore > 2) {
    preferences.push("Often prefers concise rewrites.");
  }

  if (profile.commonContext !== "general") {
    preferences.push(`Often writes in a ${profile.commonContext} context.`);
  }

  if (profile.clarityScore > 2) {
    preferences.push("Often values clarity and easy-to-read wording.");
  }

  return preferences.length > 0 ? preferences.join(" ") : null;
}

function getProfileSignal(payload: RewriteRequest): ProfileSignal {
  const instruction = payload.instruction?.toLowerCase() ?? "";

  return {
    casual: Number(payload.action === "casual") + keywordScore(instruction, ["casual", "friend", "whatsapp", "chat"]),
    clarity: Number(payload.action === "clearer") + keywordScore(instruction, ["clear", "simple", "easy"]),
    formality: keywordScore(instruction, ["boss", "client", "work", "formal", "email"]),
    professional: Number(payload.action === "professional") + keywordScore(instruction, ["professional", "polite", "boss", "client"]),
    shorter: Number(payload.action === "shorter") + keywordScore(instruction, ["short", "brief", "concise"])
  };
}

function inferContext(payload: RewriteRequest) {
  const instruction = payload.instruction?.toLowerCase() ?? "";
  const hostname = payload.source?.hostname?.toLowerCase() ?? "";

  if (instruction.includes("boss") || instruction.includes("client") || instruction.includes("email")) {
    return "work";
  }

  if (instruction.includes("whatsapp") || hostname.includes("whatsapp") || instruction.includes("friend")) {
    return "chat";
  }

  return "general";
}

function inferTone(signal: ProfileSignal) {
  if (signal.professional + signal.formality > signal.casual) {
    return "friendly_professional";
  }

  if (signal.casual > 0) {
    return "casual";
  }

  return "neutral";
}

function keywordScore(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword)) ? 1 : 0;
}

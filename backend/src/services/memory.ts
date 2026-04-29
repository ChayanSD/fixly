import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { installations, writingProfiles } from "../db/schema.js";
import { summarizeLearnedBehavior } from "./behavior.js";

export async function ensureInstallation(installId: string) {
  await db
    .insert(installations)
    .values({ installId })
    .onConflictDoNothing({ target: installations.installId });
}

export async function getMemory(installId: string) {
  await ensureInstallation(installId);

  const [installation] = await db
    .select({ memory: installations.memory })
    .from(installations)
    .where(eq(installations.installId, installId))
    .limit(1);

  return installation?.memory ?? null;
}

export async function updateMemory(installId: string, memory: string | null) {
  await db
    .insert(installations)
    .values({ installId, memory, updatedAt: new Date() })
    .onConflictDoUpdate({
      set: { memory, updatedAt: new Date() },
      target: installations.installId
    });

  return memory;
}

export async function getLearnedBehavior(installId: string) {
  const [profile] = await db
    .select({
      casualScore: writingProfiles.casualScore,
      clarityScore: writingProfiles.clarityScore,
      commonContext: writingProfiles.commonContext,
      formalityScore: writingProfiles.formalityScore,
      preferredLength: writingProfiles.preferredLength,
      preferredTone: writingProfiles.preferredTone,
      professionalScore: writingProfiles.professionalScore,
      shorterScore: writingProfiles.shorterScore
    })
    .from(writingProfiles)
    .where(eq(writingProfiles.installId, installId))
    .limit(1);

  return summarizeLearnedBehavior(profile ?? null);
}

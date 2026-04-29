import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { installations } from "../db/schema.js";

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

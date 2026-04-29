import { boolean, date, index, integer, numeric, pgTable, primaryKey, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const installations = pgTable("installations", {
  installId: varchar("install_id", { length: 80 }).primaryKey(),
  memory: text("memory"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const rewriteEvents = pgTable(
  "rewrite_events",
  {
    id: serial("id").primaryKey(),
    requestId: varchar("request_id", { length: 64 }).notNull(),
    installId: varchar("install_id", { length: 80 }).notNull(),
    action: varchar("action", { length: 32 }),
    hasInstruction: boolean("has_instruction").default(false).notNull(),
    hostname: varchar("hostname", { length: 255 }),
    editorType: varchar("editor_type", { length: 32 }),
    inputChars: integer("input_chars").notNull(),
    instructionWords: integer("instruction_words").default(0).notNull(),
    estimatedInputTokens: integer("estimated_input_tokens").default(0).notNull(),
    estimatedOutputTokens: integer("estimated_output_tokens").default(0).notNull(),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 12, scale: 8 }).default("0").notNull(),
    latencyMs: integer("latency_ms").default(0).notNull(),
    cacheHit: boolean("cache_hit").default(false).notNull(),
    status: varchar("status", { length: 24 }).notNull(),
    errorCode: varchar("error_code", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    requestIdIdx: uniqueIndex("rewrite_events_request_id_idx").on(table.requestId),
    installIdIdx: index("rewrite_events_install_id_idx").on(table.installId),
    createdAtIdx: index("rewrite_events_created_at_idx").on(table.createdAt),
    hostnameIdx: index("rewrite_events_hostname_idx").on(table.hostname)
  })
);

export const writingProfiles = pgTable("writing_profiles", {
  installId: varchar("install_id", { length: 80 }).primaryKey(),
  preferredTone: varchar("preferred_tone", { length: 48 }).default("neutral").notNull(),
  preferredLength: varchar("preferred_length", { length: 32 }).default("normal").notNull(),
  emojiPreference: varchar("emoji_preference", { length: 32 }).default("neutral").notNull(),
  commonContext: varchar("common_context", { length: 48 }).default("general").notNull(),
  casualScore: integer("casual_score").default(0).notNull(),
  professionalScore: integer("professional_score").default(0).notNull(),
  clarityScore: integer("clarity_score").default(0).notNull(),
  shorterScore: integer("shorter_score").default(0).notNull(),
  formalityScore: integer("formality_score").default(0).notNull(),
  customMemory: text("custom_memory"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const writingBehaviorDaily = pgTable(
  "writing_behavior_daily",
  {
    installId: varchar("install_id", { length: 80 }).notNull(),
    day: date("day").notNull(),
    hostname: varchar("hostname", { length: 255 }).notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    rewriteCount: integer("rewrite_count").default(0).notNull(),
    customInstructionCount: integer("custom_instruction_count").default(0).notNull(),
    totalInputChars: integer("total_input_chars").default(0).notNull(),
    totalLatencyMs: integer("total_latency_ms").default(0).notNull(),
    cacheHitCount: integer("cache_hit_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.installId, table.day, table.hostname, table.action] }),
    dayIdx: index("writing_behavior_daily_day_idx").on(table.day),
    installIdIdx: index("writing_behavior_daily_install_id_idx").on(table.installId)
  })
);

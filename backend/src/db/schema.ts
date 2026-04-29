import { boolean, index, integer, numeric, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

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

CREATE TABLE "installations" (
	"install_id" varchar(80) PRIMARY KEY NOT NULL,
	"memory" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rewrite_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" varchar(64) NOT NULL,
	"install_id" varchar(80) NOT NULL,
	"action" varchar(32),
	"has_instruction" boolean DEFAULT false NOT NULL,
	"hostname" varchar(255),
	"editor_type" varchar(32),
	"input_chars" integer NOT NULL,
	"instruction_words" integer DEFAULT 0 NOT NULL,
	"estimated_input_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_output_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_usd" numeric(12, 8) DEFAULT '0' NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"status" varchar(24) NOT NULL,
	"error_code" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "rewrite_events_request_id_idx" ON "rewrite_events" USING btree ("request_id");
--> statement-breakpoint
CREATE INDEX "rewrite_events_install_id_idx" ON "rewrite_events" USING btree ("install_id");
--> statement-breakpoint
CREATE INDEX "rewrite_events_created_at_idx" ON "rewrite_events" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "rewrite_events_hostname_idx" ON "rewrite_events" USING btree ("hostname");

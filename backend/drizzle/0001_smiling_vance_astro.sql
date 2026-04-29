CREATE TABLE "writing_behavior_daily" (
	"install_id" varchar(80) NOT NULL,
	"day" date NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"action" varchar(32) NOT NULL,
	"rewrite_count" integer DEFAULT 0 NOT NULL,
	"custom_instruction_count" integer DEFAULT 0 NOT NULL,
	"total_input_chars" integer DEFAULT 0 NOT NULL,
	"total_latency_ms" integer DEFAULT 0 NOT NULL,
	"cache_hit_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "writing_behavior_daily_install_id_day_hostname_action_pk" PRIMARY KEY("install_id","day","hostname","action")
);
--> statement-breakpoint
CREATE TABLE "writing_profiles" (
	"install_id" varchar(80) PRIMARY KEY NOT NULL,
	"preferred_tone" varchar(48) DEFAULT 'neutral' NOT NULL,
	"preferred_length" varchar(32) DEFAULT 'normal' NOT NULL,
	"emoji_preference" varchar(32) DEFAULT 'neutral' NOT NULL,
	"common_context" varchar(48) DEFAULT 'general' NOT NULL,
	"casual_score" integer DEFAULT 0 NOT NULL,
	"professional_score" integer DEFAULT 0 NOT NULL,
	"clarity_score" integer DEFAULT 0 NOT NULL,
	"shorter_score" integer DEFAULT 0 NOT NULL,
	"formality_score" integer DEFAULT 0 NOT NULL,
	"custom_memory" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "writing_behavior_daily_day_idx" ON "writing_behavior_daily" USING btree ("day");--> statement-breakpoint
CREATE INDEX "writing_behavior_daily_install_id_idx" ON "writing_behavior_daily" USING btree ("install_id");
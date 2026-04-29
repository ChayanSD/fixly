import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  ALLOWED_ORIGINS: z.string().default(""),
  CORS_ALLOW_ALL: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  DAILY_REWRITE_LIMIT: z.coerce.number().int().positive().default(100),
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_INPUT_COST_PER_1M: z.coerce.number().nonnegative().default(0.75),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  OPENAI_OUTPUT_COST_PER_1M: z.coerce.number().nonnegative().default(4.5),
  PORT: z.coerce.number().int().positive().default(4000),
  REDIS_KEY_PREFIX: z.string().min(1).default("fixly:prod:"),
  REDIS_URL: z.string().min(1),
  REWRITE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86400)
});

export const env = envSchema.parse(process.env);

export const allowedOrigins = env.ALLOWED_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

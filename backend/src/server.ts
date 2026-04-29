import { randomUUID } from "node:crypto";

import cors from "cors";
import express from "express";
import { ZodError } from "zod";

import { ApiError, sendData, sendError, zodDetails } from "./api.js";
import { allowedOrigins, env } from "./env.js";
import { getMemory, updateMemory } from "./services/memory.js";
import { rewrite } from "./services/rewrite.js";
import { memoryParamsSchema, rewriteRequestSchema, updateMemoryRequestSchema } from "./validation.js";

const app = express();

app.use(express.json({ limit: "8kb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      console.warn(`Blocked CORS origin: ${origin}`);
      callback(new Error("Origin not allowed by CORS."));
    }
  })
);

function isAllowedOrigin(origin: string | undefined) {
  if (env.CORS_ALLOW_ALL) {
    return true;
  }

  if (!origin) {
    return true;
  }

  if (
    origin.startsWith("chrome-extension://") ||
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)
  ) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

app.get("/health", (_request, response) => {
  sendData(response, { ok: true });
});

app.get("/test", (_request, response) => {
  response.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fixly Extension Test</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #071327;
        color: #eaf2ff;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      main {
        width: min(720px, calc(100vw - 32px));
      }

      textarea,
      [contenteditable="true"] {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(147, 185, 255, 0.28);
        border-radius: 12px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.08);
        color: #f6fbff;
        font: inherit;
        font-size: 17px;
        line-height: 1.5;
        outline: none;
      }

      textarea {
        min-height: 160px;
        resize: vertical;
      }

      [contenteditable="true"] {
        min-height: 96px;
        margin-top: 16px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Fixly Extension Test</h1>
      <textarea>this are a rough sentence that should sound more better and professional</textarea>
      <div contenteditable="true">select this editable sentence to test contenteditable replacement too</div>
    </main>
  </body>
</html>`);
});

app.post("/api/v1/rewrites", async (request, response) => {
  const requestId = randomUUID();

  try {
    const payload = rewriteRequestSchema.parse(request.body);
    const result = await rewrite(payload, requestId);

    response.setHeader("X-RateLimit-Limit", env.DAILY_REWRITE_LIMIT.toString());
    response.setHeader("X-RateLimit-Remaining", result.remainingToday.toString());
    response.setHeader("X-RateLimit-Reset", result.resetAt.toString());

    sendData(response, {
      cached: result.cached,
      remainingToday: result.remainingToday,
      requestId: result.requestId,
      result: result.result
    });
  } catch (error) {
    if (error instanceof ZodError) {
      sendError(response, 422, "validation_error", "Request validation failed.", requestId, zodDetails(error));
      return;
    }

    if (error instanceof ApiError) {
      if (error.status === 429 && typeof error.details === "object" && error.details !== null && "resetAt" in error.details) {
        response.setHeader("Retry-After", String(Math.max(Number(error.details.resetAt) - Math.floor(Date.now() / 1000), 1)));
      }

      sendError(response, error.status, error.code, error.message, requestId, error.details);
      return;
    }

    console.error("Rewrite failed", error);
    sendError(response, 500, "ai_failed", "Rewrite failed.", requestId);
  }
});

app.post("/api/rewrite", async (request, response) => {
  const requestId = randomUUID();
  const parsed = rewriteRequestSchema.safeParse({
    ...request.body,
    installId: request.body?.installId ?? "legacy-local-install"
  });

  if (!parsed.success) {
    sendError(response, 422, "validation_error", "Request validation failed.", requestId, zodDetails(parsed.error));
    return;
  }

  try {
    const result = await rewrite(parsed.data, requestId);
    response.json({ result: result.result });
  } catch (error) {
    if (error instanceof ApiError) {
      sendError(response, error.status, error.code, error.message, requestId, error.details);
      return;
    }

    console.error("Legacy rewrite failed", error);
    sendError(response, 500, "ai_failed", "Rewrite failed.", requestId);
  }
});

app.get("/api/v1/installations/:installId/memory", async (request, response) => {
  const requestId = randomUUID();

  try {
    const { installId } = memoryParamsSchema.parse(request.params);
    sendData(response, { installId, memory: await getMemory(installId) });
  } catch (error) {
    if (error instanceof ZodError) {
      sendError(response, 422, "validation_error", "Request validation failed.", requestId, zodDetails(error));
      return;
    }

    console.error("Memory read failed", error);
    sendError(response, 500, "service_unavailable", "Memory is temporarily unavailable.", requestId);
  }
});

app.put("/api/v1/installations/:installId/memory", async (request, response) => {
  const requestId = randomUUID();

  try {
    const { installId } = memoryParamsSchema.parse(request.params);
    const { memory } = updateMemoryRequestSchema.parse(request.body);
    sendData(response, { installId, memory: await updateMemory(installId, memory) });
  } catch (error) {
    if (error instanceof ZodError) {
      sendError(response, 422, "validation_error", "Request validation failed.", requestId, zodDetails(error));
      return;
    }

    console.error("Memory update failed", error);
    sendError(response, 500, "service_unavailable", "Memory is temporarily unavailable.", requestId);
  }
});

app.listen(env.PORT, () => {
  console.log(`Fixly backend listening on http://localhost:${env.PORT}`);
});

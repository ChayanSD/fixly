import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { ZodError } from "zod";

import { rewriteText } from "./provider.js";
import { rewriteRequestSchema } from "./validation.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const corsAllowAll = process.env.CORS_ALLOW_ALL === "true";
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json({ limit: "32kb" }));
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
  if (corsAllowAll) {
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
  response.json({ ok: true });
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

app.post("/api/rewrite", async (request, response) => {
  try {
    const payload = rewriteRequestSchema.parse(request.body);
    const result = await rewriteText(payload);
    response.json({ result });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "Invalid request.", details: error.flatten() });
      return;
    }

    console.error("Rewrite failed", error);
    response.status(500).json({ error: "Rewrite failed." });
  }
});

app.listen(port, () => {
  console.log(`Fixly backend listening on http://localhost:${port}`);
});

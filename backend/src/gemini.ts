import type { RewriteAction } from "./validation.js";
import { buildRewritePrompt } from "./prompt.js";

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
}

export async function rewriteWithGemini(text: string, action: RewriteAction) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildRewritePrompt(text, action) }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1200
        }
      })
    }
  );

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Gemini request failed.");
  }

  const result = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!result) {
    throw new Error("Gemini returned an empty response.");
  }

  return result;
}

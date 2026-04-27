import type { RewriteAction } from "./validation.js";
import { buildRewritePrompt } from "./prompt.js";

interface OpenAITextContent {
  type?: string;
  text?: string;
}

interface OpenAIOutputItem {
  type?: string;
  content?: OpenAITextContent[];
}

interface OpenAIResponse {
  output?: OpenAIOutputItem[];
  output_text?: string;
  error?: {
    message?: string;
  };
}

export async function rewriteWithOpenAI(text: string, action: RewriteAction) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: buildRewritePrompt(text, action),
      max_output_tokens: 1200,
      text: {
        format: {
          type: "text"
        }
      }
    })
  });

  const data = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "OpenAI request failed.");
  }

  const result = extractText(data).trim();
  if (!result) {
    throw new Error("OpenAI returned an empty response.");
  }

  return result;
}

function extractText(data: OpenAIResponse) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  return (
    data.output
      ?.flatMap((item) => item.content ?? [])
      .filter((content) => content.type === "output_text" && typeof content.text === "string")
      .map((content) => content.text)
      .join("") ?? ""
  );
}

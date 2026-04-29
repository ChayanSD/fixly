import { ApiError } from "./api.js";
import { env } from "./env.js";
import { buildRewritePrompt } from "./prompt.js";
import type { RewriteAction } from "./validation.js";

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
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    message?: string;
  };
}

interface OpenAIRewriteInput {
  action?: RewriteAction;
  instruction?: string;
  memory?: string | null;
  text: string;
}

export async function rewriteWithOpenAI(input: OpenAIRewriteInput) {
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      signal: AbortSignal.timeout(env.AI_TIMEOUT_MS),
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        input: buildRewritePrompt(input),
        max_output_tokens: 200,
        text: {
          format: {
            type: "text"
          }
        }
      })
    });

    const data = (await response.json()) as OpenAIResponse;

    if (!response.ok) {
      throw new ApiError(502, "ai_failed", data.error?.message ?? "OpenAI request failed.");
    }

    const result = extractText(data).trim();
    if (!result) {
      throw new ApiError(502, "ai_failed", "OpenAI returned an empty response.");
    }

    return {
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      text: result
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(502, "ai_failed", "OpenAI request failed.");
  }
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

import { rewriteWithGemini } from "./gemini.js";
import { rewriteWithOpenAI } from "./openai.js";
import type { RewriteRequest } from "./validation.js";

type AiProvider = "gemini" | "openai";

export async function rewriteText({ text, action }: RewriteRequest) {
  const provider = getProvider();

  if (provider === "openai") {
    return rewriteWithOpenAI(text, action);
  }

  return rewriteWithGemini(text, action);
}

function getProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER ?? "gemini";

  if (provider === "openai" || provider === "gemini") {
    return provider;
  }

  throw new Error("AI_PROVIDER must be either 'gemini' or 'openai'.");
}

import { env } from "./env.js";

export function estimateTokens(value: string) {
  return Math.ceil(value.length / 4);
}

export function estimateOpenAICost(inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * env.OPENAI_INPUT_COST_PER_1M;
  const outputCost = (outputTokens / 1_000_000) * env.OPENAI_OUTPUT_COST_PER_1M;
  return inputCost + outputCost;
}

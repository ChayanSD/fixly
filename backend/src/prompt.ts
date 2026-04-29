import type { RewriteAction } from "./validation.js";

const actionInstructions: Record<RewriteAction, string> = {
  fix_grammar: "Fix grammar, punctuation, and obvious wording issues.",
  professional: "Rewrite it to sound polished, professional, and workplace appropriate.",
  casual: "Rewrite it to sound natural, friendly, and casual.",
  shorter: "Rewrite it to be shorter while preserving the meaning.",
  clearer: "Rewrite it to be clearer and easier to understand."
};

interface RewritePromptInput {
  action?: RewriteAction;
  behavior?: string | null;
  instruction?: string;
  memory?: string | null;
  text: string;
}

export function buildRewritePrompt({ action, behavior, instruction, memory, text }: RewritePromptInput) {
  const intent = action ? actionInstructions[action] : "Fix grammar, spelling, punctuation, and clarity.";
  const extraInstruction = instruction ? `User instruction: ${instruction}` : "";
  const userMemory = memory ? `User writing preferences: ${memory}` : "";
  const learnedBehavior = behavior ? `Learned style hints: ${behavior}` : "";

  return [
    "Rewrite short user-selected text for chats, emails, and everyday professional communication.",
    intent,
    extraInstruction,
    userMemory,
    learnedBehavior,
    "Keep the original meaning.",
    "Do not add fake information.",
    "Always fix grammar and spelling unless the user explicitly asks otherwise.",
    "Return only rewritten text.",
    "No markdown.",
    "No explanation.",
    "",
    "Text:",
    text
  ].join("\n");
}

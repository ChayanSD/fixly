import type { RewriteAction } from "./validation.js";

const actionInstructions: Record<RewriteAction, string> = {
  fix_grammar: "Fix grammar, punctuation, and obvious wording issues.",
  professional: "Rewrite it to sound polished, professional, and workplace appropriate.",
  casual: "Rewrite it to sound natural, friendly, and casual.",
  shorter: "Rewrite it to be shorter while preserving the meaning.",
  clearer: "Rewrite it to be clearer and easier to understand."
};

export function buildRewritePrompt(text: string, action: RewriteAction) {
  return [
    "You rewrite user-selected text.",
    actionInstructions[action],
    "Keep the original meaning.",
    "Do not add fake information.",
    "Fix grammar and clarity where useful.",
    "Return only rewritten text.",
    "No markdown.",
    "No explanation.",
    "",
    "Text:",
    text
  ].join("\n");
}

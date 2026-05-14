export interface PromptInput {
  readonly title: string;
  readonly context: readonly string[];
}

export function buildPlanningPrompt(input: PromptInput): string {
  return [
    `Create an implementation plan for: ${input.title}`,
    "",
    "Context:",
    ...input.context.map((item) => `- ${item}`),
    "",
    "Return assumptions, steps, likely files, commands, risks, and missing information."
  ].join("\n");
}

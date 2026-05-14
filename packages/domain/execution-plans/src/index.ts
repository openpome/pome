export interface ImplementationPlan {
  readonly summary: string;
  readonly assumptions: readonly string[];
  readonly steps: readonly ImplementationStep[];
  readonly filesLikelyChanged: readonly string[];
  readonly commandsToRun: readonly string[];
  readonly risks: readonly string[];
  readonly missingInfo: readonly string[];
}

export interface ImplementationStep {
  readonly id: string;
  readonly title: string;
  readonly detail?: string;
}

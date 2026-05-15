export type WorkItemScopeKind = "board" | "project" | "team" | "custom";

export interface WorkItemScopeConfig {
  readonly providerId: string;
  readonly kind: WorkItemScopeKind;
  readonly scopeId: string;
  readonly displayName: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface OpenPomeConfig {
  readonly configVersion: 1;
  readonly workspaceScanPaths: readonly string[];
  readonly activeWorkItemSource?: string;
  readonly activeWorkItemScope?: WorkItemScopeConfig;
  readonly activeCodeHost?: string;
  readonly activeModelProvider: string;
}

export const defaultConfig: OpenPomeConfig = {
  configVersion: 1,
  workspaceScanPaths: [],
  activeModelProvider: "manual-copy"
};

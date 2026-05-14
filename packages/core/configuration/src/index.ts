export interface OpenPomeConfig {
  readonly configVersion: 1;
  readonly workspaceScanPaths: readonly string[];
  readonly activeWorkItemSource?: string;
  readonly activeCodeHost?: string;
  readonly activeModelProvider: string;
}

export const defaultConfig: OpenPomeConfig = {
  configVersion: 1,
  workspaceScanPaths: [],
  activeModelProvider: "manual-copy"
};

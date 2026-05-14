export interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly path?: string;
  readonly remoteUrls: readonly string[];
}

export interface WorkspaceCandidate {
  readonly workspace: Workspace;
  readonly confidence: number;
  readonly reasons: readonly string[];
}

export interface LearnedWorkspaceLink {
  readonly source: "developer_confirmation" | "session_history" | "override";
  readonly workItemPattern: string;
  readonly workspaceId: string;
  readonly confidence: number;
  readonly lastUsedAt: string;
}

export interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly path?: string;
  readonly remoteUrls: readonly string[];
  readonly currentBranch?: string;
  readonly lastScannedAt?: string;
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

export interface WorkspaceResolutionInput {
  readonly workItemKey: string;
  readonly workItemTitle: string;
  readonly labels?: readonly string[];
  readonly components?: readonly string[];
  readonly workspaces: readonly Workspace[];
}

export interface WorkspaceIndex {
  readonly indexVersion: 1;
  readonly scannedAt: string;
  readonly scanPaths: readonly string[];
  readonly workspaces: readonly Workspace[];
}

const weakTokenMinimumLength = 3;

export function rankWorkspaceCandidates(input: WorkspaceResolutionInput): readonly WorkspaceCandidate[] {
  const projectKey = input.workItemKey.split("-")[0]?.toLowerCase();
  const titleTokens = tokenize(input.workItemTitle).filter((token) => token.length >= weakTokenMinimumLength);
  const metadataTokens = [...(input.labels ?? []), ...(input.components ?? [])]
    .flatMap((value) => tokenize(value))
    .filter((token) => token.length >= weakTokenMinimumLength);

  return input.workspaces
    .map((workspace) => rankWorkspace(workspace, projectKey, titleTokens, metadataTokens))
    .filter((candidate) => candidate.confidence > 0)
    .sort((left, right) => right.confidence - left.confidence || left.workspace.name.localeCompare(right.workspace.name));
}

function rankWorkspace(
  workspace: Workspace,
  projectKey: string | undefined,
  titleTokens: readonly string[],
  metadataTokens: readonly string[]
): WorkspaceCandidate {
  const searchable = [workspace.name, workspace.path, ...workspace.remoteUrls, workspace.currentBranch]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  const reasons: string[] = [];
  let confidence = 0;

  if (projectKey && searchable.includes(projectKey)) {
    confidence += 0.45;
    reasons.push(`matches work item project key ${projectKey.toUpperCase()}`);
  }

  const matchingTitleTokens = unique(titleTokens).filter((token) => searchable.includes(token));
  if (matchingTitleTokens.length > 0) {
    confidence += Math.min(0.3, matchingTitleTokens.length * 0.1);
    reasons.push(`matches title token${matchingTitleTokens.length === 1 ? "" : "s"}: ${matchingTitleTokens.join(", ")}`);
  }

  const matchingMetadataTokens = unique(metadataTokens).filter((token) => searchable.includes(token));
  if (matchingMetadataTokens.length > 0) {
    confidence += Math.min(0.2, matchingMetadataTokens.length * 0.1);
    reasons.push(`matches label/component token${matchingMetadataTokens.length === 1 ? "" : "s"}: ${matchingMetadataTokens.join(", ")}`);
  }

  if (workspace.currentBranch && projectKey && workspace.currentBranch.toLowerCase().includes(projectKey)) {
    confidence += 0.1;
    reasons.push(`current branch references ${projectKey.toUpperCase()}`);
  }

  return {
    workspace,
    confidence: Math.min(0.95, Number(confidence.toFixed(2))),
    reasons
  };
}

function tokenize(value: string): readonly string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

export interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly path?: string;
  readonly remoteUrls: readonly string[];
  readonly currentBranch?: string;
  readonly packageNames?: readonly string[];
  readonly readmeKeywords?: readonly string[];
  readonly codeownersKeywords?: readonly string[];
  readonly recentBranches?: readonly string[];
  readonly recentCommitRefs?: readonly string[];
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
  readonly linkedCodeUrls?: readonly string[];
  readonly workspaces: readonly Workspace[];
  readonly learnedLinks?: readonly LearnedWorkspaceLink[];
}

export interface WorkspaceIndex {
  readonly indexVersion: 1;
  readonly scannedAt: string;
  readonly scanPaths: readonly string[];
  readonly workspaces: readonly Workspace[];
}

export interface WorkspaceLinkIndex {
  readonly indexVersion: 1;
  readonly updatedAt: string;
  readonly links: readonly LearnedWorkspaceLink[];
}

const weakTokenMinimumLength = 3;

export function rankWorkspaceCandidates(input: WorkspaceResolutionInput): readonly WorkspaceCandidate[] {
  const projectKey = input.workItemKey.split("-")[0]?.toLowerCase();
  const workItemKey = input.workItemKey.toUpperCase();
  const titleTokens = tokenize(input.workItemTitle).filter((token) => token.length >= weakTokenMinimumLength);
  const metadataTokens = [...(input.labels ?? []), ...(input.components ?? [])]
    .flatMap((value) => tokenize(value))
    .filter((token) => token.length >= weakTokenMinimumLength);
  const linkedCodeUrls = input.linkedCodeUrls ?? [];
  const learnedLinks = input.learnedLinks ?? [];

  return input.workspaces
    .map((workspace) =>
      rankWorkspace(workspace, workItemKey, projectKey, titleTokens, metadataTokens, linkedCodeUrls, learnedLinks)
    )
    .filter((candidate) => candidate.confidence > 0)
    .sort((left, right) => right.confidence - left.confidence || left.workspace.name.localeCompare(right.workspace.name));
}

function rankWorkspace(
  workspace: Workspace,
  workItemKey: string,
  projectKey: string | undefined,
  titleTokens: readonly string[],
  metadataTokens: readonly string[],
  linkedCodeUrls: readonly string[],
  learnedLinks: readonly LearnedWorkspaceLink[]
): WorkspaceCandidate {
  const searchable = [
    workspace.name,
    workspace.path,
    ...workspace.remoteUrls,
    workspace.currentBranch,
    ...(workspace.packageNames ?? []),
    ...(workspace.readmeKeywords ?? []),
    ...(workspace.codeownersKeywords ?? []),
    ...(workspace.recentBranches ?? []),
    ...(workspace.recentCommitRefs ?? [])
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  const reasons: string[] = [];
  let confidence = 0;
  const learnedLink = learnedLinks.find(
    (link) => link.workspaceId === workspace.id && link.workItemPattern.toUpperCase() === workItemKey
  );

  if (learnedLink) {
    confidence += learnedLink.confidence;
    reasons.push("developer-confirmed workspace link");
  }

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

  const matchingPackageTokens = unique([...titleTokens, ...metadataTokens]).filter((token) =>
    (workspace.packageNames ?? []).some((packageName) => tokenize(packageName).includes(token))
  );
  if (matchingPackageTokens.length > 0) {
    confidence += Math.min(0.25, matchingPackageTokens.length * 0.1);
    reasons.push(`package metadata matches token${matchingPackageTokens.length === 1 ? "" : "s"}: ${matchingPackageTokens.join(", ")}`);
  }

  const linkedRemoteMatch = linkedCodeUrls.some((url) =>
    (workspace.remoteUrls ?? []).some((remoteUrl) => normalizeCodeLocation(remoteUrl) === normalizeCodeLocation(url))
  );
  if (linkedRemoteMatch) {
    confidence += 0.35;
    reasons.push("linked code URL matches workspace remote");
  }

  if (workspace.currentBranch && workspace.currentBranch.toUpperCase().includes(workItemKey)) {
    confidence += 0.25;
    reasons.push(`current branch references ${workItemKey}`);
  } else if (workspace.currentBranch && projectKey && workspace.currentBranch.toLowerCase().includes(projectKey)) {
    confidence += 0.1;
    reasons.push(`current branch references ${projectKey.toUpperCase()}`);
  }

  const matchingRecentBranch = (workspace.recentBranches ?? []).find((branch) => branch.toUpperCase().includes(workItemKey));
  if (matchingRecentBranch && matchingRecentBranch !== workspace.currentBranch) {
    confidence += 0.15;
    reasons.push(`recent branch references ${workItemKey}`);
  }

  if ((workspace.recentCommitRefs ?? []).some((ref) => ref.toUpperCase() === workItemKey)) {
    confidence += 0.15;
    reasons.push(`recent commit history references ${workItemKey}`);
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

function normalizeCodeLocation(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^git@([^:]+):/u, "https://$1/")
    .replace(/^ssh:\/\/git@/u, "https://")
    .replace(/\.git$/u, "")
    .replace(/\/$/u, "");
}

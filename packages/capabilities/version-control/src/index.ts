export interface RepositoryState {
  readonly path: string;
  readonly currentBranch?: string;
  readonly remoteUrls: readonly string[];
  readonly hasUncommittedChanges: boolean;
}

export interface VersionControlSource {
  readonly id: string;
  getRepositoryState(path: string): Promise<RepositoryState>;
}

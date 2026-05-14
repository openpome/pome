export interface LocalPersistenceInfo {
  readonly storageDirectory: string;
  readonly databaseFile: string;
}

export const defaultPersistenceFile = "sessions.sqlite";

export type ArtifactKind = "pull_request" | "work_item_update" | "qa_handoff" | "release_note";

export interface ArtifactDraft {
  readonly id: string;
  readonly kind: ArtifactKind;
  readonly title: string;
  readonly body: string;
  readonly createdAt: string;
}

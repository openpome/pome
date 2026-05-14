export type WorkItemType = "story" | "subtask" | "bug" | "task" | "epic";

export interface WorkItem {
  readonly key: string;
  readonly source: string;
  readonly type: WorkItemType;
  readonly title: string;
  readonly status: string;
  readonly description?: string;
  readonly priority?: string;
  readonly assignee?: string;
  readonly iteration?: string;
  readonly parentKey?: string;
  readonly labels?: readonly string[];
  readonly components?: readonly string[];
  readonly links?: readonly WorkItemLink[];
  readonly subtasks?: readonly WorkItemSummary[];
}

export interface WorkItemSummary {
  readonly key: string;
  readonly type: WorkItemType;
  readonly title: string;
  readonly status: string;
}

export interface WorkItemLink {
  readonly kind: "code" | "pull_request" | "document" | "related_work_item" | "other";
  readonly url: string;
  readonly title?: string;
}

export interface ReadinessScore {
  readonly total: number;
  readonly missing: readonly string[];
}

export interface WorkItemSource {
  readonly id: string;
  readonly displayName: string;
  listAssigned(): Promise<readonly WorkItem[]>;
  getWorkItem(key: string): Promise<WorkItem | undefined>;
}

export function groupWorkItemsByType(items: readonly WorkItem[]): Readonly<Record<WorkItemType, readonly WorkItem[]>> {
  return {
    story: items.filter((item) => item.type === "story"),
    subtask: items.filter((item) => item.type === "subtask"),
    bug: items.filter((item) => item.type === "bug"),
    task: items.filter((item) => item.type === "task"),
    epic: items.filter((item) => item.type === "epic")
  };
}

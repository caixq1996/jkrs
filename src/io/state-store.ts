import { z } from "zod";
import { atomicWriteJson, pathExists, readUtf8 } from "./files.js";
import { filesystemError } from "../errors.js";

const taskStateSchema = z.object({
  source: z.enum(["figma", "fixture"]),
  file_key: z.string(),
  source_url: z.string(),
  root_comment_id: z.string(),
  comment_ids: z.array(z.string()),
  task_path: z.string(),
  json_path: z.string(),
  screenshot_path: z.string().optional(),
  pulled_at: z.string(),
  last_reply_at: z.string().optional(),
});

export const stateSchema = z.object({
  schema_version: z.literal("1"),
  updated_at: z.string(),
  tasks: z.record(z.string(), taskStateSchema),
  comment_index: z.record(z.string(), z.string()),
});

export type TaskState = z.infer<typeof taskStateSchema>;
export type Pin2PatchState = z.infer<typeof stateSchema>;

export function emptyState(): Pin2PatchState {
  return {
    schema_version: "1",
    updated_at: new Date(0).toISOString(),
    tasks: {},
    comment_index: {},
  };
}

export async function loadState(stateFile: string): Promise<Pin2PatchState> {
  if (!(await pathExists(stateFile))) return emptyState();
  try {
    const parsed = JSON.parse(await readUtf8(stateFile)) as unknown;
    return stateSchema.parse(parsed);
  } catch (error) {
    throw filesystemError(
      `State file is invalid: ${stateFile}`,
      error,
      "Move the file aside and run pull again to rebuild local state.",
    );
  }
}

export async function mergeTasks(stateFile: string, taskRecords: TaskState[]): Promise<Pin2PatchState> {
  const current = await loadState(stateFile);
  const next: Pin2PatchState = {
    ...current,
    updated_at: new Date().toISOString(),
    tasks: { ...current.tasks },
    comment_index: { ...current.comment_index },
  };
  for (const task of taskRecords) {
    next.tasks[task.root_comment_id] = task;
    for (const id of task.comment_ids) next.comment_index[id] = task.root_comment_id;
  }
  await atomicWriteJson(stateFile, next);
  return next;
}

export async function findTaskByCommentId(
  stateFile: string,
  commentId: string,
): Promise<TaskState | undefined> {
  const state = await loadState(stateFile);
  const rootId = state.comment_index[commentId] ?? commentId;
  return state.tasks[rootId];
}

export async function markReply(stateFile: string, rootId: string, timestamp: string): Promise<void> {
  const state = await loadState(stateFile);
  const task = state.tasks[rootId];
  if (!task) return;
  state.tasks[rootId] = { ...task, last_reply_at: timestamp };
  state.updated_at = timestamp;
  await atomicWriteJson(stateFile, state);
}

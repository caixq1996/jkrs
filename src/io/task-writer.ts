import path from "node:path";
import type { TaskArtifact } from "../domain/task.js";
import type { ImageSource } from "../figma/types.js";
import type { TaskState } from "./state-store.js";
import { atomicWriteJson, atomicWriteText, ensureDir, materializeImage } from "./files.js";
import { renderTaskMarkdown } from "../render/task-markdown.js";

export interface WriteTaskOptions {
  tasksDir: string;
  task: TaskArtifact;
  imageSource?: ImageSource;
  refresh: boolean;
}

export interface WrittenTask {
  record: TaskState;
  taskPath: string;
  jsonPath: string;
  screenshotPath?: string;
  warnings: string[];
}

export async function writeTask(options: WriteTaskOptions): Promise<WrittenTask> {
  const taskDir = path.join(options.tasksDir, options.task.root_comment_id);
  await ensureDir(taskDir);
  const taskPath = path.join(taskDir, "task.md");
  const jsonPath = path.join(taskDir, "task.json");
  let screenshotPath: string | undefined;
  const warnings: string[] = [];

  if (options.imageSource) {
    const absoluteScreenshot = path.join(taskDir, "node.png");
    try {
      await materializeImage(options.imageSource, absoluteScreenshot, { refresh: options.refresh });
      screenshotPath = path.relative(taskDir, absoluteScreenshot) || "node.png";
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Screenshot could not be written.");
    }
  }

  const artifact: TaskArtifact = {
    ...options.task,
    ...(screenshotPath ? { screenshot_path: screenshotPath } : {}),
  };
  await atomicWriteJson(jsonPath, artifact);
  await atomicWriteText(taskPath, renderTaskMarkdown(artifact));

  return {
    record: {
      source: artifact.source,
      file_key: artifact.file_key,
      source_url: artifact.source_url,
      root_comment_id: artifact.root_comment_id,
      comment_ids: artifact.comment_ids,
      task_path: taskPath,
      json_path: jsonPath,
      ...(screenshotPath ? { screenshot_path: path.join(taskDir, screenshotPath) } : {}),
      pulled_at: artifact.pulled_at,
    },
    taskPath,
    jsonPath,
    ...(screenshotPath ? { screenshotPath: path.join(taskDir, screenshotPath) } : {}),
    warnings,
  };
}

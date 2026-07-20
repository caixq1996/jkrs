import path from "node:path";
import { FigmaApiClient } from "../figma/client.js";
import { FixtureFigmaClient } from "../figma/fixture-client.js";
import type { FigmaDataSource } from "../figma/types.js";
import { parseFigmaUrl } from "../domain/figma-url.js";
import { filterThreads, groupCommentThreads } from "../domain/threads.js";
import { buildTaskArtifact } from "../domain/task.js";
import { resolveProjectPaths } from "../config/paths.js";
import { mergeTasks } from "../io/state-store.js";
import { writeTask } from "../io/task-writer.js";
import { writeHuman, writeJson } from "../output.js";

export interface PullOptions {
  all?: boolean;
  image?: boolean;
  refresh?: boolean;
  output?: string;
  fixtureDir?: string;
  json?: boolean;
  cwd?: string;
  token?: string;
  dataSource?: FigmaDataSource;
}

export interface PullTaskSummary {
  root_comment_id: string;
  node_id?: string;
  node_name?: string;
  task_path: string;
  json_path: string;
  screenshot_path?: string;
}

export interface PullSummary {
  schema_version: "1";
  source: "figma" | "fixture";
  file_key: string;
  source_url: string;
  pulled: number;
  skipped_resolved: number;
  warnings: string[];
  tasks: PullTaskSummary[];
}

function createDataSource(options: PullOptions): FigmaDataSource {
  if (options.dataSource) return options.dataSource;
  if (options.fixtureDir) return new FixtureFigmaClient(path.resolve(options.cwd ?? process.cwd(), options.fixtureDir));
  return new FigmaApiClient({ token: options.token ?? process.env.FIGMA_TOKEN ?? "" });
}

export async function runPull(figmaUrl: string, options: PullOptions = {}): Promise<PullSummary> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const parsedUrl = parseFigmaUrl(figmaUrl);
  const paths = resolveProjectPaths(options.output ?? ".pin2patch", cwd);
  const source = createDataSource(options);
  const comments = await source.getComments(parsedUrl.fileKey);
  const allThreads = groupCommentThreads(comments);
  const threads = filterThreads(allThreads, options.all ?? false);
  const warnings: string[] = [];
  const nodeIds = [...new Set(threads.flatMap((thread) => (thread.nodeId ? [thread.nodeId] : [])))];

  let nodes = new Map();
  if (nodeIds.length > 0) {
    try {
      nodes = await source.getNodes(parsedUrl.fileKey, nodeIds);
    } catch (error) {
      warnings.push(
        `Node context unavailable; continuing with comment text only. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  let images = new Map();
  if ((options.image ?? true) && nodeIds.length > 0) {
    try {
      images = await source.getImages(parsedUrl.fileKey, nodeIds);
    } catch (error) {
      warnings.push(
        `Screenshots unavailable; continuing without images. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const pulledAt = new Date().toISOString();
  const written = [];
  for (const thread of threads) {
    const node = thread.nodeId ? nodes.get(thread.nodeId) : undefined;
    const artifact = buildTaskArtifact({
      source: source.source,
      parsedUrl,
      thread,
      ...(node ? { node } : {}),
      pulledAt,
    });
    const result = await writeTask({
      tasksDir: paths.tasksDir,
      task: artifact,
      ...(thread.nodeId && images.get(thread.nodeId) ? { imageSource: images.get(thread.nodeId) } : {}),
      refresh: options.refresh ?? false,
    });
    warnings.push(...result.warnings);
    written.push(result);
  }

  await mergeTasks(
    paths.stateFile,
    written.map((item) => item.record),
  );

  const summary: PullSummary = {
    schema_version: "1",
    source: source.source,
    file_key: parsedUrl.fileKey,
    source_url: parsedUrl.normalizedUrl,
    pulled: written.length,
    skipped_resolved: (options.all ?? false) ? 0 : allThreads.filter((thread) => thread.resolved).length,
    warnings,
    tasks: written.map((item) => {
      const artifact = threads.find((thread) => thread.root.id === item.record.root_comment_id);
      const node = artifact?.nodeId ? nodes.get(artifact.nodeId) : undefined;
      return {
        root_comment_id: item.record.root_comment_id,
        ...(artifact?.nodeId ? { node_id: artifact.nodeId } : {}),
        ...(node?.name ? { node_name: node.name } : {}),
        task_path: path.relative(cwd, item.taskPath),
        json_path: path.relative(cwd, item.jsonPath),
        ...(item.screenshotPath ? { screenshot_path: path.relative(cwd, item.screenshotPath) } : {}),
      };
    }),
  };

  if (options.json) {
    writeJson({ ok: true, ...summary });
  } else {
    writeHuman(`Pin2Patch pulled ${summary.pulled} ${summary.pulled === 1 ? "task" : "tasks"} from ${summary.source}.`);
    if (summary.skipped_resolved > 0) {
      writeHuman(`Skipped ${summary.skipped_resolved} resolved ${summary.skipped_resolved === 1 ? "thread" : "threads"}. Use --all to include them.`);
    }
    for (const task of summary.tasks) {
      writeHuman(`- ${task.root_comment_id}: ${task.task_path}${task.screenshot_path ? ` + ${task.screenshot_path}` : ""}`);
    }
    for (const warning of warnings) writeHuman(`Warning: ${warning}`, process.stderr);
  }

  return summary;
}

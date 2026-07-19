import path from "node:path";
import { FigmaApiClient } from "../figma/client.js";
import type { FigmaDataSource } from "../figma/types.js";
import { resolveProjectPaths } from "../config/paths.js";
import { findTaskByCommentId, markReply } from "../io/state-store.js";
import { readUtf8 } from "../io/files.js";
import { validationError } from "../errors.js";
import { writeHuman, writeJson } from "../output.js";

export interface ReplyOptions {
  message?: string;
  messageFile?: string;
  send?: boolean;
  fileKey?: string;
  rootCommentId?: string;
  stateDir?: string;
  json?: boolean;
  cwd?: string;
  token?: string;
  dataSource?: FigmaDataSource;
}

export interface ReplySummary {
  schema_version: "1";
  sent: boolean;
  file_key: string;
  root_comment_id: string;
  requested_comment_id: string;
  message: string;
  posted_comment_id?: string;
}

async function resolveMessage(options: ReplyOptions, cwd: string): Promise<string> {
  const hasInline = options.message !== undefined;
  const hasFile = options.messageFile !== undefined;
  if (hasInline === hasFile) {
    throw validationError("Provide exactly one of --message or --message-file.");
  }
  const value = hasInline ? options.message ?? "" : await readUtf8(path.resolve(cwd, options.messageFile ?? ""));
  const trimmed = value.trim();
  if (!trimmed) throw validationError("Reply message cannot be empty.");
  return trimmed;
}

export async function runReply(commentId: string, options: ReplyOptions): Promise<ReplySummary> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const paths = resolveProjectPaths(options.stateDir ?? ".pin2patch", cwd);
  const message = await resolveMessage(options, cwd);
  const task = await findTaskByCommentId(paths.stateFile, commentId);

  const fileKey = task?.file_key ?? options.fileKey;
  const rootCommentId = task?.root_comment_id ?? options.rootCommentId;
  if (!fileKey || !rootCommentId) {
    throw validationError(
      `No local task state found for comment ${commentId}.`,
      "Run pin2patch pull first, or provide both --file-key and --root-comment-id.",
    );
  }

  if (options.send && task?.source === "fixture") {
    throw validationError(
      "Fixture tasks cannot be sent to Figma.",
      "Run the command without --send for a safe preview, or pull a real Figma file first.",
    );
  }

  const base: ReplySummary = {
    schema_version: "1",
    sent: false,
    file_key: fileKey,
    root_comment_id: rootCommentId,
    requested_comment_id: commentId,
    message,
  };

  if (!options.send) {
    if (options.json) {
      writeJson({ ok: true, ...base });
    } else {
      writeHuman("Dry run: no Figma data was changed.");
      writeHuman(`Target file: ${fileKey}`);
      writeHuman(`Root thread: ${rootCommentId}`);
      writeHuman("Message:");
      writeHuman(message);
      writeHuman("Run again with --send to post this reply.");
    }
    return base;
  }

  const source = options.dataSource ?? new FigmaApiClient({ token: options.token ?? process.env.FIGMA_TOKEN ?? "" });
  const posted = await source.postReply(fileKey, rootCommentId, message);
  const timestamp = new Date().toISOString();
  if (task) await markReply(paths.stateFile, rootCommentId, timestamp);
  const summary: ReplySummary = {
    ...base,
    sent: true,
    posted_comment_id: posted.id,
  };

  if (options.json) {
    writeJson({ ok: true, ...summary });
  } else {
    writeHuman(`Reply posted to Figma thread ${rootCommentId}.`);
    writeHuman(`Posted comment ID: ${posted.id}`);
  }
  return summary;
}

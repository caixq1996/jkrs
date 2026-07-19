import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runReply } from "../src/commands/reply.js";
import { mergeTasks } from "../src/io/state-store.js";
import type { FigmaDataSource } from "../src/figma/types.js";

const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

afterEach(() => {
  stdoutSpy.mockClear();
  stderrSpy.mockClear();
});

async function seedState(cwd: string, source: "figma" | "fixture") {
  await mergeTasks(path.join(cwd, ".pin2patch/state.json"), [
    {
      source,
      file_key: "file-key",
      source_url: "https://www.figma.com/design/file-key/Demo",
      root_comment_id: "root",
      comment_ids: ["root", "reply"],
      task_path: path.join(cwd, ".pin2patch/tasks/root/task.md"),
      json_path: path.join(cwd, ".pin2patch/tasks/root/task.json"),
      pulled_at: "2026-07-19T00:00:00Z",
    },
  ]);
}

describe("runReply", () => {
  it("is a dry run by default and resolves reply IDs to roots", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "pin2patch-reply-"));
    await seedState(cwd, "figma");
    const summary = await runReply("reply", { cwd, message: "Implemented", json: true });
    expect(summary.sent).toBe(false);
    expect(summary.root_comment_id).toBe("root");
  });

  it("refuses to send fixture tasks", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "pin2patch-reply-fixture-"));
    await seedState(cwd, "fixture");
    await expect(runReply("root", { cwd, message: "Implemented", send: true, json: true })).rejects.toMatchObject({
      category: "validation",
    });
  });

  it("posts only when send is explicit", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "pin2patch-reply-live-"));
    await seedState(cwd, "figma");
    const postReply = vi.fn(async () => ({ id: "posted", message: "Implemented" }));
    const dataSource: FigmaDataSource = {
      source: "figma",
      getComments: async () => [],
      getNodes: async () => new Map(),
      getImages: async () => new Map(),
      postReply,
    };
    const summary = await runReply("reply", {
      cwd,
      message: "Implemented",
      send: true,
      json: true,
      dataSource,
    });
    expect(summary.sent).toBe(true);
    expect(summary.posted_comment_id).toBe("posted");
    expect(postReply).toHaveBeenCalledWith("file-key", "root", "Implemented");
  });
});

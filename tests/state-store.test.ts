import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { findTaskByCommentId, loadState, markReply, mergeTasks } from "../src/io/state-store.js";

describe("state store", () => {
  it("indexes every thread member and records replies", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pin2patch-state-"));
    const stateFile = path.join(dir, "state.json");
    await mergeTasks(stateFile, [
      {
        source: "fixture",
        file_key: "file",
        source_url: "https://www.figma.com/design/file/demo",
        root_comment_id: "root",
        comment_ids: ["root", "reply"],
        task_path: "/tmp/task.md",
        json_path: "/tmp/task.json",
        pulled_at: "2026-07-19T00:00:00Z",
      },
    ]);
    expect((await findTaskByCommentId(stateFile, "reply"))?.root_comment_id).toBe("root");
    await markReply(stateFile, "root", "2026-07-19T01:00:00Z");
    expect((await loadState(stateFile)).tasks.root?.last_reply_at).toBe("2026-07-19T01:00:00Z");
  });
});

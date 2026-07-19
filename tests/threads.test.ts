import { describe, expect, it } from "vitest";
import { filterThreads, groupCommentThreads } from "../src/domain/threads.js";
import type { FigmaComment } from "../src/figma/schemas.js";

const comments: FigmaComment[] = [
  {
    id: "root-1",
    message: "root",
    created_at: "2026-07-19T10:00:00Z",
    client_meta: { node_id: "1:2" },
  },
  {
    id: "reply-late",
    parent_id: "root-1",
    message: "late",
    created_at: "2026-07-19T10:02:00Z",
  },
  {
    id: "reply-early",
    parent_id: "root-1",
    message: "early",
    created_at: "2026-07-19T10:01:00Z",
  },
  {
    id: "resolved",
    message: "done",
    resolved_at: "2026-07-19T11:00:00Z",
  },
  {
    id: "orphan",
    parent_id: "missing-root",
    message: "orphan reply",
  },
];

describe("groupCommentThreads", () => {
  it("groups and chronologically sorts replies", () => {
    const threads = groupCommentThreads(comments);
    const root = threads.find((thread) => thread.root.id === "root-1");
    expect(root?.replies.map((reply) => reply.id)).toEqual(["reply-early", "reply-late"]);
    expect(root?.allCommentIds).toEqual(["root-1", "reply-early", "reply-late"]);
    expect(root?.nodeId).toBe("1:2");
  });

  it("retains orphan replies in a marked fallback thread", () => {
    const orphan = groupCommentThreads(comments).find((thread) => thread.root.id === "missing-root");
    expect(orphan?.orphaned).toBe(true);
    expect(orphan?.replies[0]?.id).toBe("orphan");
  });

  it("filters resolved roots by default", () => {
    const threads = groupCommentThreads(comments);
    expect(filterThreads(threads, false).some((thread) => thread.root.id === "resolved")).toBe(false);
    expect(filterThreads(threads, true).some((thread) => thread.root.id === "resolved")).toBe(true);
  });
});

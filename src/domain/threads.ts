import type { FigmaComment } from "../figma/schemas.js";

export interface ReviewThread {
  root: FigmaComment;
  replies: FigmaComment[];
  allCommentIds: string[];
  resolved: boolean;
  nodeId?: string;
  orphaned: boolean;
}

function createdAtValue(comment: FigmaComment): number {
  if (!comment.created_at) return 0;
  const value = Date.parse(comment.created_at);
  return Number.isNaN(value) ? 0 : value;
}

export function groupCommentThreads(comments: FigmaComment[]): ReviewThread[] {
  const roots = new Map<string, FigmaComment>();
  const repliesByParent = new Map<string, FigmaComment[]>();

  for (const comment of comments) {
    if (!comment.parent_id) {
      roots.set(comment.id, comment);
      continue;
    }
    const current = repliesByParent.get(comment.parent_id) ?? [];
    current.push(comment);
    repliesByParent.set(comment.parent_id, current);
  }

  const threads: ReviewThread[] = [];
  for (const root of roots.values()) {
    const replies = [...(repliesByParent.get(root.id) ?? [])].sort(
      (a, b) => createdAtValue(a) - createdAtValue(b),
    );
    threads.push({
      root,
      replies,
      allCommentIds: [root.id, ...replies.map((reply) => reply.id)],
      resolved: Boolean(root.resolved_at),
      ...(root.client_meta?.node_id ? { nodeId: root.client_meta.node_id } : {}),
      orphaned: false,
    });
    repliesByParent.delete(root.id);
  }

  for (const [missingParentId, orphanReplies] of repliesByParent.entries()) {
    const sorted = [...orphanReplies].sort((a, b) => createdAtValue(a) - createdAtValue(b));
    const first = sorted[0];
    if (!first) continue;
    const { parent_id: _parentId, ...firstWithoutParent } = first;
    const syntheticRoot: FigmaComment = {
      ...firstWithoutParent,
      id: missingParentId,
      message: `[Missing root comment ${missingParentId}]`,
    };
    threads.push({
      root: syntheticRoot,
      replies: sorted,
      allCommentIds: [missingParentId, ...sorted.map((reply) => reply.id)],
      resolved: false,
      ...(first.client_meta?.node_id ? { nodeId: first.client_meta.node_id } : {}),
      orphaned: true,
    });
  }

  return threads.sort((a, b) => createdAtValue(a.root) - createdAtValue(b.root));
}

export function filterThreads(threads: ReviewThread[], includeResolved: boolean): ReviewThread[] {
  return includeResolved ? threads : threads.filter((thread) => !thread.resolved);
}

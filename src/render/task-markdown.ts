import type { TaskArtifact } from "../domain/task.js";

function quoteMessage(value: string): string {
  const lines = value.replace(/\r\n?/gu, "\n").split("\n");
  return lines.map((line) => `> ${line}`).join("\n");
}

function dimensionText(task: TaskArtifact): string | undefined {
  const width = task.node?.width;
  const height = task.node?.height;
  if (width === undefined && height === undefined) return undefined;
  return `${width ?? "?"} × ${height ?? "?"}`;
}

export function renderTaskMarkdown(task: TaskArtifact): string {
  const lines: string[] = [
    "# Figma Design Review Task",
    "",
    "## Source",
    "",
    `- Figma file: ${task.source_url}`,
    `- Root comment ID: \`${task.root_comment_id}\``,
    `- Status: ${task.resolved ? "resolved" : "unresolved"}`,
    `- Source mode: ${task.source}`,
  ];

  if (task.orphaned) lines.push("- Thread warning: the API response did not include the original root comment");
  if (task.node) {
    lines.push(`- Node: ${task.node.name ? `${task.node.name} (\`${task.node.id}\`)` : `\`${task.node.id}\``}`);
    if (task.node.type) lines.push(`- Node type: ${task.node.type}`);
    const dimensions = dimensionText(task);
    if (dimensions) lines.push(`- Dimensions: ${dimensions}`);
    lines.push(`- Node link: ${task.node.source_url}`);
  } else {
    lines.push("- Node: not attached or unavailable; use the review text as the source of truth");
  }
  if (task.screenshot_path) lines.push(`- Screenshot: ${task.screenshot_path}`);

  lines.push("", "## Review Thread", "");
  for (const message of task.messages) {
    lines.push(`### ${message.is_root ? "Root feedback" : "Reply"} — ${message.author}`);
    if (message.created_at) lines.push(`_${message.created_at}_`);
    lines.push("", quoteMessage(message.message), "");
  }

  lines.push(
    "## Agent Workflow",
    "",
    "1. Inspect the screenshot and source metadata when available.",
    "2. Locate the smallest relevant code surface in this repository.",
    "3. Translate the review thread into explicit behavioral checks; do not invent unrelated requirements.",
    "4. Implement the change while preserving unaffected behavior.",
    "5. Run the most relevant automated checks.",
    "6. Write a concise `result.md` containing changed behavior, tests run, and an optional commit identifier.",
    "7. Preview the Figma reply with Pin2Patch. A human must choose whether to use `--send`.",
    "",
    "## Suggested Result Format",
    "",
    "```markdown",
    "Implemented and verified.",
    "",
    "- Changed: <observable behavior>",
    "- Preserved: <important unaffected behavior>",
    "- Tests: <commands and result>",
    "- Commit: <optional SHA>",
    "```",
    "",
    "## Safety Boundary",
    "",
    `**Trust level:** ${task.safety.trust}`,
    "",
    task.safety.note,
    "",
  );

  return `${lines.join("\n").replace(/\n{3,}/gu, "\n\n")}\n`;
}

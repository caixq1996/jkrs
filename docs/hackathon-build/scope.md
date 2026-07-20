# Pin2Patch — Scope

## One-line concept

Pin2Patch turns a Figma comment pin into an agent-ready local task package, then safely posts implementation and test evidence back to the original comment thread.

## Problem

Design feedback lives in Figma while coding agents operate in terminals and repositories. Engineers repeatedly copy comments, locate the pinned node, capture screenshots, restate acceptance criteria, ask an agent to modify code, run tests, and manually report the result in Figma. The handoff is slow, lossy, and difficult to audit.

## Target users

- Frontend engineers using Codex or another terminal coding agent.
- Design engineers coordinating implementation feedback.
- Small product teams without dedicated workflow automation.
- Independent builders moving rapidly between Figma and code.

## Core job to be done

When a reviewer leaves feedback on a Figma node, give a coding agent enough structured context to act correctly, then return verified implementation evidence to the same review thread without requiring the developer to reassemble the context manually.

## MVP workflow

1. A reviewer leaves an unresolved comment pinned to a Figma node.
2. The user runs `pin2patch pull <figma-url>`.
3. Pin2Patch retrieves comment threads, node metadata, and an optional rendered screenshot.
4. Pin2Patch writes Markdown and JSON task packages under `.pin2patch/tasks/`.
5. Codex reads a task package, finds the relevant code, implements the change, and runs tests.
6. The user previews `pin2patch reply <comment-id> --message-file result.md`.
7. The user opts in to the write with `--send`.
8. The implementation summary, commit, and test evidence appear in the original root comment thread.

## Required capabilities

- Parse common Figma design URLs and extract the file key.
- Read and group root comments with replies.
- Filter unresolved root threads by default.
- Associate pinned comments with `node_id` when available.
- Fetch node metadata and a PNG render when permitted.
- Generate stable Markdown and JSON task artifacts.
- Cache local state without persisting access tokens.
- Preview all write operations by default.
- Reply only after explicit `--send` confirmation.
- Provide machine-readable output and stable exit behavior.
- Offer a fixture-backed mode so judges can test without a Figma account or token.

## Time budget

- **Build budget:** 20 focused hours.
- **Freeze line:** After the core pull/reply workflow and tests are working, no new platform integrations or hosted components.

## Explicit non-goals

- Full design-to-code generation.
- Editing the Figma canvas.
- Resolving or closing comments through an undocumented API.
- OAuth, cloud accounts, background workers, webhooks, databases, or a web UI.
- Slack, Linear, Notion, or other adapters.
- An embedded LLM or agent runtime inside the CLI.
- Automatic commit, push, merge, or secret access.

## Wow moment

One terminal command turns a pinned design discussion and screenshot into a task that Codex can execute; after tests pass, a second command returns the verified result to the exact Figma thread.

## Definition of done

The repository can demonstrate the following reproducibly:

```text
Figma or fixture comment
→ pin2patch pull
→ task.md + task.json + node.png
→ Codex-compatible implementation task
→ passing test evidence
→ dry-run reply
→ explicit send for a real Figma file
```

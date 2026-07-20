# Devpost Draft — Pin2Patch

> Status: Draft only. Not yet sent as a final OpenAI Build Week entry.
> Live Devpost project: https://devpost.com/software/pin2patch
> Updated: 2026-07-19

## Title

Pin2Patch

## Tagline

Turn Figma comment pins into agent-ready tasks and tested code patches from the terminal.

## Recommended Category

Developer Tools

## One-line Summary

Pin2Patch is an agent-native CLI that converts a Figma review thread, pinned node context, and screenshot into a durable coding task, then safely returns implementation and test evidence to the original root comment.

## Problem

Design feedback often lives inside Figma while coding agents operate in a terminal and repository. A developer manually opens the design, finds the pinned thread, identifies the target frame, copies the discussion, captures a screenshot, explains the context to an agent, verifies the patch, and returns to Figma to report the result.

That handoff is repetitive and lossy. It is especially painful for teams that already use Codex frequently: the agent can reason about the code, but the human still has to reconstruct the design-review task every time.

## Solution

Pin2Patch turns that handoff into two narrow CLI operations:

```text
Figma comment pin
→ pin2patch pull
→ task.md + task.json + node.png
→ Codex implements and runs tests
→ pin2patch reply (dry run)
→ pin2patch reply --send
→ evidence in the original Figma thread
```

A pulled task contains:

- the root comment and chronologically ordered replies;
- the pinned Figma node ID, name, type, dimensions, and deep link when available;
- a rendered PNG of the target node when permitted;
- versioned JSON for scripts and Markdown for coding agents;
- local state mapping any reply ID back to the required root comment ID;
- an explicit warning that comment text is untrusted external input.

Pin2Patch does not embed an LLM. It keeps authentication, retrieval, normalization, caching, and controlled write-back deterministic. Codex performs repository search, implementation reasoning, and testing.

## Why This Matters

Pin2Patch is not another generic Figma API wrapper and not a full design-to-code generator. It focuses on one high-frequency coordination gap and completes the loop in both directions. The result is a shorter, auditable path from human design feedback to a tested code change, with evidence returned to the conversation where the work started.

## Working MVP

The local MVP now includes:

- `pin2patch doctor [figma-url]` for runtime, Git, token-presence, and URL checks;
- `pin2patch pull <figma-url>` for unresolved review threads;
- live Figma REST transport and a credential-free fixture transport;
- root/reply grouping, unresolved filtering, and orphan-thread preservation;
- node metadata and batched PNG retrieval;
- Markdown/JSON task generation and atomic local state;
- stable JSON command output;
- reply-ID-to-root-ID lookup;
- dry-run replies by default and explicit `--send` for live writes;
- a hard refusal to send fixture-backed tasks;
- a resettable checkout patch target for the demo.

## How AI Capabilities Are Used

Codex with GPT-5.6 has two roles:

1. **Building Pin2Patch:** Codex helped turn the product hypothesis into a scoped PRD and technical specification, implement the typed CLI, design API-shaped fixtures, write tests, diagnose type/runtime failures, and prepare the documentation and Devpost narrative.
2. **Using Pin2Patch:** Codex reads the generated `task.md`, inspects the screenshot and repository, maps the feedback to the smallest relevant code surface, implements the change, runs the behavior checks, and writes `result.md` for the safe reply preview.

The separation is deliberate: Pin2Patch provides a deterministic bridge that Codex and other terminal agents can call, rather than hiding another agent inside the integration.

## Key Features

- Common Figma `design`, `file`, `proto`, and `board` URL parsing.
- Unresolved-by-default root-thread import; `--all` includes resolved work.
- Comment-to-node association through pinned node IDs.
- Text-only degradation when node or image APIs are unavailable.
- `--no-image` and local asset reuse to reduce rate-limit exposure.
- Agent-readable Markdown and versioned JSON artifacts.
- Credential-free fixture mode for judges.
- Explicit trust boundary around external comment content.
- Remote replies are opt-in only.
- macOS, Linux, and Windows support through Node.js 20+.

## Core Commands

```bash
pin2patch doctor "https://www.figma.com/design/FILE_KEY/File-Name"

pin2patch pull \
  "https://www.figma.com/design/FILE_KEY/File-Name" \
  --json

pin2patch reply COMMENT_ID \
  --message-file result.md

pin2patch reply COMMENT_ID \
  --message-file result.md \
  --send
```

For the judge-safe local path:

```bash
node dist/cli.js pull \
  "https://www.figma.com/design/demoFileKey/Pin2Patch-Demo" \
  --fixture-dir fixtures/figma
```

## Architecture Summary

```text
TypeScript CLI
├── Figma URL parser
├── live REST client / fixture client
├── comment-thread normalizer
├── node context and screenshot loader
├── Markdown / JSON task renderer
├── atomic local state and comment index
└── safe reply writer
```

Local runtime data lives under `.pin2patch/`. The MVP has no database, account service, browser extension, Figma plugin, background worker, or hosted backend.

## Built With

- Codex
- GPT-5.6
- TypeScript
- Node.js
- Figma REST API
- Commander.js
- Zod
- Vitest

## Safety and Reliability

- Comments are quoted as untrusted external input, never executed.
- The token is read only at request time and is never persisted.
- `reply` is a dry run unless `--send` is present.
- Fixture tasks can never perform remote writes.
- Node/image failures degrade to a text-only task instead of discarding feedback.
- State and JSON writes use atomic replacement.
- HTTP 429 responses surface `Retry-After` when available.
- `.pin2patch/` and `.env*` are ignored by Git.

## Verification Evidence

The current local quality gate passes:

- strict TypeScript typecheck;
- 9 test files and 20 passing tests;
- production build;
- npm package dry run;
- credential-pattern and risky-file scans.

The compiled CLI smoke test produced one unresolved task from the included fixture, skipped one resolved thread, created `task.md`, `task.json`, and a valid PNG, mapped a reply ID to its root ID, and returned a dry-run result with `sent: false`.

The checkout demo was also verified in both states: the intentional before state fails three design-review checks, while the reference patch passes all four checks, including preservation of the desktop layout. The repository is left in the before state so Codex can perform the patch during the video.

## Testing Instructions

Requirements: Node.js 20+.

```bash
npm install
npm run check
npm run build

# Credential-free central workflow
node dist/cli.js pull \
  "https://www.figma.com/design/demoFileKey/Pin2Patch-Demo" \
  --fixture-dir fixtures/figma

# Inspect the task package
cat .pin2patch/tasks/813729/task.md

# Preview a reply; this never changes Figma
node dist/cli.js reply 813730 \
  --message "Implemented and verified. Tests: 4 passed."
```

To reproduce the Codex patch target:

```bash
npm run demo:reset
npm run demo:test   # expected to fail before the patch

# Let Codex implement the generated task, then rerun:
npm run demo:test   # should pass all 4 checks
```

For a real Figma file, create a token with `file_comments:read`, `file_comments:write`, and `file_content:read`; pull a file accessible to that token; preview the reply; and use `--send` only after inspection.

## Screenshot Shot List

1. Real Figma mobile checkout frame with a pinned unresolved review comment.
2. Terminal output from `pin2patch pull`.
3. Generated `task.md` beside `node.png`.
4. Codex reading the task and patching the sample checkout.
5. Four passing demo checks and the relevant diff.
6. Dry-run reply preview with `sent: false`.
7. Explicit `--send` followed by the result visible in the original Figma thread.

A fixture screenshot is available at `fixtures/figma/checkout-mobile.png`. Project-cover candidates are prepared at `assets/pin2patch-thumbnail.png` and `assets/pin2patch-thumbnail-square.jpg`; the square image is approved for the Devpost project thumbnail.

## Demo Video Outline — Under 3 Minutes

### 0:00–0:25 — The gap

Show a pinned Figma review and explain that the coding agent has repository context but not the full design conversation, node, and screenshot.

### 0:25–0:55 — Pull once

Run `pin2patch pull`. Show the generated thread, node metadata, PNG, stable JSON, and safety boundary.

### 0:55–1:45 — Codex patches

Have Codex read `task.md`, change only the sample checkout files, and run the four behavior checks.

### 1:45–2:20 — Evidence and safe preview

Show the diff and passing tests. Generate `result.md`; run `pin2patch reply` without `--send`; highlight that nothing remote changed.

### 2:20–2:50 — Close the loop

After explicit approval, run `--send` against the real demo file and show the result beneath the original root comment. Explain how GPT-5.6 and Codex were used both to build and operate the workflow.

## Official Form Fields

| Field | Draft Answer / Status |
|---|---|
| Submitter Type | Individual |
| Country of Residence | Japan |
| Category | Developer Tools |
| Code Repository URL | https://github.com/caixq1996/Pin2Patch |
| Judge Test URL / Instructions | Fixture mode works without credentials. The clean repository archive is verified; the GitHub repository still needs its final rename and full source upload. |
| `/feedback` Codex Session ID | **Required and pending.** No valid Codex `/feedback` session identifier is exposed in this ChatGPT Work environment; do not substitute an invented conversation ID. |
| Developer Tool Installation / Platforms / Testing | Use the Testing Instructions above; Node.js 20+ on macOS, Linux, or Windows. |
| Public Demo Video URL | The final 143.88-second neural-voice MP4 and SRT are complete locally; a public YouTube URL is still required. |

## Remaining External Assets

- Rename the GitHub repository from `jkrs` to `Pin2Patch` and upload the complete verified source archive.
- Upload the finished 143.88-second demo to public YouTube and record the URL.
- Provide the genuine `/feedback` Codex Session ID for the session where the core work was performed.

## Readiness

**The local MVP, application narrative, thumbnail, and final neural-voice demo video are built and verified. The entry is blocked only by three externally owned submission values: a fully populated public GitHub repository, the public YouTube URL, and a genuine required `/feedback` Codex Session ID.**


## Final Submit Attempt — 2026-07-19

The participant authorized final submission and provided:

- Submitter Type: Individual
- Country of Residence: Japan

Final preflight remains stopped because the live form still needs a complete public code repository, a public YouTube demo URL, and the required genuine `/feedback` Codex Session ID. The neural-voice video, thumbnail, local MVP, quality gate, and security scan are complete; placeholders must not be sent.

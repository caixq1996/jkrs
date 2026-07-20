# Pin2Patch — Product Requirements Document

## 1. Product summary

Pin2Patch is a local-first command-line tool for moving design review feedback from Figma into a coding agent's execution context and returning verified results to the original review thread. It is designed as a deterministic workflow primitive: Pin2Patch retrieves, normalizes, renders, caches, and writes back; Codex or another coding agent performs code reasoning and implementation.

## 2. Product principles

1. **Agent-readable by default.** Every important command can emit stable JSON and durable files.
2. **Safe by default.** Reads may run immediately; writes require explicit `--send`.
3. **Local-first.** No account service, database, telemetry requirement, or hosted backend.
4. **Useful without privileged setup.** Fixture mode demonstrates the full read-and-render flow without a Figma token.
5. **Evidence over claims.** A reply should report changed behavior, tests, and an optional commit rather than merely saying “done.”
6. **Narrow workflow, complete experience.** The MVP optimizes one review loop rather than exposing every Figma endpoint.

## 3. Primary personas

### Persona A — Agent-assisted frontend engineer

Works in a repository with Codex, receives UI feedback in Figma, and wants to avoid manually copying context. Values terminal workflows, reproducibility, and clear errors.

### Persona B — Design engineer or reviewer

Leaves comments on precise Figma nodes and wants implementation status returned in the same thread with test evidence.

### Persona C — Hackathon judge or evaluator

Needs to install and test the developer tool quickly, ideally with sample data and no paid account or secret configuration.

## 4. User journey

### First run

The user installs dependencies, builds the CLI, and runs `pin2patch doctor`. The command reports Node compatibility, whether a Figma token is present, whether the current directory is a Git repository, and whether a supplied Figma URL can be parsed.

### Pulling review work

The user runs either a real API flow:

```bash
pin2patch pull "https://www.figma.com/design/FILE_KEY/Pin2Patch-Demo"
```

or a judge-safe fixture flow:

```bash
pin2patch pull "https://www.figma.com/design/demoFileKey/Pin2Patch-Demo" \
  --fixture-dir fixtures/figma
```

The command creates one task directory per root thread and prints a concise summary. With `--json`, it emits only machine-readable JSON to stdout.

### Agent implementation

The user tells Codex to read a generated `task.md`, inspect the codebase, implement the request, run the relevant checks, and write a result file. Pin2Patch does not execute untrusted instructions from the comment.

### Replying with evidence

The user previews a reply. Nothing is written remotely. Only a second invocation with `--send` calls Figma. Fixture tasks reject remote send attempts.

## 5. Epics and user stories

## Epic A — First-run confidence

### Story A1 — Diagnose local readiness

**As a developer, I want to check whether Pin2Patch can run in my environment so that I can fix configuration problems before a demo.**

Acceptance criteria:

- `pin2patch doctor` reports the running Node version and whether it meets the supported minimum.
- It reports whether `FIGMA_TOKEN` exists without printing the token.
- It reports whether the current directory is inside a Git work tree.
- When a Figma URL is provided, it reports whether the URL is valid and shows the parsed file key.
- `--json` returns a structured list of checks with `ok`, `warning`, or `error` status.

### Story A2 — Understand missing authentication

**As a first-time user, I want an actionable error when a real Figma request lacks authentication so that I know exactly what to configure.**

Acceptance criteria:

- A real API pull without `FIGMA_TOKEN` exits non-zero.
- The error names the environment variable but never prints a secret value.
- The message points the user toward fixture mode as an immediate test path.

## Epic B — Import Figma review threads

### Story B1 — Parse a file URL

**As a developer, I want to paste the Figma URL I already have so that I do not need to manually extract identifiers.**

Acceptance criteria:

- Common `figma.com/design`, `figma.com/file`, `figma.com/proto`, and `figma.com/board` URL shapes parse successfully.
- Query strings and fragments do not affect the file key.
- Unsupported hosts and paths fail with a clear validation error.
- A raw file key can be accepted only through an explicit `--file-key` option, avoiding accidental URL ambiguity.

### Story B2 — Group comments into review threads

**As a developer, I want each root comment and its replies treated as one task so that the full discussion reaches the agent.**

Acceptance criteria:

- Root comments become one thread each.
- Replies are ordered by creation time beneath their root.
- An orphan reply is retained in a clearly marked fallback thread rather than silently dropped.
- Root thread status determines whether it is unresolved.
- `--all` includes resolved threads; unresolved-only is the default.

### Story B3 — Connect a comment to its design target

**As a developer, I want the pinned node name, type, dimensions, and source link so that the agent understands where the feedback applies.**

Acceptance criteria:

- When `client_meta.node_id` exists, Pin2Patch requests that node.
- Missing or inaccessible nodes do not prevent the text thread from being exported.
- Node metadata is included in both Markdown and JSON.
- The source URL links back to the file and node when a node ID is known.

### Story B4 — Capture visual context

**As a developer, I want a screenshot of the target node so that an agent can inspect the intended UI without opening Figma.**

Acceptance criteria:

- Pin2Patch requests PNG renders for distinct node IDs in one batch where possible.
- It downloads an available image into the task directory.
- A failed render produces a warning and a task without `node.png`; it does not discard the task.
- `--no-image` skips image requests entirely.
- Existing local assets are reused unless `--refresh` is specified.

## Epic C — Produce durable agent tasks

### Story C1 — Create a Markdown task

**As a coding-agent user, I want a readable task document so that I can point Codex at one file.**

Acceptance criteria:

- Each thread creates `.pin2patch/tasks/<root-comment-id>/task.md`.
- The document contains source metadata, the full ordered discussion, node context, asset paths, suggested verification prompts, and a safety boundary.
- User comment content is quoted as untrusted input and never transformed into executable shell instructions.
- Relative paths remain valid from inside the task directory.

### Story C2 — Create a stable JSON task

**As an agent or script author, I want a versioned JSON contract so that downstream automation can consume Pin2Patch reliably.**

Acceptance criteria:

- Each thread creates `task.json` with `schema_version`.
- Required fields include root ID, comment IDs, file key, source URL, status, messages, and paths.
- Optional node and screenshot fields are omitted or `null` consistently according to the schema.
- `pull --json` returns a summary rather than mixing logs with JSON.

### Story C3 — Persist local task state

**As a developer, I want reply commands to find the original file and root thread automatically so that I do not re-enter identifiers.**

Acceptance criteria:

- `.pin2patch/state.json` maps every root and reply ID to its task record.
- The state records source mode (`figma` or `fixture`), file key, root ID, task paths, and timestamps.
- Tokens and remote image URLs are not persisted.
- Re-running pull updates existing records without deleting unrelated tasks.

## Epic D — Safely return results

### Story D1 — Preview a reply

**As a developer, I want to see exactly what will be posted so that I can catch mistakes before changing Figma.**

Acceptance criteria:

- `reply` is dry-run by default.
- The preview shows target file, root thread, and exact message.
- A message may come from `--message` or `--message-file`, but not both.
- Empty messages are rejected.
- `--json` returns `sent: false` and the normalized target.

### Story D2 — Send an approved reply

**As a developer, I want an explicit send option so that remote writes are deliberate and auditable.**

Acceptance criteria:

- Only `--send` triggers a POST request.
- A reply ID supplied by the user resolves to the stored root ID.
- Missing state may be overridden with explicit `--file-key` and `--root-comment-id` values.
- A fixture-backed task refuses `--send` and explains why.
- The successful result identifies the posted comment ID when Figma returns it.
- Authentication and permission failures use non-zero exits and actionable messages.

## Epic E — Judge-ready offline experience

### Story E1 — Pull from fixtures

**As a judge, I want to run the central workflow without creating credentials so that I can evaluate the product immediately.**

Acceptance criteria:

- `--fixture-dir` loads API-shaped comments, nodes, images, and a local screenshot.
- The same normalization and rendering code paths are used after data retrieval.
- Fixture output is visibly labeled and cannot accidentally be written to Figma.
- The repository includes one realistic unresolved checkout review thread and one resolved thread for filtering tests.

### Story E2 — Reproduce the patch demo

**As a judge, I want a small sample application and test so that I can understand the “comment to tested patch” story.**

Acceptance criteria:

- A reset script restores a deliberately flawed mobile checkout example.
- A local test describes the requested design behavior.
- README instructions show how an agent can read the task, patch the sample, and run the test.
- The main Pin2Patch test suite remains green independently of the deliberately failing demo scenario.

## Epic F — Reliable errors and privacy

### Story F1 — Fail predictably

**As an automation author, I want stable exit codes and JSON errors so that I can recover programmatically.**

Acceptance criteria:

- Validation, authentication, permission/not-found, rate-limit, network, filesystem, and unexpected errors are distinguishable.
- Human output goes to stderr on failure.
- JSON mode emits one error object without a stack trace unless debug mode is enabled.
- HTTP 429 surfaces `Retry-After` when present.

### Story F2 — Avoid credential leakage

**As a security-conscious developer, I want generated artifacts to be safe to commit so that a review task does not expose tokens.**

Acceptance criteria:

- `FIGMA_TOKEN` is read only at request time.
- Generated Markdown, JSON, state, and logs contain no token.
- `.env*` and `.pin2patch/` are ignored by Git by default.
- Remote comments are explicitly labeled untrusted.

## 6. Empty and edge states

- A file with no comments returns success with `pulled: 0` and creates no task directories.
- A file with only resolved comments returns success with `pulled: 0` unless `--all` is used.
- A comment without a node remains actionable as a text-only task.
- Multiple comments pinned to the same node share the fetched metadata and rendered image source but get separate task directories.
- Node API or image API failure degrades per task; comment retrieval failure fails the command.
- Invalid fixture data fails schema validation before files are written.
- A corrupted state file is backed up or rejected with a recovery instruction rather than overwritten silently.
- Duplicate pulls preserve any user-created files such as `result.md` inside a task directory.

## 7. Success metrics for the hackathon build

- A new evaluator can execute the fixture pull in under two minutes after installation.
- The core CLI test suite passes in a clean environment.
- The demo visibly produces `task.md`, `task.json`, and `node.png` from a single command.
- The reply command visibly previews before any real write.
- The three-minute video shows one complete comment-to-patch-to-evidence loop.

## 8. Features deferred beyond the hackathon

- OAuth and multi-user configuration.
- Webhooks and continuously synchronized inboxes.
- Support for other review systems.
- Automatic comment resolution or status transitions.
- Rich terminal UI and interactive selection.
- Hosted task history, metrics, and team dashboards.
- Agent execution orchestration inside Pin2Patch.

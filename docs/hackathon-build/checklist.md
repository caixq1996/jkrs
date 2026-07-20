# Pin2Patch — Autonomous Build Checklist

- **Build mode:** Autonomous
- **Verification:** Automated at every item; manual live-Figma verification only after a token/file exists
- **Check-in cadence:** After foundation, after core pull, and after complete MVP
- **Git cadence:** One local commit after the MVP is green; publishing waits for a connected repository
- **Time budget:** 20 hours
- **Wow moment:** A Figma pin becomes an agent task with a screenshot, then a tested implementation report returns to the original thread

- [x] **1. Scaffold the CLI and durable project documents**
  Spec ref: `spec.md > Chosen stack` and `spec.md > File structure`
  What to build: Initialize the TypeScript package, build scripts, strict configuration, license, ignores, scope, PRD, spec, state, and build notes.
  Acceptance: A clean install can typecheck; all planned files have a defined purpose.
  Verify: `npm install && npm run typecheck`

- [x] **2. Implement URL parsing, errors, and output contracts**
  Spec ref: `spec.md > CLI contracts` and `spec.md > Error strategy`
  What to build: Parse supported Figma URLs, generate node URLs, define typed errors/exit codes, and isolate human versus JSON output.
  Acceptance: Valid URL forms parse; bad hosts and paths fail clearly; JSON errors contain no stack by default.
  Verify: `npm test -- tests/figma-url.test.ts tests/errors.test.ts`

- [x] **3. Implement live and fixture Figma clients**
  Spec ref: `spec.md > Figma API integration` and `spec.md > Runtime data contracts`
  What to build: Zod schemas, common client interface, authenticated HTTP client, timeouts/error mapping, and fixture-backed data source.
  Acceptance: Comment, node, image, and reply methods return validated values; token never appears in errors.
  Verify: `npm test -- tests/figma-client.test.ts tests/fixture-client.test.ts`

- [x] **4. Normalize comment threads and node context**
  Spec ref: `spec.md > Runtime data contracts`
  What to build: Root/reply grouping, chronological ordering, orphan retention, unresolved filtering, and node metadata projection.
  Acceptance: Every comment is represented exactly once; default output excludes resolved roots; missing nodes degrade cleanly.
  Verify: `npm test -- tests/threads.test.ts`

- [x] **5. Render task artifacts and persist state**
  Spec ref: `spec.md > Task JSON schema`, `State schema`, and `Security controls`
  What to build: Markdown renderer, JSON artifact, safe atomic file helpers, image copy/download, state merge, and comment index.
  Acceptance: Task files contain the full thread and safety boundary; state contains no secrets; re-pull preserves user-created files.
  Verify: `npm test -- tests/task-render.test.ts tests/state-store.test.ts tests/task-writer.test.ts`

- [x] **6. Complete `pin2patch pull`**
  Spec ref: `spec.md > Pull lifecycle`
  What to build: Orchestrate URL parse, client selection, thread retrieval, node/image batching, task writes, state update, warnings, and JSON summary.
  Acceptance: The included fixture creates one unresolved task with Markdown, JSON, and PNG; `--all` includes the resolved task; `--no-image` skips PNG.
  Verify: `npm run dev -- pull https://www.figma.com/design/demoFileKey/Pin2Patch-Demo --fixture-dir fixtures/figma --json`

- [x] **7. Complete safe `pin2patch reply`**
  Spec ref: `spec.md > Reply lifecycle`
  What to build: State lookup, exact message-source validation, human/JSON preview, explicit live send, and fixture-send refusal.
  Acceptance: Default invocation never writes remotely; `--send` is required; reply IDs resolve to roots; fixture send fails safely.
  Verify: `npm test -- tests/reply-command.test.ts`

- [x] **8. Add doctor command and judge-safe demo data**
  Spec ref: `spec.md > doctor` and `spec.md > Demo design`
  What to build: Environment diagnostics, realistic API fixtures, local node screenshot, and sample checkout review.
  Acceptance: A judge can understand readiness and run the pull workflow without secrets.
  Verify: `npm run dev -- doctor https://www.figma.com/design/demoFileKey/Pin2Patch-Demo --json`

- [x] **9. Add reproducible patch target and documentation**
  Spec ref: `spec.md > Demo design` and PRD Epic E
  What to build: Resettable sample checkout app, behavior test, README installation/architecture/fixture/live instructions, Codex prompt, and testing guidance.
  Acceptance: Instructions lead from clone to fixture task in a few commands; the demo reset makes the intended patch obvious.
  Verify: `npm run demo:reset && npm run demo:test` (expected to fail before patch), then apply documented sample patch and rerun to pass.

- [x] **10. Harden, package, and prepare Devpost handoff**
  Spec ref: `spec.md > Test strategy` and `spec.md > Security controls`
  What to build: Full test pass, production build, package smoke test, secret scan, architecture/demo notes, and refreshed submission draft.
  Acceptance: `npm run check` passes; package runs from `dist`; no high-confidence secrets are present; remaining live assets are explicit TODOs.
  Verify: `npm run check && npm pack --dry-run`

## Verification note

All ten implementation items are complete for the local/fixture MVP. The live Figma HTTP path is implemented and covered through mocked transport tests, but a real-file `pull` and `reply --send` smoke test remains an external verification step because no user-owned Figma file/token is available in this workspace.

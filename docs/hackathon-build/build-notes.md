# Pin2Patch — Build Notes

## 2026-07-19 — Direction and scope

- Chose the narrow “Figma comment pin → agent task → verified reply” loop instead of a generic Figma or MCP CLI.
- Kept the LLM outside the CLI. Pin2Patch owns deterministic integration; Codex owns repository reasoning and code changes.
- Set a 20-hour MVP budget with a hard scope freeze after the pull/reply loop is green.
- Added fixture mode because judges should not need a Figma token to evaluate the central product behavior.
- Made remote reply dry-run by default; `--send` is the only write trigger.
- Refused to claim automatic comment resolution because the public comments API documents replies/reactions but not a resolve endpoint.

## Autonomous implementation preferences

- Build straight through the checklist.
- Verify each layer with tests.
- Pause only on a genuine blocker, an irreversible remote write, or a required user-owned credential/asset.
- Preserve an auditable distinction between completed code and future/live-integration claims.

## 2026-07-19 — MVP implementation and verification

- Implemented `doctor`, `pull`, and `reply` as a strict TypeScript/Node CLI.
- Added live Figma REST transport plus an API-shaped fixture transport using the same downstream normalization pipeline.
- Added root/reply grouping, unresolved filtering, orphan retention, node context, PNG materialization, Markdown/JSON artifacts, atomic state, and reply-ID-to-root-ID lookup.
- Added credential-free judge flow with one unresolved and one resolved review thread.
- Added a resettable checkout patch target. Verified that the before state fails three review checks and the reference patch passes all four.
- Verified `npm run check`: strict typecheck, 9 test files, 20 passing tests, and production build.
- Verified package contents with `npm pack --dry-run`; package size was about 29 KB compressed.
- Ran a credential scan after removing false-positive placeholder literals: no high-confidence or generic credential patterns remain, and no `.env`, private key, or PEM files exist.
- Live Figma send is intentionally still unverified because the workspace has no user-owned token or accessible file. The fixture source refuses `--send` by design.

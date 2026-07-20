# Pin2Patch

**From Figma comment pin to agent-ready task and verified implementation evidence—without leaving the terminal.**

Pin2Patch is a local-first CLI for the handoff between Figma reviewers and terminal coding agents such as Codex. It turns a root comment thread, its pinned node metadata, and an optional screenshot into durable Markdown and JSON task files. After the code change is reviewed and tested, Pin2Patch previews—and only with explicit approval posts—the evidence back to the original Figma thread.

> Project status: working hackathon MVP. Fixture mode is complete and testable without credentials. A real Figma write requires a user-owned scoped token and accessible file.

## Why this exists

Coding agents can reason about a repository, but design feedback often remains trapped in a browser workflow. Developers manually find the pin, copy the thread, take a screenshot, restate context, verify a patch, and return to Figma to report the result. Pin2Patch makes that review loop a narrow, deterministic CLI primitive.

```text
Figma comment pin
    ↓
pin2patch pull
    ↓
task.md + task.json + node.png
    ↓
Codex implements and runs tests
    ↓
pin2patch reply (dry run)
    ↓
pin2patch reply --send
    ↓
evidence in the original Figma thread
```

## Fastest judge path: no Figma account required

Requirements: Node.js 20 or newer.

```bash
npm install
npm run build

node dist/cli.js doctor \
  "https://www.figma.com/design/demoFileKey/Pin2Patch-Demo"

node dist/cli.js pull \
  "https://www.figma.com/design/demoFileKey/Pin2Patch-Demo" \
  --fixture-dir fixtures/figma
```

Inspect the generated files:

```text
.pin2patch/
├── state.json
└── tasks/
    └── 813729/
        ├── task.md
        ├── task.json
        └── node.png
```

Preview an implementation reply safely:

```bash
cat > .pin2patch/tasks/813729/result.md <<'RESULT'
Implemented and verified.

- Changed: mobile price now wraps below the title
- Changed: horizontal padding is 16px
- Reused: existing secondary button style
- Preserved: desktop two-column layout
- Tests: node --test demo/checkout-app/test/*.test.mjs (4 passed)
RESULT

node dist/cli.js reply 813729 \
  --message-file .pin2patch/tasks/813729/result.md
```

The command is a dry run. Fixture-backed tasks intentionally reject `--send`.

## Live Figma setup

Create a Personal Access Token that can access your chosen file and grant these scopes:

- `file_comments:read`
- `file_comments:write`
- `file_content:read`

Export it only in your shell:

```bash
export FIGMA_TOKEN="..."
```

Then pull a real file:

```bash
pin2patch pull "https://www.figma.com/design/FILE_KEY/File-Name"
```

Preview a reply:

```bash
pin2patch reply ROOT_OR_REPLY_COMMENT_ID --message-file result.md
```

Post only after inspecting the preview:

```bash
pin2patch reply ROOT_OR_REPLY_COMMENT_ID --message-file result.md --send
```

Pin2Patch uses the stored comment index to map a reply ID back to its root thread because Figma requires replies to target root comments.

## Commands

### `pin2patch doctor [figma-url]`

Checks Node support, token presence, Git work-tree status, and optional URL parsing.

```bash
pin2patch doctor --json
```

### `pin2patch pull <figma-url>`

Key options:

```text
--all                 include resolved root threads
--no-image            skip node screenshot rendering
--refresh             refresh cached screenshots
--output <dir>        output directory (default: .pin2patch)
--fixture-dir <dir>   use API-shaped local fixtures
--json                emit one machine-readable object
```

### `pin2patch reply <comment-id>`

Exactly one message source is required:

```text
--message <text>
--message-file <path>
```

Remote writes require:

```text
--send
```

Recovery options exist when state is unavailable:

```text
--file-key <key>
--root-comment-id <id>
```

## Reproducible patch demo

Reset the checkout example to the intentional pre-fix state:

```bash
npm run demo:reset
npm run demo:test
```

The first three checks should fail because the fixture asks for behavior not yet implemented. Give Codex this prompt:

```text
Run Pin2Patch pull with fixtures/figma. Read the generated task.md.
Patch demo/checkout-app/src/index.html and styles.css only.
Run npm run demo:test until all checks pass.
Write .pin2patch/tasks/813729/result.md with changed behavior and test evidence.
Then preview pin2patch reply 813729 using that result file. Do not use --send.
```

For deterministic verification of the expected final state:

```bash
node scripts/apply-demo-solution.mjs
npm run demo:test
```

## Architecture

```text
CLI
├── Figma URL parser
├── live REST client / fixture client
├── comment-thread normalizer
├── node context + screenshot loader
├── Markdown / JSON task renderer
├── atomic local state store
└── safe reply writer
```

The CLI deliberately does **not** embed an LLM. Pin2Patch handles authentication, retrieval, normalization, caching, and controlled write-back. Codex handles repository search, implementation reasoning, and testing. The separation keeps the integration deterministic and makes the same CLI useful to multiple terminal agents.

## Safety model

- Comments are rendered as **untrusted external input**.
- Pin2Patch never executes commands found in comments.
- `FIGMA_TOKEN` is read at request time and never persisted.
- All reply operations are previews unless `--send` is present.
- Fixture tasks can never be sent remotely.
- Node and image failures degrade to text-only tasks.
- `.pin2patch/` and `.env*` are ignored by Git.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run check
```

Run without building:

```bash
npm run dev -- pull \
  "https://www.figma.com/design/demoFileKey/Pin2Patch-Demo" \
  --fixture-dir fixtures/figma
```

## Supported platforms

Pin2Patch targets macOS, Linux, and Windows environments with Node.js 20+. It has no database, browser extension, Figma plugin, or hosted backend.

## Current limitations

- OAuth and multi-account configuration are not part of the MVP.
- Pin2Patch does not edit the Figma canvas.
- It does not claim to resolve comments because no public resolve endpoint is used.
- A live demo file and user token must be supplied by the evaluator for remote writes.
- Rate limits depend on Figma plan, seat, endpoint tier, and requested resource; local caching and `--no-image` reduce avoidable calls.

## How Codex and GPT-5.6 are used

Codex with GPT-5.6 was used to shape the scope, translate the workflow into a PRD and technical specification, implement the typed CLI, design fixtures, generate automated tests, diagnose failures, and prepare the Devpost narrative. In the product workflow, Codex consumes `task.md`, maps the review to the relevant code, implements the patch, runs checks, and writes the evidence returned through Pin2Patch.

## License

MIT

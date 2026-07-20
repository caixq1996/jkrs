# Pin2Patch — Technical Specification

## 1. Architecture goals

- Keep the remote integration deterministic and thin.
- Separate data retrieval from domain normalization and rendering.
- Use the same domain pipeline for live Figma data and fixtures.
- Make every remote write explicit.
- Keep the package installable with Node.js alone.

## 2. Chosen stack

- **Runtime:** Node.js 20 or newer.
- **Language:** TypeScript with strict checking and ESM.
- **CLI parser:** Commander.
- **Runtime validation:** Zod.
- **HTTP:** Native `fetch` and `AbortController`.
- **Tests:** Vitest for the CLI/domain modules; Node's built-in test runner for the isolated demo app.
- **Build:** TypeScript compiler to `dist/`.
- **Persistence:** Versioned JSON files under `.pin2patch/`.
- **Deployment:** Local CLI; no hosted URL required.

## 3. PRD-to-component map

| PRD epic | Components |
|---|---|
| Epic A — First-run confidence | `commands/doctor.ts`, URL parser, environment checks |
| Epic B — Import review threads | `figma/client.ts`, `figma/schemas.ts`, `domain/threads.ts` |
| Epic C — Durable agent tasks | `render/task-markdown.ts`, `io/task-writer.ts`, `io/state-store.ts` |
| Epic D — Safe replies | `commands/reply.ts`, `figma/client.ts`, state lookup |
| Epic E — Offline experience | `figma/fixture-client.ts`, `fixtures/figma/`, demo app |
| Epic F — Reliability/privacy | `errors.ts`, output adapter, redaction-safe state contracts |

## 4. CLI contracts

### `pin2patch doctor [figma-url]`

Options:

- `--json`: emit a JSON result.
- `--cwd <path>`: inspect a different working directory.

Exit behavior:

- `0` when the runtime is usable; warnings such as a missing token do not fail when no live request was requested.
- `2` for invalid command input.

### `pin2patch pull <figma-url>`

Options:

- `--all`: include resolved root threads.
- `--no-image`: skip image rendering/download.
- `--refresh`: ignore cached task assets.
- `--output <dir>`: default `.pin2patch`.
- `--fixture-dir <dir>`: use fixture data instead of remote requests.
- `--json`: emit a machine-readable summary only.

Success response shape:

```ts
interface PullSummary {
  schema_version: "1";
  source: "figma" | "fixture";
  file_key: string;
  source_url: string;
  pulled: number;
  skipped_resolved: number;
  warnings: string[];
  tasks: Array<{
    root_comment_id: string;
    node_id?: string;
    node_name?: string;
    task_path: string;
    json_path: string;
    screenshot_path?: string;
  }>;
}
```

### `pin2patch reply <comment-id>`

Options:

- `--message <text>` or `--message-file <path>`; exactly one is required.
- `--send`: perform the remote write. Omission means dry-run.
- `--file-key <key>` and `--root-comment-id <id>`: explicit recovery path when no local state exists.
- `--state-dir <dir>`: default `.pin2patch`.
- `--json`: emit structured output.

Fixture-backed tasks cannot be sent.

## 5. Figma API integration

Base URL: `https://api.figma.com/v1`.

Authentication header:

```http
X-Figma-Token: <FIGMA_TOKEN>
```

Endpoints used:

1. `GET /files/:key/comments?as_md=true`
   - Required scope: `file_comments:read`.
   - Hard dependency for a live pull.
2. `GET /files/:key/nodes?ids=<comma-separated>&depth=1`
   - Required scope: `file_content:read`.
   - Degrades to text-only tasks on failure.
3. `GET /images/:key?ids=<comma-separated>&format=png&scale=1`
   - Required scope: `file_content:read`.
   - URLs are downloaded immediately and are never persisted in state.
4. `POST /files/:key/comments`
   - Required scope: `file_comments:write`.
   - Body: `{ "message": string, "comment_id": rootCommentId }`.
   - Only root comments are valid reply targets.

HTTP requests use an abort timeout. Non-2xx responses become typed errors. A 429 error captures `Retry-After`.

## 6. Runtime data contracts

### Comment

The validator accepts Figma's documented fields and ignores unknown additions:

```ts
interface FigmaComment {
  id: string;
  message: string;
  parent_id?: string;
  created_at?: string;
  resolved_at?: string;
  user?: { id?: string; handle?: string; img_url?: string };
  client_meta?: {
    node_id?: string;
    node_offset?: { x?: number; y?: number };
    [key: string]: unknown;
  };
}
```

### Thread

```ts
interface ReviewThread {
  root: FigmaComment;
  replies: FigmaComment[];
  allCommentIds: string[];
  resolved: boolean;
  nodeId?: string;
  orphaned: boolean;
}
```

### Node context

```ts
interface NodeContext {
  id: string;
  name?: string;
  type?: string;
  width?: number;
  height?: number;
  sourceUrl: string;
}
```

Dimensions come from `absoluteBoundingBox` when present.

### Task JSON schema

```ts
interface TaskArtifact {
  schema_version: "1";
  source: "figma" | "fixture";
  file_key: string;
  source_url: string;
  root_comment_id: string;
  comment_ids: string[];
  resolved: boolean;
  pulled_at: string;
  messages: Array<{
    id: string;
    author: string;
    created_at?: string;
    message: string;
    is_root: boolean;
  }>;
  node?: NodeContext;
  screenshot_path?: string;
  safety: {
    trust: "untrusted-external-input";
    note: string;
  };
}
```

### State schema

```ts
interface Pin2PatchState {
  schema_version: "1";
  updated_at: string;
  tasks: Record<string, {
    source: "figma" | "fixture";
    file_key: string;
    source_url: string;
    root_comment_id: string;
    comment_ids: string[];
    task_path: string;
    json_path: string;
    screenshot_path?: string;
    pulled_at: string;
    last_reply_at?: string;
  }>;
  comment_index: Record<string, string>; // any comment ID → root ID
}
```

## 7. File structure

```text
pin2patch/
├── src/
│   ├── cli.ts                       command registration and top-level error boundary
│   ├── errors.ts                    typed user-facing errors and exit codes
│   ├── output.ts                    human/JSON output adapter
│   ├── commands/
│   │   ├── doctor.ts                environment readiness checks
│   │   ├── pull.ts                  orchestration of the read pipeline
│   │   └── reply.ts                 preview and explicit write workflow
│   ├── config/
│   │   └── paths.ts                 output/state path resolution
│   ├── figma/
│   │   ├── client.ts                live HTTP client
│   │   ├── fixture-client.ts        API-shaped local data source
│   │   ├── schemas.ts               Zod response validation
│   │   └── types.ts                 client interface and transport models
│   ├── domain/
│   │   ├── figma-url.ts             URL parsing and node URL generation
│   │   ├── threads.ts               grouping/filtering logic
│   │   └── task.ts                  domain task assembly
│   ├── render/
│   │   └── task-markdown.ts         stable agent-readable Markdown
│   └── io/
│       ├── files.ts                 atomic JSON/text writes and image copying
│       ├── state-store.ts           validated state merge/lookups
│       └── task-writer.ts           task directory writer
├── tests/                            unit and orchestration tests
├── fixtures/figma/                   judge-safe API fixtures and local screenshot
├── demo/checkout-app/                reproducible patch target
├── docs/hackathon-build/             scope, PRD, spec, checklist, notes
└── README.md                          installation, demo, architecture, Codex usage
```

## 8. Data flow

### Pull lifecycle

1. CLI parses the Figma URL into a file key.
2. Command chooses `FigmaApiClient` or `FixtureFigmaClient`.
3. Client returns validated comments.
4. Domain logic groups and filters threads.
5. Distinct node IDs are requested once.
6. Distinct render URLs or fixture files are obtained once.
7. Domain logic creates task artifacts.
8. Writer creates or updates each task directory without deleting user files.
9. State store merges task records and comment indexes atomically.
10. Output adapter prints human text or one JSON object.

### Reply lifecycle

1. CLI validates exactly one message source.
2. State resolves any supplied comment ID to its root task.
3. Command constructs the exact preview.
4. Without `--send`, output returns `sent: false` and exits successfully.
5. With `--send`, fixture sources are rejected.
6. Live client posts to the stored file key and root ID.
7. State records `last_reply_at` without storing message contents or credentials.

## 9. Error strategy

| Exit | Category | Examples |
|---:|---|---|
| 2 | validation | invalid URL, conflicting options, empty message |
| 3 | authentication | missing or invalid token |
| 4 | remote resource | permission denied, file/comment not found |
| 5 | rate limit | Figma HTTP 429, includes retry hint |
| 6 | network | timeout, DNS, connection failure |
| 7 | filesystem/state | unwritable output, malformed local state |
| 1 | unexpected | uncategorized error; stack shown only in debug mode |

## 10. Security controls

- Never log request headers.
- Never write the token to state, task artifacts, fixtures, or errors.
- Treat all comment text as quoted untrusted input.
- Do not execute shell commands found in comments.
- Perform remote writes only under `--send`.
- Reject live sends from fixture records.
- Use atomic temp-file replacement for state and JSON task writes.
- Ignore `.pin2patch/` and `.env*` in Git.

## 11. Test strategy

Unit tests:

- URL parsing and node URL construction.
- Comment grouping, ordering, unresolved filtering, and orphan handling.
- Task Markdown escaping and safety section.
- State merging and comment-index lookup.
- Figma error mapping and token redaction.

Command-level tests:

- Fixture pull writes expected artifacts.
- `--no-image` produces no image.
- A second pull preserves `result.md`.
- Reply is a dry run by default.
- Fixture `--send` is rejected.
- Missing token in live mode exits with authentication error.

Manual live verification:

- Pull one real Figma file with one pinned unresolved comment.
- Confirm `node.png` matches the pin target.
- Preview a reply.
- Send a reply and verify it appears beneath the original root comment.

## 12. Demo design

The repository ships a fixture representing a mobile checkout review. The sample app can be reset to a known “before” state. The generated task asks for:

- price below title on mobile;
- 16px horizontal padding;
- reuse of the secondary-button class;
- unchanged desktop layout;
- passing tests.

The demo records Codex reading the task, patching the sample, running the test, generating `result.md`, and previewing the reply. A real Figma send is shown only when a user-supplied token and file are available.

## 13. Dependency documentation

- Commander: https://github.com/tj/commander.js
- Zod: https://zod.dev/
- Vitest: https://vitest.dev/
- Figma comments API: https://developers.figma.com/docs/rest-api/comments-endpoints/
- Figma file/nodes/images API: https://developers.figma.com/docs/rest-api/file-endpoints/
- Figma scopes: https://developers.figma.com/docs/rest-api/scopes/

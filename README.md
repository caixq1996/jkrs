# Pin2Patch

Pin2Patch is an agent-native CLI for the handoff between Figma reviewers and terminal coding agents such as Codex.

It turns a Figma review thread, pinned node metadata, and optional screenshot into local `task.md` and `task.json` files. After a patch is implemented and tested, it previews and, only with explicit `--send`, posts the implementation evidence back to the original Figma root comment thread.

## Core workflow

```text
Figma comment pin
  -> pin2patch pull
  -> task.md + task.json + node.png
  -> Codex implements and tests the patch
  -> pin2patch reply dry-run
  -> pin2patch reply --send
  -> evidence appears in the original Figma thread
```

## Status

This repository is the public code-home for the OpenAI Build Week project **Pin2Patch**. The local MVP was built as a TypeScript CLI with:

- `pin2patch doctor [figma-url]`
- `pin2patch pull <figma-url>`
- `pin2patch reply <comment-id>`
- live Figma REST transport
- credential-free fixture transport
- Markdown and JSON task rendering
- atomic local state
- default dry-run reply behavior
- test coverage for URL parsing, thread grouping, fixture transport, pull, reply, state, rendering, and doctor checks

## Judge-safe local test path

The packaged MVP supports this path:

```bash
npm install
npm run check
npm run build

node dist/cli.js pull \
  "https://www.figma.com/design/demoFileKey/Pin2Patch-Demo" \
  --fixture-dir fixtures/figma

node dist/cli.js reply 813729 \
  --message "Implemented and verified. Tests: 4 passed."
```

The fixture pull creates `.pin2patch/tasks/813729/task.md`, `task.json`, and `node.png`; the reply command is a dry run unless `--send` is explicitly supplied.

## Safety model

- Figma comments are treated as untrusted external input.
- The CLI never executes commands from comments.
- `FIGMA_TOKEN` is read from the environment and never written to task artifacts.
- Fixture-backed tasks hard-refuse remote writes.
- Live writes require explicit `--send`.

## Devpost

Project page: https://devpost.com/software/pin2patch

## License

MIT

# YouTube upload copy

## Title

Pin2Patch — From Figma Comment to Tested Commit with Codex and GPT-5.6

## Visibility

Public

## Description

Pin2Patch is an agent-native CLI that converts a Figma review thread, pinned node context, and screenshot into durable Markdown and JSON tasks for coding agents. Codex with GPT-5.6 implements and tests the requested change, while Pin2Patch keeps retrieval, local state, dry-run previews, and explicit Figma write-back deterministic.

Demo workflow:

1. Pull an unresolved Figma review into `task.md`, `task.json`, and `node.png`.
2. Let Codex with GPT-5.6 inspect the repository, implement the smallest relevant patch, and run focused checks.
3. Preview the result reply safely.
4. Send implementation and test evidence back to the original Figma root thread only with explicit approval.

Repository: https://github.com/caixq1996/Pin2Patch
Devpost: https://devpost.com/software/pin2patch

Built for OpenAI Build Week 2026.

## Chapters

00:00 Problem and product promise
00:11 The manual Figma-to-agent handoff
00:26 Pulling a review thread
00:39 Agent-ready task artifacts
00:53 How Codex and GPT-5.6 are used
01:11 Reproducible failing state
01:25 Passing the acceptance checks
01:39 Safe dry-run and explicit write-back
01:54 Judge-safe testing path
02:09 Closing workflow

## Files

- Video: `assets/pin2patch-demo-natural-voice.mp4`
- Captions: `assets/pin2patch-demo-natural-voice.srt`
- Voice preview: `assets/pin2patch-natural-voice-preview.mp3`

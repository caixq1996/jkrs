#!/usr/bin/env node
import { Command, CommanderError } from "commander";
import { AppError, validationError } from "./errors.js";
import { runDoctor } from "./commands/doctor.js";
import { runPull } from "./commands/pull.js";
import { runReply } from "./commands/reply.js";
import { toErrorPayload, writeHuman, writeJson } from "./output.js";

const program = new Command();
program
  .name("pin2patch")
  .description("Turn Figma comment pins into agent-ready tasks and verified reply evidence.")
  .version("0.1.0")
  .option("--debug", "show stack traces for unexpected errors")
  .exitOverride();

program
  .command("doctor")
  .description("Check local runtime, Git, token presence, and an optional Figma URL")
  .argument("[figma-url]", "optional Figma file URL to validate")
  .option("--cwd <path>", "working directory to inspect")
  .option("--json", "emit machine-readable JSON")
  .action(async (figmaUrl: string | undefined, options: { cwd?: string; json?: boolean }) => {
    await runDoctor(figmaUrl, options);
  });

program
  .command("pull")
  .description("Pull Figma review threads into local Markdown and JSON task packages")
  .argument("<figma-url>", "Figma file URL")
  .option("--all", "include resolved threads")
  .option("--no-image", "skip node screenshot rendering")
  .option("--refresh", "refresh cached screenshots")
  .option("--output <dir>", "output/state directory", ".pin2patch")
  .option("--fixture-dir <dir>", "load API-shaped fixture data instead of calling Figma")
  .option("--cwd <path>", "working directory")
  .option("--json", "emit machine-readable JSON")
  .action(
    async (
      figmaUrl: string,
      options: {
        all?: boolean;
        image?: boolean;
        refresh?: boolean;
        output?: string;
        fixtureDir?: string;
        cwd?: string;
        json?: boolean;
      },
    ) => {
      await runPull(figmaUrl, options);
    },
  );

program
  .command("reply")
  .description("Preview or explicitly post implementation evidence to a Figma root comment thread")
  .argument("<comment-id>", "root or reply comment ID from a pulled task")
  .option("--message <text>", "reply text")
  .option("--message-file <path>", "read reply text from a file")
  .option("--send", "perform the remote write; omission is a dry run")
  .option("--file-key <key>", "explicit file key when local state is unavailable")
  .option("--root-comment-id <id>", "explicit root comment ID when local state is unavailable")
  .option("--state-dir <dir>", "output/state directory", ".pin2patch")
  .option("--cwd <path>", "working directory")
  .option("--json", "emit machine-readable JSON")
  .action(
    async (
      commentId: string,
      options: {
        message?: string;
        messageFile?: string;
        send?: boolean;
        fileKey?: string;
        rootCommentId?: string;
        stateDir?: string;
        cwd?: string;
        json?: boolean;
      },
    ) => {
      await runReply(commentId, options);
    },
  );

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === "commander.helpDisplayed" || error.code === "commander.version") return;
      error = validationError(error.message);
    }
    const appError = error instanceof AppError ? error : new AppError({
      category: "unexpected",
      message: error instanceof Error ? error.message : "Unexpected error",
      ...(error === undefined ? {} : { cause: error }),
    });
    const jsonMode = process.argv.includes("--json");
    const debug = process.argv.includes("--debug");
    if (jsonMode) {
      writeJson(toErrorPayload(appError), process.stderr);
    } else {
      writeHuman(`Error [${appError.category}]: ${appError.message}`, process.stderr);
      if (appError.hint) writeHuman(`Hint: ${appError.hint}`, process.stderr);
      if (debug && appError.stack) writeHuman(appError.stack, process.stderr);
    }
    process.exitCode = appError.exitCode;
  }
}

await main();

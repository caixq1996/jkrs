import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseFigmaUrl } from "../domain/figma-url.js";
import { writeHuman, writeJson } from "../output.js";

const execFileAsync = promisify(execFile);

export type CheckStatus = "ok" | "warning" | "error";

export interface DoctorCheck {
  name: string;
  status: CheckStatus;
  message: string;
}

export interface DoctorSummary {
  schema_version: "1";
  ready: boolean;
  checks: DoctorCheck[];
}

export interface DoctorOptions {
  json?: boolean;
  cwd?: string;
  token?: string;
  nodeVersion?: string;
}

async function gitCheck(cwd: string): Promise<DoctorCheck> {
  try {
    await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], { cwd });
    return { name: "git", status: "ok", message: "Current directory is inside a Git work tree." };
  } catch {
    return {
      name: "git",
      status: "warning",
      message: "Current directory is not yet a Git work tree; local CLI use still works.",
    };
  }
}

export async function runDoctor(figmaUrl: string | undefined, options: DoctorOptions = {}): Promise<DoctorSummary> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const checks: DoctorCheck[] = [];
  const version = options.nodeVersion ?? process.versions.node;
  const major = Number(version.split(".")[0] ?? "0");
  checks.push({
    name: "node",
    status: major >= 20 ? "ok" : "error",
    message: major >= 20 ? `Node.js ${version} is supported.` : `Node.js ${version} is too old; Node 20+ is required.`,
  });

  const tokenPresent = Boolean((options.token ?? process.env.FIGMA_TOKEN ?? "").trim());
  checks.push({
    name: "figma_token",
    status: tokenPresent ? "ok" : "warning",
    message: tokenPresent
      ? "FIGMA_TOKEN is present (value hidden)."
      : "FIGMA_TOKEN is not set; live pulls and sends are unavailable, but fixture mode works.",
  });

  checks.push(await gitCheck(cwd));

  if (figmaUrl) {
    try {
      const parsed = parseFigmaUrl(figmaUrl);
      checks.push({
        name: "figma_url",
        status: "ok",
        message: `Figma URL parsed successfully; file key is ${parsed.fileKey}.`,
      });
    } catch (error) {
      checks.push({
        name: "figma_url",
        status: "error",
        message: error instanceof Error ? error.message : "Figma URL is invalid.",
      });
    }
  }

  const summary: DoctorSummary = {
    schema_version: "1",
    ready: checks.every((check) => check.status !== "error"),
    checks,
  };

  if (options.json) {
    writeJson({ ok: true, ...summary });
  } else {
    writeHuman(`Pin2Patch doctor: ${summary.ready ? "ready" : "action required"}`);
    for (const check of checks) {
      const marker = check.status === "ok" ? "✓" : check.status === "warning" ? "!" : "×";
      writeHuman(`${marker} ${check.name}: ${check.message}`);
    }
  }
  return summary;
}

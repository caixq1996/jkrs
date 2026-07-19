import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runPull } from "../src/commands/pull.js";

const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

afterEach(() => {
  stdoutSpy.mockClear();
  stderrSpy.mockClear();
});

describe("runPull", () => {
  it("writes one unresolved fixture task with image and preserves user files", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "pin2patch-pull-"));
    const summary = await runPull("https://www.figma.com/design/demoFileKey/Pin2Patch-Demo", {
      cwd,
      fixtureDir: path.resolve("fixtures/figma"),
      json: true,
    });
    expect(summary.pulled).toBe(1);
    expect(summary.skipped_resolved).toBe(1);
    const taskDir = path.join(cwd, ".pin2patch/tasks/813729");
    const task = JSON.parse(await readFile(path.join(taskDir, "task.json"), "utf8")) as {
      screenshot_path?: string;
    };
    expect(task.screenshot_path).toBe("node.png");
    await writeFile(path.join(taskDir, "result.md"), "keep me", "utf8");
    await runPull("https://www.figma.com/design/demoFileKey/Pin2Patch-Demo", {
      cwd,
      fixtureDir: path.resolve("fixtures/figma"),
      json: true,
    });
    expect(await readFile(path.join(taskDir, "result.md"), "utf8")).toBe("keep me");
  });

  it("can skip images", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "pin2patch-pull-no-image-"));
    const summary = await runPull("https://www.figma.com/design/demoFileKey/Pin2Patch-Demo", {
      cwd,
      fixtureDir: path.resolve("fixtures/figma"),
      image: false,
      json: true,
    });
    expect(summary.tasks[0]?.screenshot_path).toBeUndefined();
  });
});

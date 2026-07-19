import { afterEach, describe, expect, it, vi } from "vitest";
import { runDoctor } from "../src/commands/doctor.js";

const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
afterEach(() => stdoutSpy.mockClear());

describe("runDoctor", () => {
  it("accepts fixture-ready environments without a token", async () => {
    const result = await runDoctor("https://www.figma.com/design/demoFileKey/Demo", {
      json: true,
      token: "",
      nodeVersion: "22.0.0",
    });
    expect(result.ready).toBe(true);
    expect(result.checks.find((check) => check.name === "figma_token")?.status).toBe("warning");
  });
});

import { describe, expect, it } from "vitest";
import { buildNodeUrl, parseFigmaUrl } from "../src/domain/figma-url.js";
import { AppError } from "../src/errors.js";

describe("parseFigmaUrl", () => {
  it.each(["design", "file", "proto", "board"])("parses %s URLs", (kind) => {
    const parsed = parseFigmaUrl(`https://www.figma.com/${kind}/abcDEF123/My-File?node-id=12-34`);
    expect(parsed.fileKey).toBe("abcDEF123");
    expect(parsed.nodeId).toBe("12:34");
    expect(parsed.fileType).toBe(kind);
  });

  it("rejects non-Figma hosts", () => {
    expect(() => parseFigmaUrl("https://example.com/design/key/name")).toThrow(AppError);
  });

  it("builds a node deep link with Figma URL node formatting", () => {
    const parsed = parseFigmaUrl("https://www.figma.com/design/abcDEF123/My-File");
    expect(buildNodeUrl(parsed, "12:34")).toBe(
      "https://www.figma.com/design/abcDEF123/My-File?node-id=12-34",
    );
  });
});

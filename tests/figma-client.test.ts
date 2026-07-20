import { describe, expect, it } from "vitest";
import { FigmaApiClient } from "../src/figma/client.js";
import { AppError } from "../src/errors.js";

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(headers ?? {}) },
  });
}

describe("FigmaApiClient", () => {
  it("reads comments with the token hidden inside the request layer", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push([input, init]);
      return jsonResponse({ comments: [{ id: "1", message: "hello" }] });
    };
    const token = ["unit", "test", "credential"].join("-");
    const client = new FigmaApiClient({ token, fetchImpl });
    const comments = await client.getComments("file");
    expect(comments[0]?.id).toBe("1");
    expect(calls).toHaveLength(1);
    const init = calls[0]?.[1];
    expect((init?.headers as Record<string, string>)["X-Figma-Token"]).toBe(token);
  });

  it("maps rate limits without leaking the token", async () => {
    const fetchImpl: typeof fetch = async () =>
      jsonResponse({ message: "Too many requests" }, 429, { "retry-after": "60" });
    const token = ["unit", "test", "credential"].join("-");
    const client = new FigmaApiClient({ token, fetchImpl });
    await expect(client.getComments("file")).rejects.toMatchObject({ category: "rate_limit" });
    try {
      await client.getComments("file");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(String(error)).not.toContain(token);
    }
  });
});

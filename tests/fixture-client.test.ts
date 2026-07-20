import { describe, expect, it } from "vitest";
import path from "node:path";
import { FixtureFigmaClient } from "../src/figma/fixture-client.js";

const fixtures = path.resolve("fixtures/figma");

describe("FixtureFigmaClient", () => {
  it("loads API-shaped comments, nodes, and local images", async () => {
    const client = new FixtureFigmaClient(fixtures);
    const comments = await client.getComments("ignored");
    expect(comments).toHaveLength(3);
    const nodes = await client.getNodes("ignored", ["123:456"]);
    expect(nodes.get("123:456")?.name).toBe("Checkout / Mobile");
    const images = await client.getImages("ignored", ["123:456"]);
    expect(images.get("123:456")?.kind).toBe("local");
  });
});

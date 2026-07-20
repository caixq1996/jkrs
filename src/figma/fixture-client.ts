import path from "node:path";
import { readFile } from "node:fs/promises";
import { AppError, filesystemError } from "../errors.js";
import {
  commentsResponseSchema,
  fixtureImageMapSchema,
  nodesResponseSchema,
} from "./schemas.js";
import type { FigmaComment } from "./schemas.js";
import type { FigmaDataSource, ImageSource, NodeTransport } from "./types.js";

export class FixtureFigmaClient implements FigmaDataSource {
  readonly source = "fixture" as const;

  constructor(private readonly fixtureDir: string) {}

  async getComments(_fileKey: string): Promise<FigmaComment[]> {
    const value = await this.readJson("comments.json");
    return commentsResponseSchema.parse(value).comments;
  }

  async getNodes(_fileKey: string, nodeIds: string[]): Promise<Map<string, NodeTransport>> {
    if (nodeIds.length === 0) return new Map();
    const parsed = nodesResponseSchema.parse(await this.readJson("nodes.json"));
    const result = new Map<string, NodeTransport>();
    for (const nodeId of nodeIds) {
      const entry = parsed.nodes[nodeId];
      if (!entry) continue;
      const box = entry.document.absoluteBoundingBox;
      result.set(nodeId, {
        id: entry.document.id,
        ...(entry.document.name ? { name: entry.document.name } : {}),
        ...(entry.document.type ? { type: entry.document.type } : {}),
        ...(box?.width !== undefined ? { width: box.width } : {}),
        ...(box?.height !== undefined ? { height: box.height } : {}),
      });
    }
    return result;
  }

  async getImages(_fileKey: string, nodeIds: string[]): Promise<Map<string, ImageSource>> {
    if (nodeIds.length === 0) return new Map();
    const parsed = fixtureImageMapSchema.parse(await this.readJson("images.json"));
    const result = new Map<string, ImageSource>();
    for (const nodeId of nodeIds) {
      const relativePath = parsed.images[nodeId];
      if (!relativePath) continue;
      result.set(nodeId, { kind: "local", value: path.resolve(this.fixtureDir, relativePath) });
    }
    return result;
  }

  async postReply(): Promise<FigmaComment> {
    throw new AppError({
      category: "validation",
      message: "Fixture tasks cannot be sent to Figma.",
      hint: "Use reply without --send to demonstrate the safe preview, or pull a real Figma file first.",
    });
  }

  private async readJson(fileName: string): Promise<unknown> {
    const filePath = path.resolve(this.fixtureDir, fileName);
    try {
      return JSON.parse(await readFile(filePath, "utf8")) as unknown;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw filesystemError(`Invalid JSON fixture: ${filePath}`, error);
      }
      throw filesystemError(`Could not read fixture: ${filePath}`, error);
    }
  }
}

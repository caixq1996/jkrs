import { AppError } from "../errors.js";
import {
  commentsResponseSchema,
  imagesResponseSchema,
  nodesResponseSchema,
  postedCommentSchema,
} from "./schemas.js";
import type { FigmaDataSource, ImageSource, NodeTransport } from "./types.js";

export interface FigmaApiClientOptions {
  token: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class FigmaApiClient implements FigmaDataSource {
  readonly source = "figma" as const;
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: FigmaApiClientOptions) {
    if (!options.token.trim()) {
      throw new AppError({
        category: "authentication",
        message: "FIGMA_TOKEN is missing.",
        hint: "Export a scoped Figma personal access token, or use --fixture-dir for the credential-free demo.",
      });
    }
    this.token = options.token;
    this.baseUrl = (options.baseUrl ?? "https://api.figma.com/v1").replace(/\/$/u, "");
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getComments(fileKey: string) {
    const response = await this.request(`/files/${encodeURIComponent(fileKey)}/comments?as_md=true`);
    return commentsResponseSchema.parse(await response.json()).comments;
  }

  async getNodes(fileKey: string, nodeIds: string[]): Promise<Map<string, NodeTransport>> {
    if (nodeIds.length === 0) return new Map();
    const params = new URLSearchParams({ ids: nodeIds.join(","), depth: "1" });
    const response = await this.request(`/files/${encodeURIComponent(fileKey)}/nodes?${params.toString()}`);
    const parsed = nodesResponseSchema.parse(await response.json());
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

  async getImages(fileKey: string, nodeIds: string[]): Promise<Map<string, ImageSource>> {
    if (nodeIds.length === 0) return new Map();
    const params = new URLSearchParams({ ids: nodeIds.join(","), format: "png", scale: "1" });
    const response = await this.request(`/images/${encodeURIComponent(fileKey)}?${params.toString()}`);
    const parsed = imagesResponseSchema.parse(await response.json());
    const result = new Map<string, ImageSource>();
    for (const [nodeId, value] of Object.entries(parsed.images)) {
      if (value) result.set(nodeId, { kind: "remote", value });
    }
    return result;
  }

  async postReply(fileKey: string, rootCommentId: string, message: string) {
    const response = await this.request(`/files/${encodeURIComponent(fileKey)}/comments`, {
      method: "POST",
      body: JSON.stringify({ message, comment_id: rootCommentId }),
      headers: { "Content-Type": "application/json" },
    });
    return postedCommentSchema.parse(await response.json());
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          "X-Figma-Token": this.token,
          Accept: "application/json",
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
      });
      if (!response.ok) throw await this.mapHttpError(response);
      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new AppError({
          category: "network",
          message: `Figma request timed out after ${this.timeoutMs} ms.`,
          hint: "Retry the command or use fixture mode while preparing the demo.",
        });
      }
      throw new AppError({
        category: "network",
        message: "Could not reach the Figma API.",
        hint: "Check the network connection and retry.",
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async mapHttpError(response: Response): Promise<AppError> {
    const retryAfter = response.headers.get("retry-after") ?? undefined;
    let remoteMessage: string | undefined;
    try {
      const body = (await response.json()) as Record<string, unknown>;
      const candidate = body.err ?? body.message ?? body.error;
      if (typeof candidate === "string") remoteMessage = candidate;
    } catch {
      // Keep the user-facing error free of potentially sensitive raw response bodies.
    }

    if (response.status === 401 || response.status === 403) {
      return new AppError({
        category: "authentication",
        message: `Figma rejected the request (${response.status}).${remoteMessage ? ` ${remoteMessage}` : ""}`,
        hint: "Check token expiry, scopes, and access to the target file.",
      });
    }
    if (response.status === 404) {
      return new AppError({
        category: "remote",
        message: `Figma resource was not found.${remoteMessage ? ` ${remoteMessage}` : ""}`,
        hint: "Check the file key, comment ID, and file sharing permissions.",
      });
    }
    if (response.status === 429) {
      return new AppError({
        category: "rate_limit",
        message: `Figma rate limit reached.${remoteMessage ? ` ${remoteMessage}` : ""}`,
        hint: retryAfter ? `Retry after ${retryAfter}.` : "Retry later or reuse cached task assets.",
        ...(retryAfter ? { details: { retry_after: retryAfter } } : {}),
      });
    }
    return new AppError({
      category: "remote",
      message: `Figma API returned HTTP ${response.status}.${remoteMessage ? ` ${remoteMessage}` : ""}`,
    });
  }
}

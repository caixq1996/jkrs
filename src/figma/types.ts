import type { FigmaComment } from "./schemas.js";

export interface NodeTransport {
  id: string;
  name?: string;
  type?: string;
  width?: number;
  height?: number;
}

export interface ImageSource {
  kind: "remote" | "local";
  value: string;
}

export interface FigmaDataSource {
  readonly source: "figma" | "fixture";
  getComments(fileKey: string): Promise<FigmaComment[]>;
  getNodes(fileKey: string, nodeIds: string[]): Promise<Map<string, NodeTransport>>;
  getImages(fileKey: string, nodeIds: string[]): Promise<Map<string, ImageSource>>;
  postReply(fileKey: string, rootCommentId: string, message: string): Promise<FigmaComment>;
}

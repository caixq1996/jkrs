import { validationError } from "../errors.js";

const SUPPORTED_FILE_TYPES = new Set(["design", "file", "proto", "board", "make"]);
const SUPPORTED_HOSTS = new Set(["figma.com", "www.figma.com"]);

export interface ParsedFigmaUrl {
  originalUrl: string;
  normalizedUrl: string;
  fileType: string;
  fileKey: string;
  fileName?: string;
  nodeId?: string;
}

function normalizeNodeId(value: string | null): string | undefined {
  if (!value) return undefined;
  const decoded = decodeURIComponent(value).trim();
  if (!decoded) return undefined;
  return decoded.replace(/-/gu, ":");
}

export function parseFigmaUrl(input: string): ParsedFigmaUrl {
  let url: URL;
  try {
    url = new URL(input);
  } catch (cause) {
    throw validationError(
      `Invalid Figma URL: ${input}`,
      "Paste a full URL such as https://www.figma.com/design/FILE_KEY/File-Name.",
    );
  }

  const hostname = url.hostname.toLowerCase();
  if (!SUPPORTED_HOSTS.has(hostname)) {
    throw validationError(
      `Unsupported Figma host: ${url.hostname}`,
      "Pin2Patch accepts figma.com and www.figma.com URLs.",
    );
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const fileType = segments[0];
  const fileKey = segments[1];
  if (!fileType || !SUPPORTED_FILE_TYPES.has(fileType) || !fileKey) {
    throw validationError(
      `Unsupported Figma URL path: ${url.pathname}`,
      "Expected /design/<file-key>/<name>, /file/<file-key>/<name>, /proto/<file-key>/<name>, or /board/<file-key>/<name>.",
    );
  }

  const fileName = segments[2] ? decodeURIComponent(segments[2]) : undefined;
  const nodeId = normalizeNodeId(url.searchParams.get("node-id"));
  const normalizedUrl = `${url.protocol}//${url.host}/${fileType}/${fileKey}${segments[2] ? `/${segments[2]}` : ""}`;

  return {
    originalUrl: input,
    normalizedUrl,
    fileType,
    fileKey,
    ...(fileName ? { fileName } : {}),
    ...(nodeId ? { nodeId } : {}),
  };
}

export function buildNodeUrl(parsed: ParsedFigmaUrl, nodeId?: string): string {
  const url = new URL(parsed.normalizedUrl);
  if (nodeId) url.searchParams.set("node-id", nodeId.replace(/:/gu, "-"));
  return url.toString();
}

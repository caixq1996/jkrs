import { z } from "zod";

export interface FigmaUser {
  id?: string;
  handle?: string;
  img_url?: string;
  [key: string]: unknown;
}

export interface FigmaClientMeta {
  node_id?: string;
  node_offset?: { x?: number | undefined; y?: number | undefined; [key: string]: unknown };
  [key: string]: unknown;
}

export interface FigmaComment {
  id: string;
  message: string;
  parent_id?: string;
  created_at?: string;
  resolved_at?: string;
  user?: FigmaUser;
  client_meta?: FigmaClientMeta;
  order_id?: string | number;
  [key: string]: unknown;
}

function stringOrUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
}

const rawUserSchema = z
  .object({
    id: z.union([z.string(), z.number()]).nullish(),
    handle: z.string().nullish(),
    img_url: z.string().nullish(),
  })
  .passthrough();

const rawClientMetaSchema = z
  .object({
    node_id: z.union([z.string(), z.number()]).nullish(),
    node_offset: z
      .object({
        x: z.number().optional(),
        y: z.number().optional(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough();

const rawCommentSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    message: z.string().default(""),
    parent_id: z.union([z.string(), z.number()]).nullish(),
    created_at: z.string().nullish(),
    resolved_at: z.string().nullish(),
    user: rawUserSchema.nullish(),
    client_meta: rawClientMetaSchema.nullish(),
    order_id: z.union([z.string(), z.number()]).nullish(),
  })
  .passthrough();

export const figmaCommentSchema = rawCommentSchema.transform((value): FigmaComment => {
  const {
    id,
    message,
    parent_id: parentIdRaw,
    created_at: createdAtRaw,
    resolved_at: resolvedAtRaw,
    user: userRaw,
    client_meta: clientMetaRaw,
    order_id: orderIdRaw,
    ...extra
  } = value;

  let user: FigmaUser | undefined;
  if (userRaw) {
    const { id: userIdRaw, handle: handleRaw, img_url: imageRaw, ...userExtra } = userRaw;
    const userId = stringOrUndefined(userIdRaw);
    const handle = stringOrUndefined(handleRaw);
    const imgUrl = stringOrUndefined(imageRaw);
    user = {
      ...userExtra,
      ...(userId ? { id: userId } : {}),
      ...(handle ? { handle } : {}),
      ...(imgUrl ? { img_url: imgUrl } : {}),
    };
  }

  let clientMeta: FigmaClientMeta | undefined;
  if (clientMetaRaw) {
    const { node_id: nodeIdRaw, node_offset: nodeOffsetRaw, ...metaExtra } = clientMetaRaw;
    const nodeId = stringOrUndefined(nodeIdRaw);
    clientMeta = {
      ...metaExtra,
      ...(nodeId ? { node_id: nodeId } : {}),
      ...(nodeOffsetRaw ? { node_offset: nodeOffsetRaw } : {}),
    };
  }

  const parentId = stringOrUndefined(parentIdRaw);
  const createdAt = stringOrUndefined(createdAtRaw);
  const resolvedAt = stringOrUndefined(resolvedAtRaw);
  return {
    ...extra,
    id: String(id),
    message,
    ...(parentId ? { parent_id: parentId } : {}),
    ...(createdAt ? { created_at: createdAt } : {}),
    ...(resolvedAt ? { resolved_at: resolvedAt } : {}),
    ...(user ? { user } : {}),
    ...(clientMeta ? { client_meta: clientMeta } : {}),
    ...(orderIdRaw !== null && orderIdRaw !== undefined ? { order_id: orderIdRaw } : {}),
  };
});

export const commentsResponseSchema = z
  .object({
    comments: z.array(figmaCommentSchema),
  })
  .passthrough();

export const figmaNodeDocumentSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    absoluteBoundingBox: z
      .object({
        x: z.number().optional(),
        y: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export const nodeEntrySchema = z
  .object({
    document: figmaNodeDocumentSchema,
  })
  .passthrough();

export const nodesResponseSchema = z
  .object({
    name: z.string().optional(),
    nodes: z.record(z.string(), nodeEntrySchema.nullable()),
  })
  .passthrough();

export const imagesResponseSchema = z
  .object({
    images: z.record(z.string(), z.string().url().nullable()),
    err: z.string().nullable().optional(),
    status: z.number().optional(),
  })
  .passthrough();

export const postedCommentSchema = figmaCommentSchema;

export const fixtureImageMapSchema = z.object({
  images: z.record(z.string(), z.string()),
});

export type FigmaNodesResponse = z.infer<typeof nodesResponseSchema>;

import path from "node:path";
import { mkdir, readFile, rename, copyFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { filesystemError } from "../errors.js";
import type { ImageSource } from "../figma/types.js";

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw filesystemError(`Could not create directory: ${dirPath}`, error);
  }
}

export async function atomicWriteText(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(tempPath, content, "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    throw filesystemError(`Could not write file: ${filePath}`, error);
  }
}

export async function atomicWriteJson(filePath: string, value: unknown): Promise<void> {
  await atomicWriteText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readUtf8(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    throw filesystemError(`Could not read file: ${filePath}`, error);
  }
}

export async function materializeImage(
  source: ImageSource,
  destination: string,
  options: { refresh: boolean; fetchImpl?: typeof fetch } = { refresh: false },
): Promise<boolean> {
  if (!options.refresh && (await pathExists(destination))) return false;
  await ensureDir(path.dirname(destination));
  try {
    if (source.kind === "local") {
      await copyFile(source.value, destination);
      return true;
    }
    const response = await (options.fetchImpl ?? fetch)(source.value);
    if (!response.ok) {
      throw new Error(`Image download returned HTTP ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const tempPath = `${destination}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(tempPath, bytes);
    await rename(tempPath, destination);
    return true;
  } catch (error) {
    throw filesystemError(`Could not materialize screenshot: ${destination}`, error);
  }
}

import { AppError, asAppError } from "./errors.js";

export interface ErrorPayload {
  ok: false;
  error: {
    category: string;
    message: string;
    hint?: string;
    details?: Record<string, unknown>;
  };
}

export function writeJson(value: unknown, stream: NodeJS.WritableStream = process.stdout): void {
  stream.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function writeHuman(message: string, stream: NodeJS.WritableStream = process.stdout): void {
  stream.write(`${message.replace(/\s+$/u, "")}\n`);
}

export function toErrorPayload(error: AppError): ErrorPayload {
  return {
    ok: false,
    error: {
      category: error.category,
      message: error.message,
      ...(error.hint ? { hint: error.hint } : {}),
      ...(error.details ? { details: error.details } : {}),
    },
  };
}

export function handleCliError(error: unknown, jsonMode: boolean, debug = false): never {
  const appError = asAppError(error);
  if (jsonMode) {
    writeJson(toErrorPayload(appError), process.stderr);
  } else {
    writeHuman(`Error [${appError.category}]: ${appError.message}`, process.stderr);
    if (appError.hint) writeHuman(`Hint: ${appError.hint}`, process.stderr);
    if (debug && error instanceof Error && error.stack) {
      writeHuman(error.stack, process.stderr);
    }
  }
  process.exitCode = appError.exitCode;
  throw appError;
}

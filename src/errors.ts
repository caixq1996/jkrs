export type ErrorCategory =
  | "validation"
  | "authentication"
  | "remote"
  | "rate_limit"
  | "network"
  | "filesystem"
  | "unexpected";

export const EXIT_CODES: Record<ErrorCategory, number> = {
  validation: 2,
  authentication: 3,
  remote: 4,
  rate_limit: 5,
  network: 6,
  filesystem: 7,
  unexpected: 1,
};

export interface AppErrorOptions {
  category: ErrorCategory;
  message: string;
  hint?: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly category: ErrorCategory;
  readonly exitCode: number;
  readonly hint?: string;
  readonly details?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AppError";
    this.category = options.category;
    this.exitCode = EXIT_CODES[options.category];
    if (options.hint !== undefined) this.hint = options.hint;
    if (options.details !== undefined) this.details = options.details;
  }
}

export function asAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError({
      category: "unexpected",
      message: error.message || "Unexpected error",
      cause: error,
    });
  }
  return new AppError({
    category: "unexpected",
    message: "Unexpected non-error value was thrown",
    details: { valueType: typeof error },
  });
}

export function validationError(message: string, hint?: string): AppError {
  return new AppError({ category: "validation", message, ...(hint ? { hint } : {}) });
}

export function filesystemError(message: string, cause?: unknown, hint?: string): AppError {
  return new AppError({
    category: "filesystem",
    message,
    ...(hint ? { hint } : {}),
    ...(cause === undefined ? {} : { cause }),
  });
}

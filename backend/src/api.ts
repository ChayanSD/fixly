import type { Response } from "express";
import type { ZodError } from "zod";

export type ApiErrorCode =
  | "ai_failed"
  | "daily_limit_exceeded"
  | "service_unavailable"
  | "validation_error";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
  }
}

export function sendData<T>(response: Response, data: T, status = 200) {
  response.status(status).json({ data });
}

export function sendError(
  response: Response,
  status: number,
  code: ApiErrorCode,
  message: string,
  requestId: string,
  details?: unknown
) {
  response.status(status).json({
    error: {
      code,
      message,
      requestId,
      ...(details ? { details } : {})
    }
  });
}

export function zodDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    code: issue.code,
    field: issue.path.join("."),
    message: issue.message
  }));
}

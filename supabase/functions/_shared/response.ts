import { corsHeaders } from "./cors.ts";

// Standard envelope shapes used across all Edge Functions.
// Every response body follows one of these two shapes so the frontend
// can check `data.success` before consuming `data.data` or `data.error`.

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/** Return a 200 success envelope. */
export function ok<T>(data: T, status = 200): Response {
  const body: SuccessResponse<T> = { success: true, data };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Return an error envelope. */
export function err(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): Response {
  const isServerError = status >= 500;
  const body: ErrorResponse = {
    success: false,
    error: {
      code,
      message: isServerError
        ? "An unexpected server error occurred. Please try again later."
        : message,
      ...(!isServerError && details !== undefined ? { details } : {}),
    },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Wrap any unexpected throw as a 500. */
export function internalError(e: unknown): Response {
  void e;
  return err("INTERNAL_ERROR", "Unexpected server error", 500);
}

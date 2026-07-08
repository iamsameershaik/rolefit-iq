// Structured logger for Edge Functions.
// IMPORTANT: Never log raw_text content from CV or JD documents.
// Only log: counts, IDs, durations, statuses, model names, error messages.

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  level: LogLevel;
  function: string;
  message: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
  ts: string;
}

export function createLogger(functionName: string) {
  function log(
    level: LogLevel,
    message: string,
    opts?: { session_id?: string; metadata?: Record<string, unknown> }
  ) {
    const entry: LogEntry = {
      level,
      function: functionName,
      message,
      ts: new Date().toISOString(),
      ...opts,
    };
    // Deno Edge Runtime outputs structured JSON to stdout
    console.log(JSON.stringify(entry));
  }

  return {
    info:  (msg: string, opts?: { session_id?: string; metadata?: Record<string, unknown> }) => log("info",  msg, opts),
    warn:  (msg: string, opts?: { session_id?: string; metadata?: Record<string, unknown> }) => log("warn",  msg, opts),
    error: (msg: string, opts?: { session_id?: string; metadata?: Record<string, unknown> }) => log("error", msg, opts),
    debug: (msg: string, opts?: { session_id?: string; metadata?: Record<string, unknown> }) => log("debug", msg, opts),
  };
}

// Lightweight validation helpers — no external library needed.
// Each helper returns the validated value or throws a descriptive Error.

export function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required and must be a non-empty string`);
  }
  return value.trim();
}

export function optionalString(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string if provided`);
  }
  return value.trim() || null;
}

export function validateSessionId(value: unknown): string {
  if (typeof value !== "string" || !isUuid(value)) {
    throw new Error("session_id must be a valid UUID");
  }
  return value;
}

export function validateDocumentType(value: unknown): "resume" | "job_description" {
  if (value !== "resume" && value !== "job_description") {
    throw new Error('document_type must be "resume" or "job_description"');
  }
  return value;
}

export function validateJobIndex(
  value: unknown,
  documentType: string
): number | null {
  if (documentType === "resume") {
    if (value !== undefined && value !== null) {
      throw new Error("job_index must be null/absent for document_type resume");
    }
    return null;
  }
  // job_description
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 3) {
    throw new Error("job_index must be 1, 2, or 3 for document_type job_description");
  }
  return n;
}

export function validateRawTextLength(
  text: string,
  maxChars = 200_000
): void {
  if (text.length === 0) {
    throw new Error("raw_text must not be empty");
  }
  if (text.length > maxChars) {
    throw new Error(
      `raw_text exceeds maximum length of ${maxChars} characters (got ${text.length})`
    );
  }
}

// Basic UUID v4 shape check — not cryptographic, just format validation.
function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

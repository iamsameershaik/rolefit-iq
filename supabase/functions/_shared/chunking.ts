import type { ChunkRow } from "./types.ts";
import { CHUNKING } from "./constants.ts";

// ── Document chunking pipeline ────────────────────────────────────
//
// Strategy: section-aware sliding window
//
// Why section-aware (not fixed character splits):
//   Documents like CVs and JDs have clear sections (Skills, Experience, Requirements).
//   Keeping section content together in chunks produces semantically coherent vectors —
//   the embedding represents a complete thought rather than an arbitrary text slice.
//   Mid-sentence / mid-section splits degrade retrieval quality.
//
// Why overlap:
//   Key evidence near chunk boundaries would otherwise be split across two chunks,
//   with neither containing enough context to score well in similarity search.
//   ~120 tokens of overlap ensures boundary content is retrievable from either side.
//
// Why not LangChain / external libs:
//   The requirements are simple (paragraph split + heading detection + overlap).
//   Pulling in a large library for this adds cold-start latency, version-lock risk,
//   and Deno compatibility uncertainty. A 100-line custom splitter is more defensible.
//
// Async queueing path (future):
//   For large documents, the whole chunk+embed pipeline could move to a background
//   job (Supabase pg_cron, Upstash QStash, or AWS SQS) triggered after upload.
//   upload-document would then return immediately with status='pending' and the
//   client would poll get-session for the 'indexed' status.

export interface ChunkInput {
  session_id: string;
  document_id: string;
  document_type: string;
  job_index: number | null;
  raw_text: string;
}

export interface ChunkResult {
  session_id: string;
  document_id: string;
  document_type: string;
  job_index: number | null;
  section_label: string | null;
  chunk_index: number;
  content: string;
  token_estimate: number;
}

// Known section heading keywords for CVs and JDs (case-insensitive exact match).
// Kept as a flat Set for O(1) lookup after normalisation.
const KNOWN_HEADINGS = new Set([
  "summary", "profile", "objective", "career objective",
  "professional summary", "professional profile", "personal statement",
  "skills", "technical skills", "core skills", "key skills",
  "competencies", "core competencies",
  "experience", "work experience", "employment", "employment history",
  "career history", "professional experience",
  "projects", "key projects", "notable projects", "project experience", "side projects",
  "education", "qualifications", "academic background",
  "certifications", "certification", "training",
  "responsibilities", "key responsibilities", "role overview",
  "about the role", "the role",
  "requirements", "essential requirements",
  "nice to have", "desirable", "preferred",
  "about the company", "about the team", "about us", "who we are",
  "languages", "publications", "awards", "volunteering", "hobbies", "interests",
  "contact", "references",
]);

function isHeading(text: string): boolean {
  const t = text.trim();
  // Multi-line or very long → not a heading
  if (t.length === 0 || t.includes("\n") || t.length > 80) return false;

  // Known CV/JD section name
  if (KNOWN_HEADINGS.has(t.toLowerCase())) return true;

  // ALL CAPS line (≥ 3 chars, no lowercase letters) — common in CVs
  if (t.length >= 3 && t.length <= 50 && t === t.toUpperCase() && /[A-Z]/.test(t) && !/[a-z]/.test(t)) {
    return true;
  }

  return false;
}

function normaliseText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/ {3,}/g, "  ")   // collapse excessive spaces
    .replace(/\n{4,}/g, "\n\n\n") // collapse excessive blank lines
    .trim();
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split raw document text into retrieval-ready chunks with section labels.
 *
 * Returns ChunkResult[] ready for embedding and DB insert.
 * Returns [] if the text is too short to be worth chunking.
 */
export function chunkDocument(input: ChunkInput): ChunkResult[] {
  const { session_id, document_id, document_type, job_index, raw_text } = input;

  const text = normaliseText(raw_text);
  if (text.length < CHUNKING.MIN_CHUNK_CHARS) return [];

  // Split into paragraphs (blocks separated by one or more blank lines)
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: ChunkResult[] = [];
  let currentLabel: string | null = null;
  let buffer = "";
  let prevOverlap = ""; // carried into next chunk for context continuity

  function emit() {
    const content = buffer.trim();
    if (content.length < CHUNKING.MIN_CHUNK_CHARS) return;
    chunks.push({
      session_id,
      document_id,
      document_type,
      job_index,
      section_label: currentLabel,
      chunk_index: chunks.length,
      content,
      token_estimate: estimateTokens(content),
    });
    // Save tail for overlap in next chunk
    prevOverlap = content.slice(-CHUNKING.OVERLAP_CHARS);
    buffer = "";
  }

  for (const para of paragraphs) {
    if (isHeading(para)) {
      // Flush buffer before entering new section
      if (buffer.trim().length >= CHUNKING.MIN_CHUNK_CHARS) emit();
      currentLabel = para.slice(0, 60);
      // Don't carry overlap across section boundaries — sections are independent
      prevOverlap = "";
      continue;
    }

    const sep = buffer.length > 0 ? "\n\n" : "";

    // If adding this paragraph would exceed the hard cap, emit first
    if (buffer.length + sep.length + para.length > CHUNKING.MAX_CHUNK_CHARS) {
      if (buffer.trim().length >= CHUNKING.MIN_CHUNK_CHARS) emit();
      // Start new chunk with overlap context from previous chunk
      buffer = prevOverlap.length > 0 ? prevOverlap + "\n\n" + para : para;
    } else {
      buffer += sep + para;
    }

    // Emit when target size is reached (paragraph-boundary flush)
    if (buffer.length >= CHUNKING.TARGET_CHUNK_CHARS) {
      emit();
      buffer = prevOverlap;
    }
  }

  // Emit any remaining content
  if (buffer.trim().length >= CHUNKING.MIN_CHUNK_CHARS) emit();

  return chunks;
}

/**
 * Convert ChunkResult[] to database insert payloads (no embeddings yet).
 * Embeddings are added in a separate pass before the DB insert.
 */
export function toChunkRows(
  chunks: ChunkResult[]
): Omit<ChunkRow, "id" | "created_at" | "deleted_at" | "embedding">[] {
  return chunks.map((c) => ({
    session_id: c.session_id,
    document_id: c.document_id,
    document_type: c.document_type,
    job_index: c.job_index,
    section_label: c.section_label,
    chunk_index: c.chunk_index,
    content: c.content,
    token_estimate: c.token_estimate,
  }));
}

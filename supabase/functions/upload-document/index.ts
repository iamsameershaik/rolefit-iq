import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { ok, err, internalError } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/supabaseClient.ts";
import { createLogger } from "../_shared/logger.ts";
import {
  validateSessionId,
  validateDocumentType,
  validateJobIndex,
  validateRawTextLength,
  optionalString,
} from "../_shared/validation.ts";
import { DOCUMENT_STATUS, SESSION_STATUS, AI_EVENT_TYPE, LIMITS, EMBEDDING } from "../_shared/constants.ts";
import { chunkDocument, estimateTokens } from "../_shared/chunking.ts";
import { OpenAIProvider } from "../_shared/openaiProvider.ts";
import {
  extractResumeMetadata,
  extractJDMetadata,
  enrichMetadataWithOpenAI,
} from "../_shared/documentMetadata.ts";

const log = createLogger("upload-document");

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return err("METHOD_NOT_ALLOWED", "POST required", 405);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return err("BAD_REQUEST", "Request body must be valid JSON", 400);

    // ── Validate inputs ─────────────────────────────────────────
    let session_id: string, document_type: "resume" | "job_description", job_index: number | null;
    try {
      session_id    = validateSessionId(body.session_id);
      document_type = validateDocumentType(body.document_type);
      job_index     = validateJobIndex(body.job_index, document_type);
      validateRawTextLength(body.raw_text ?? "", LIMITS.MAX_RAW_TEXT_CHARS);
    } catch (validationErr) {
      return err("VALIDATION_ERROR", (validationErr as Error).message, 400);
    }

    const raw_text        = (body.raw_text as string).trim();
    const title           = optionalString(body.title,     "title");
    const file_name       = optionalString(body.file_name, "file_name");
    const mime_type       = optionalString(body.mime_type, "mime_type");
    const text_char_count = raw_text.length;

    void estimateTokens;

    const supabase = createServiceClient();
    const started  = Date.now();

    // ── Verify session ──────────────────────────────────────────
    const { data: session, error: sessionFetchError } = await supabase
      .from("sessions")
      .select("id, status, deleted_at")
      .eq("id", session_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (sessionFetchError) return err("DB_ERROR", "Error fetching session", 500, sessionFetchError.message);
    if (!session)          return err("NOT_FOUND",  "Session not found or deleted", 404);

    // ── Extract document metadata ───────────────────────────────
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    let metadata: Record<string, unknown> = {};
    try {
      if (document_type === "resume") {
        let m = extractResumeMetadata(raw_text);
        if (apiKey) {
          m = await enrichMetadataWithOpenAI("resume", raw_text, m, { apiKey }) as typeof m;
        }
        metadata = m as Record<string, unknown>;
      } else {
        let m = extractJDMetadata(raw_text);
        if (apiKey) {
          m = await enrichMetadataWithOpenAI("job_description", raw_text, m, { apiKey }) as typeof m;
        }
        metadata = m as Record<string, unknown>;
      }
    } catch (metaErr) {
      log.warn("Metadata extraction failed (non-fatal)", {
        session_id,
        metadata: { error: (metaErr as Error).message },
      });
    }

    // Derive a better title from metadata if no explicit title was provided
    let effectiveTitle = title;
    if (!effectiveTitle) {
      if (document_type === "resume" && metadata.candidate_name) {
        effectiveTitle = String(metadata.candidate_name);
      } else if (document_type === "job_description" && metadata.role_title) {
        effectiveTitle = String(metadata.role_title);
      }
    }

    // ── Insert document (status = uploaded) ────────────────────
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        session_id,
        document_type,
        title:           effectiveTitle,
        file_name,
        mime_type,
        raw_text,
        text_char_count,
        status:    DOCUMENT_STATUS.UPLOADED,
        job_index,
        metadata,
      })
      .select("id, session_id, created_at, document_type, title, file_name, text_char_count, status, job_index, metadata")
      .single();

    if (docError) {
      log.error("Failed to insert document", { session_id, metadata: { error: docError.message } });
      return err("DB_ERROR", "Failed to store document", 500, docError.message);
    }

    // Mark session uploading
    await supabase
      .from("sessions")
      .update({ status: SESSION_STATUS.UPLOADING, updated_at: new Date().toISOString() })
      .eq("id", session_id);

    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.DOCUMENT_UPLOADED,
      stage: "upload",
      status: "success",
      latency_ms: Date.now() - started,
      metadata: { document_id: document.id, document_type, job_index, text_char_count },
    });

    // ── Chunking ────────────────────────────────────────────────
    const chunkStart = Date.now();

    await supabase
      .from("documents")
      .update({ status: DOCUMENT_STATUS.CHUNKING, updated_at: new Date().toISOString() })
      .eq("id", document.id);

    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.DOCUMENT_CHUNKING_STARTED,
      stage: "upload",
      status: "pending",
      metadata: { document_id: document.id, document_type, job_index },
    });

    const chunks = chunkDocument({
      session_id,
      document_id: document.id,
      document_type,
      job_index,
      raw_text,
    });

    const totalTokenEstimate = chunks.reduce((sum, c) => sum + c.token_estimate, 0);

    await supabase
      .from("documents")
      .update({ status: DOCUMENT_STATUS.PARSED, updated_at: new Date().toISOString() })
      .eq("id", document.id);

    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.CHUNKS_CREATED,
      stage: "upload",
      status: "success",
      latency_ms: Date.now() - chunkStart,
      metadata: {
        document_id:    document.id,
        document_type,
        job_index,
        chunk_count:    chunks.length,
        token_estimate: totalTokenEstimate,
      },
    });

    log.info("Document chunked", {
      session_id,
      metadata: { document_id: document.id, chunk_count: chunks.length },
    });

    // ── Embeddings ──────────────────────────────────────────────
    if (!apiKey) {
      await supabase
        .from("documents")
        .update({ status: DOCUMENT_STATUS.FAILED, updated_at: new Date().toISOString() })
        .eq("id", document.id);
      return err("CONFIGURATION_ERROR", "OPENAI_API_KEY is not configured — embeddings cannot be created", 500);
    }

    const embeddingModel = Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? EMBEDDING.MODEL;
    const provider       = new OpenAIProvider(apiKey, embeddingModel);
    const embeddingStart = Date.now();

    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.EMBEDDINGS_STARTED,
      stage: "upload",
      status: "pending",
      metadata: {
        document_id:     document.id,
        document_type,
        job_index,
        chunk_count:     chunks.length,
        embedding_model: embeddingModel,
      },
    });

    const embeddedChunks: Array<typeof chunks[number] & { embedding: number[] }> = [];
    try {
      for (const chunk of chunks) {
        const embedding = await provider.createEmbedding(chunk.content);
        embeddedChunks.push({ ...chunk, embedding });
      }
    } catch (embedErr) {
      const msg = (embedErr as Error).message;
      log.error("Embedding failed", { session_id, metadata: { document_id: document.id, error: msg } });

      await supabase
        .from("documents")
        .update({ status: DOCUMENT_STATUS.FAILED, updated_at: new Date().toISOString() })
        .eq("id", document.id);

      await supabase.from("ai_events").insert({
        session_id,
        event_type: AI_EVENT_TYPE.DOCUMENT_INDEXING_FAILED,
        stage: "upload",
        status: "failed",
        latency_ms: Date.now() - embeddingStart,
        metadata: { document_id: document.id, document_type, job_index, error: msg },
      });

      return err("EMBEDDING_ERROR", "Failed to create embeddings", 500, msg);
    }

    // ── Insert all chunks with embeddings (single batch) ────────
    const chunkRows = embeddedChunks.map((c) => ({
      session_id:     c.session_id,
      document_id:    c.document_id,
      document_type:  c.document_type,
      job_index:      c.job_index,
      section_label:  c.section_label,
      chunk_index:    c.chunk_index,
      content:        c.content,
      token_estimate: c.token_estimate,
      embedding:      c.embedding,
    }));

    const { error: chunksInsertError } = await supabase
      .from("chunks")
      .insert(chunkRows);

    if (chunksInsertError) {
      log.error("Failed to insert chunks", { session_id, metadata: { document_id: document.id, error: chunksInsertError.message } });

      await supabase
        .from("documents")
        .update({ status: DOCUMENT_STATUS.FAILED, updated_at: new Date().toISOString() })
        .eq("id", document.id);

      await supabase.from("ai_events").insert({
        session_id,
        event_type: AI_EVENT_TYPE.DOCUMENT_INDEXING_FAILED,
        stage: "upload",
        status: "failed",
        latency_ms: Date.now() - embeddingStart,
        metadata: { document_id: document.id, document_type, job_index, error: chunksInsertError.message },
      });

      return err("DB_ERROR", "Failed to store chunks", 500, chunksInsertError.message);
    }

    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.EMBEDDINGS_COMPLETED,
      stage: "upload",
      status: "success",
      latency_ms: Date.now() - embeddingStart,
      metadata: {
        document_id:     document.id,
        document_type,
        job_index,
        chunk_count:     embeddedChunks.length,
        token_estimate:  totalTokenEstimate,
        embedding_model: embeddingModel,
      },
    });

    // ── Mark document indexed ───────────────────────────────────
    await supabase
      .from("documents")
      .update({ status: DOCUMENT_STATUS.INDEXED, updated_at: new Date().toISOString() })
      .eq("id", document.id);

    // ── Promote session to 'indexed' when CV + at least one JD are ready ──
    const { data: indexedDocs } = await supabase
      .from("documents")
      .select("document_type")
      .eq("session_id", session_id)
      .eq("status", DOCUMENT_STATUS.INDEXED)
      .is("deleted_at", null);

    const hasResume = (indexedDocs ?? []).some((d: { document_type: string }) => d.document_type === "resume");
    const hasJD     = (indexedDocs ?? []).some((d: { document_type: string }) => d.document_type === "job_description");
    const sessionReady = hasResume && hasJD;

    if (sessionReady) {
      await supabase
        .from("sessions")
        .update({ status: SESSION_STATUS.INDEXED, updated_at: new Date().toISOString() })
        .eq("id", session_id);
    }

    const totalLatency = Date.now() - started;

    await supabase.from("ai_events").insert({
      session_id,
      event_type: AI_EVENT_TYPE.DOCUMENT_INDEXED,
      stage: "upload",
      status: "success",
      latency_ms: totalLatency,
      metadata: {
        document_id:     document.id,
        document_type,
        job_index,
        chunk_count:     embeddedChunks.length,
        token_estimate:  totalTokenEstimate,
        embedding_model: embeddingModel,
        session_ready:   sessionReady,
      },
    });

    log.info("Document indexed", {
      session_id,
      metadata: {
        document_id:    document.id,
        document_type,
        chunk_count:    embeddedChunks.length,
        latency_ms:     totalLatency,
      },
    });

    return ok({
      document: {
        id:              document.id,
        session_id:      document.session_id,
        created_at:      document.created_at,
        document_type:   document.document_type,
        title:           document.title,
        file_name:       document.file_name,
        text_char_count: document.text_char_count,
        status:          DOCUMENT_STATUS.INDEXED,
        job_index:       document.job_index,
        metadata:        document.metadata ?? {},
      },
      chunks_created:  embeddedChunks.length,
      token_estimate:  totalTokenEstimate,
      embedding_model: embeddingModel,
      status:          "indexed",
    });
  } catch (e) {
    log.error("Unexpected error in upload-document", { metadata: { error: String(e) } });
    return internalError(e);
  }
});

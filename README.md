# RoleFit IQ — Career Intelligence Assistant

RoleFit IQ is an explainable career intelligence assistant. A user uploads one CV/resume and up to three job descriptions. The app indexes the documents, generates role fit estimates, explains "Why this score", shows matched evidence/gaps/risks, and provides a grounded chat assistant for fit, gaps, comparison, and interview preparation.

## Problem Statement

Job seekers struggle to understand how well their CV matches a specific job description. Existing tools either give opaque "ATS scores" without explanation or provide generic advice disconnected from the actual documents. RoleFit IQ solves this by grounding every analysis in the actual uploaded documents, showing evidence, gaps, and risks with citations back to source text.

## Features

- **Document upload**: Paste or upload one CV and up to three job descriptions
- **Role validation**: Content is checked for document-type appropriateness before indexing
- **Evidence indexing**: Documents are chunked and embedded for retrieval-augmented generation
- **Role fit analysis**: Per-JD fit estimates with tier, score, evidence strength, risk level
- **"Why this score" explanation**: Every fit estimate includes AI-generated score reasoning
- **Strengths, gaps, and risks**: Structured analysis with evidence citations
- **Interview preparation**: Suggested questions and talking points per role
- **Grounded chat assistant**: Q&A grounded only in uploaded documents with citations
- **Role comparison**: Side-by-side comparison across multiple JDs
- **Session persistence**: Refresh the page and return to your active session

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Icons | Lucide React |
| Backend | Supabase (PostgreSQL + pgvector + Edge Functions/Deno) |
| AI | OpenAI (text-embedding-3-small for embeddings, gpt-4o for analysis, gpt-4o-mini for chat) |
| Storage | Supabase tables (sessions, documents, chunks, analyses, chat_messages, ai_events, evaluation_runs) |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│  LandingPage → UploadWorkspace → ResultsDashboard    │
│                                      → JDDetailView  │
│          AssistantPanel (grounded chat)               │
└──────────────────┬────────────────────────────────────┘
                   │ HTTP (fetch)
┌──────────────────▼────────────────────────────────────┐
│              Supabase Edge Functions (Deno)           │
│  create-session · upload-document · analyse-session   │
│  get-session · chat · delete-session                  │
│  generate-tailored-cv · test-retrieval                │
└──────────────────┬────────────────────────────────────┘
                   │ Service Role Key
┌──────────────────▼────────────────────────────────────┐
│              Supabase PostgreSQL + pgvector            │
│  sessions · documents · chunks (vector) · analyses   │
│  chat_messages · ai_events · evaluation_runs         │
└──────────────────────────────────────────────────────┘
                   │
┌──────────────────▼────────────────────────────────────┐
│                    OpenAI API                         │
│  text-embedding-3-small · gpt-4o · gpt-4o-mini       │
└──────────────────────────────────────────────────────┘
```

## Data Flow

1. **Session creation**: User uploads first document → `create-session` edge function creates a session row
2. **Document upload**: `upload-document` validates content role, extracts metadata (heuristics + OpenAI fallback), chunks the text, embeds each chunk via OpenAI, batch-inserts into `chunks` table
3. **Analysis**: `analyse-session` fetches CV + JDs, creates an `evaluation_run`, sends full text to gpt-4o for structured analysis per JD, stores results in `analyses` with `slot_id` and `evaluation_run_id`
4. **Chat**: `chat` embeds the user's question, retrieves relevant chunks via `match_chunks()` RPC, generates a grounded answer via gpt-4o-mini with guardrails, persists both messages
5. **Frontend hydration**: `get-session` returns session + documents + analyses + chat messages; `analysisMapper` transforms raw JSONB into typed `JDAnalysis[]`

## RAG/LLM Approach

### Embeddings
- Model: `text-embedding-3-small` (1536 dimensions)
- Chunks are section-aware (paragraph splitting at 2400 chars, 480 overlap)
- Stored in pgvector with ivfflat cosine index

### Retrieval
- `match_chunks()` RPC performs cosine similarity search
- Filters by session_id, optional document_type, optional job_index
- Returns top-K chunks with similarity scores

### Analysis
- gpt-4o with JSON mode for structured output
- Full CV + JD text sent as context (not retrieved chunks — analysis needs complete document)
- Temperature 0.2 for consistency
- Fallback analysis on parse failure with conservative estimates

### Chat
- gpt-4o-mini with JSON mode
- Retrieved chunks (top 8) formatted as numbered context
- Conversation history (last 6 messages) included
- Guardrails enforced via system prompt

## Prompt and Context Management

### Analysis Prompt
- System prompt defines RoleFit IQ as a "career intelligence cockpit"
- Includes explicit guardrails (no external knowledge, no invented skills, no hiring guarantees)
- Requests structured JSON with fit_tier, fit_estimate, score_explanation, strengths, gaps, risks, interview questions, talking points, rewrite recommendations, evidence
- score_explanation includes key_factors, what_helped, what_hurt, how_calculated

### Chat Prompt
- System prompt defines scope (fit, gaps, alignment, comparison, interview prep)
- Explicit refusal instructions for out-of-scope questions
- Available JD slot IDs listed for correct JD number resolution
- Citations must reference correct slot_id (e.g., "JD-02 · Requirements · Chunk 01")

## Guardrails and Quality Controls

### Document Role Validation
- Heuristic-based content validation before indexing
- Checks for CV signals (Experience, Skills, Education sections, contact info, action verbs)
- Checks for JD signals (Job Title, Requirements, Responsibilities, Benefits sections)
- Rejects code, recipes, notes, cover letters in wrong slots
- Pragmatic, not perfect — catches obvious misuse

### Chat Guardrails
- Only answers questions grounded in uploaded CV/JDs
- Refuses general chat, weather, coding, unrelated advice
- JD number resolution: "Job 2" → slot_id "jd-02"
- Out-of-range JD references (JD 4+) → polite refusal
- Unuploaded JD references → "JD X has not been uploaded"

### JD Identity Stability
- Each JD slot has a stable slot_id: jd-01, jd-02, jd-03
- slot_id is attached to: documents, chunks, analyses, chat retrieval context, citations
- Does not rely on array index, retrieval order, or created_at order
- Eliminates the JD 2/JD 3 confusion bug

### Score Explanation
- Every analysis includes a score_explanation with key_factors, what_helped, what_hurt, how_calculated
- Fallback analyses on parse failure include a "Parse failure" explanation
- ScoreExplanationDrawer displays AI reasoning alongside derived metrics

## Observability

### ai_events Table
- Logs every pipeline event (session created, document uploaded, chunked, embedded, analysed, chat)
- Stores latency_ms, token_usage, status, error_message
- Never stores raw document text

### evaluation_runs Table
- One row per analysis attempt
- Tracks: model_used, total_jobs_compared, latency_ms, status, error_message
- Links to analyses via evaluation_run_id
- Enables queries like "show all analyses from run X"

## Testing

See [TESTING.md](./TESTING.md) for comprehensive manual QA scenarios covering:
- Document role validation (9 scenarios)
- File validation (5 scenarios)
- JD slot identity mapping (4 scenarios)
- Score explanation presence (3 scenarios)
- Invalid JD number handling (4 scenarios)
- Grounded assistant refusal (6 scenarios)
- Session refresh (2 scenarios)
- Chunk count display (3 scenarios)
- Evaluation runs (3 scenarios)

## Deployment

### Frontend
- Vite build produces static assets in `dist/`
- Deploy to any static host (Vercel, Netlify, Cloudflare Pages)
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Backend
- Supabase project is provisioned automatically
- Edge functions deployed via Supabase MCP tools
- Database migrations applied via `mcp__supabase__apply_migration`
- Secrets (OPENAI_API_KEY) configured automatically

### Environment Variables
| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Frontend (.env) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend (.env) | Supabase anon key for client requests |
| `SUPABASE_URL` | Edge Functions | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Service role key for DB access |
| `OPENAI_API_KEY` | Edge Functions | OpenAI API key for embeddings + LLM |

## Productionisation Plan

1. **Authentication**: Add Supabase email/password auth with user_id scoping on all tables
2. **Rate limiting**: Add per-session rate limits on edge functions
3. **File parsing**: Support PDF, DOCX, RTF parsing (currently .txt only)
4. **Parallel embedding**: Batch OpenAI embedding calls instead of serial
5. **Streaming chat**: Stream chat responses for better UX
6. **HNSW index**: Upgrade from ivfflat to hnsw for better retrieval at scale
7. **Automated tests**: Add Vitest for frontend, Deno test for edge functions
8. **Error monitoring**: Integrate Sentry or similar for production error tracking
9. **Cost monitoring**: Track OpenAI API spend per session
10. **Multi-tenant**: User accounts with session isolation

## Engineering Standards

- **TypeScript strict mode** throughout frontend and edge functions
- **No external UI libraries** — only Tailwind CSS + Lucide React icons
- **RLS enabled** on all database tables
- **Service role key** used only in edge functions, never exposed to client
- **No raw text in logs** — ai_events stores only counts, IDs, durations
- **Soft deletion** via deleted_at on sessions and documents
- **Stable slot IDs** — JD identity is deterministic, not index-based
- **Guardrails enforced** at both prompt and application layer

## AI-Assisted Development Process

This project was built with AI assistance (Claude/ChatGPT) following this process:

1. **Architecture design**: AI proposed the schema and data flow; human reviewed and adjusted
2. **Edge function implementation**: AI wrote initial code; human reviewed for security and correctness
3. **Frontend components**: AI built UI components; human reviewed for design quality and UX
4. **Hardening phase**: AI identified and fixed bugs, added guardrails, validation, and tests
5. **Documentation**: AI generated README and TESTING docs; human reviewed for accuracy

Key decisions where human judgment was important:
- Choosing Supabase over custom backend (simplicity, built-in pgvector)
- Using gpt-4o for analysis (quality) vs gpt-4o-mini for chat (cost)
- Full-text analysis instead of RAG for analysis (complete context needed)
- RAG for chat (targeted evidence retrieval with citations)
- Heuristic role validation instead of LLM-based (cost, speed, explainability)

## Known Limitations

1. **Text-only input**: No PDF/DOCX parsing — users must paste plain text
2. **Serial embedding**: One OpenAI call per chunk — slow for large documents
3. **No auth**: Single-tenant anonymous sessions — anyone with a session URL can access
4. **No streaming**: Chat responses are returned in full, not streamed
5. **English-only**: Heuristics and prompts are English-optimized
6. **No retry logic**: API failures require manual re-submission
7. **Session timeout**: No automatic session cleanup — sessions persist indefinitely
8. **Cost**: Each analysis uses gpt-4o which is more expensive than gpt-4o-mini

## What I Would Do Differently With More Time

1. **PDF/DOCX parsing**: Integrate a document parser (e.g., unstructured.io) for file uploads
2. **Streaming chat**: Use Server-Sent Events for streaming chat responses
3. **Parallel embedding**: Batch OpenAI embedding calls (up to 100 inputs per call)
4. **Automated test suite**: Vitest for frontend, Deno test for edge functions, Playwright for E2E
5. **User accounts**: Supabase auth with session isolation and history
6. **Cost tracking**: Per-session OpenAI cost tracking with budget alerts
7. **HNSW index**: Better retrieval quality and speed at scale
8. **Multi-language**: Support for non-English CVs and JDs
9. **Feedback loop**: Let users rate analysis quality to improve prompts over time
10. **Export**: PDF/Word export of analysis results for sharing with recruiters

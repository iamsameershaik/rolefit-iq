# QA checklist

## Current automated checks

```bash
npm run lint
npm run build
```

The repository does not yet include executable unit, integration, or browser end-to-end suites.

## Manual workflow checks

### Document handling

- Valid CV text is accepted in the CV slot.
- Valid job-description text is accepted in a job slot.
- A JD in the CV slot and a CV in a job slot are rejected.
- Empty, very short, unrelated, recipe, code, and cover-letter inputs are handled with useful validation feedback.
- Plain-text file input works; unsupported document formats communicate the current text-extraction boundary.
- Text above the configured maximum length is rejected.

### Slot identity and analysis

- Upload jobs in slots 1 and 2 and verify `jd-01` and `jd-02` remain distinct.
- Upload only job slot 3 and verify it remains `jd-03`.
- Verify analysis exists for every indexed job.
- Verify score explanation fields are present for normal and fallback analysis paths.
- Verify evidence and citations retain their correct CV/job source labels.

### Grounded chat

- Ask about a valid uploaded job and verify evidence-led response behavior.
- Ask about an unavailable job slot and verify the refusal.
- Ask about job numbers above 3 and verify the refusal.
- Ask unrelated questions and verify scope refusal.
- Compare two jobs and verify each job uses its own slot label.

### Session and lifecycle

- Refresh after analysis and verify the persisted session reloads.
- Start a new workspace and verify local session state is cleared.
- Delete a session and verify it is no longer returned as active.
- Confirm document chunk counts appear after indexing.
- Confirm an analysis creates an evaluation run and links analyses to it.

### Phase 2C deployment checks

- Apply the restriction migration to a non-sensitive target project first.
- Verify anonymous direct table reads and direct `match_chunks` calls are denied.
- Verify normal Edge Function flows still work through the service role.
- Verify `test-retrieval` returns `404` when `ENABLE_TEST_RETRIEVAL` is absent and works only when explicitly enabled.
- Trigger a controlled server error and confirm clients receive a generic 5xx response without raw details.

## Automation roadmap

- Deno unit tests for role validation, chunking, and slot parsing.
- Contract tests for Edge Function envelopes and authorization behavior.
- Migration/RLS tests against a disposable Supabase environment.
- Browser tests for upload, analysis, chat, refresh, and deletion.

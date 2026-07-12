# Testing Guide — RoleFit IQ

## Overview

RoleFit IQ uses a combination of manual QA scenarios and lightweight automated
checks. The edge-function validation logic (`roleValidation.ts`) is designed
to be unit-testable in isolation since it is a pure function with no I/O.

## Manual QA Scenarios

### 1. Document Role Validation

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 1.1 | Valid CV uploaded to CV slot | Standard resume text with Experience, Skills, Education sections | Accepted, indexed |
| 1.2 | Valid JD uploaded to JD slot | Standard job description with Requirements, Responsibilities sections | Accepted, indexed |
| 1.3 | JD pasted into CV slot | Job description text in the CV upload slot | Rejected with "looks like a job description, not a CV/resume" |
| 1.4 | CV pasted into JD slot | Resume text in a JD upload slot | Rejected with "looks like a CV/resume, not a job description" |
| 1.5 | Recipe pasted into JD slot | Chocolate chip recipe text | Rejected with "does not appear to be a CV or job description" |
| 1.6 | Code snippet pasted into CV slot | Python/JS code block | Rejected with "looks like code, notes, or other unrelated text" |
| 1.7 | Cover letter in JD slot | "Dear Hiring Manager..." letter | Rejected with "looks like a cover letter, not a job description" |
| 1.8 | Very short text (<50 chars) | "Hello world" | Rejected with "too short to be a valid CV or job description" |
| 1.9 | Empty text | "" | Rejected with "Document is empty" |

### 2. File Validation

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 2.1 | .txt file upload | Plain text file | Parsed and indexed |
| 2.2 | .pdf file upload | PDF file | Warning shown: "Only .txt files are fully supported" |
| 2.3 | .docx file upload | Word document | Warning shown |
| 2.4 | Empty file | 0-byte file | Warning: "File appears to be empty" |
| 2.5 | Very large file | >80k chars | Error: exceeds maximum length |

### 3. JD Slot Identity Mapping

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 3.1 | Stable slot IDs | Upload JD to slot 1, then slot 2 | Documents have slot_id "jd-01" and "jd-02" in DB |
| 3.2 | Evidence labels match slot | Upload CV + 2 JDs, run analysis | Evidence chunks carry correct slot_id |
| 3.3 | Chat resolves JD 2 correctly | Upload JD 1, ask question, upload JD 2, ask about "Job 2" | Answer cites JD-02 evidence, not JD-01 |
| 3.4 | No array index confusion | Upload JD to slot 3 only (skip slots 1-2) | slot_id is "jd-03", not "jd-01" |

### 4. Score Explanation Presence

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 4.1 | Every analysis has "Why this score" | Upload CV + JD, run analysis | ScoreExplanationDrawer shows AI score reasoning section |
| 4.2 | Fallback includes explanation | Trigger LLM parse failure | Fallback analysis includes score_explanation with "Parse failure" reason |
| 4.3 | Score explanation is non-empty | Normal analysis | key_factors, what_helped, what_hurt, how_calculated all populated |

### 5. Invalid JD Number Handling

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 5.1 | Ask about JD 4 | "What are the gaps for Job 4?" | "I can only answer questions about JD 1–JD 3 in this session. JD 4 has not been uploaded." |
| 5.2 | Ask about JD 5 | "Compare Job 5 with Job 1" | Same refusal message mentioning JD 5 |
| 5.3 | Ask about unuploaded JD 2 | Upload only JD 1, ask "What about Job 2?" | "JD 2 has not been uploaded in this session." |
| 5.4 | Ask about JD 1 when uploaded | Upload JD 1, ask "What are the gaps for Job 1?" | Normal grounded answer citing JD-01 evidence |

### 6. Grounded Assistant Refusal

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 6.1 | Weather question | "What's the weather like today?" | Polite refusal: "RoleFit IQ only answers questions grounded in the uploaded CV and job descriptions." |
| 6.2 | Coding question | "Write me a Python function" | Same polite refusal |
| 6.3 | General advice | "Should I quit my job?" | Same polite refusal |
| 6.4 | Fit question | "What's my strongest fit?" | Normal grounded answer with citations |
| 6.5 | Gap question | "What skills am I missing?" | Normal grounded answer with citations |
| 6.6 | Interview prep | "What should I prepare for?" | Normal grounded answer with citations |

### 7. Session Refresh

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 7.1 | Refresh preserves session | Upload docs, run analysis, refresh page | Returns to results page with session intact |
| 7.2 | New workspace clears session | Click "New workspace" in nav | localStorage cleared, returns to upload page |

### 8. Chunk Count Display

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 8.1 | No flicker during indexing | Upload a JD, watch chunk counter | Shows "INDEXING…" during processing, then final count |
| 8.2 | Short JD = 1 chunk | Upload a very short JD (200 chars) | Shows "1" — acceptable, no forced multi-chunk |
| 8.3 | Label says "EVIDENCE CHUNKS" | Any upload | Label reads "Evidence chunks" not "Chunks" |

### 9. Evaluation Runs

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 9.1 | Run created per analysis | Upload CV + 2 JDs, run analysis | 1 evaluation_run row with status="completed", total_jobs_compared=2 |
| 9.2 | Failed analysis updates run | Trigger LLM failure | evaluation_run status="failed", error_message populated |
| 9.3 | Analyses link to run | After analysis | All analysis rows have evaluation_run_id set |

## Automated Test Stubs

The following functions in `supabase/functions/_shared/roleValidation.ts` are
pure functions suitable for unit testing:

```typescript
// Example test structure (not yet wired to a runner)
import { validateDocumentRole, deriveSlotId, parseJDReference, findOutOfRangeJD } from './roleValidation.ts';

// validateDocumentRole
assert(validateDocumentRole('', 'resume').valid === false);
assert(validateDocumentRole('short', 'resume').valid === false);
assert(validateDocumentRole(recipeText, 'job_description').valid === false);
assert(validateDocumentRole(cvText, 'resume').valid === true);
assert(validateDocumentRole(jdText, 'job_description').valid === true);
assert(validateDocumentRole(jdText, 'resume').valid === false); // JD in CV slot

// deriveSlotId
assert(deriveSlotId('resume', null) === 'cv');
assert(deriveSlotId('job_description', 1) === 'jd-01');
assert(deriveSlotId('job_description', 3) === 'jd-03');

// parseJDReference
assert(parseJDReference('What about Job 2?') === 2);
assert(parseJDReference('Compare JD 3 with JD 1') === 3);
assert(parseJDReference('Hello there') === null);

// findOutOfRangeJD
assert(findOutOfRangeJD('What about Job 4?') === 4);
assert(findOutOfRangeJD('What about Job 2?') === null);
```

## Running Tests

Currently, tests are manual. To add automated tests:

1. Install a Deno test runner (`deno test`)
2. Create `supabase/functions/_shared/roleValidation.test.ts`
3. Run `deno test` from the `supabase/functions/` directory

For frontend tests, consider Vitest with jsdom for component-level validation.

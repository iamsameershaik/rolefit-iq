# Prompts, context, and guardrails

## Implemented now

Prompt construction is centralized in `supabase/functions/_shared/prompts.ts`. This keeps core instructions, JSON contracts, and guardrails reviewable in one place.

## Analysis prompt

The analysis prompt asks for a structured evidence-based role assessment. It distinguishes direct, adjacent, transferable, and missing evidence, asks for explicit gaps, avoids hiring guarantees, and requires an explanation for each fit estimate.

## Grounded-answer prompt

The chat prompt receives retrieved evidence, limited recent conversation history, and the available job slots. It instructs the model to:

- answer only from supplied CV/JD evidence;
- refuse unrelated requests;
- identify unavailable or out-of-range job references;
- preserve job-slot labels during comparisons;
- cite supporting chunks and acknowledge insufficient evidence.

## Context controls

| Control | Current behavior |
| --- | --- |
| Analysis scope | Full CV plus one JD at a time. |
| Chat retrieval | Top chunks scoped by session; optional job/document filters. |
| Chat history | Recent user/assistant messages only. |
| Multi-job comparison | Separate labelled retrieval blocks per job plus CV evidence. |
| Stable references | `cv`, `jd-01`, `jd-02`, `jd-03` carried through retrieval and citations. |

## MVP limitations

Guardrails reduce unsupported claims but do not make model output deterministic or eliminate prompt injection risk from uploaded text. The application does not currently provide a formal prompt version registry, offline evaluation suite, or policy-enforcement layer independent of the model.

## Production roadmap

- Version prompts and record the selected prompt version in relevant event metadata.
- Add adversarial fixtures for prompt injection, citation accuracy, and scope refusal.
- Validate citations against retrieved chunk identifiers before returning them.
- Establish a controlled process for model and prompt changes.

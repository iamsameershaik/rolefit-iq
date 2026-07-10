# ADR-0002: Full-document analysis and RAG chat

- Status: Accepted
- Date: 2026-07-08

## Context

Role-fit analysis needs broad comparison of a CV and a job description, while conversational questions benefit from focused evidence.

## Decision

Use full document text for structured per-role analysis and vector retrieval for grounded chat.

## Consequences

- Analysis can assess requirements that a narrow retrieval query might miss.
- Chat can present relevant chunks and source labels without sending every document on every turn.
- Analysis cost and request size are higher than a retrieval-only approach.

## Revisit when

Document sizes, model costs, or evaluation data show that a different context strategy is more reliable.

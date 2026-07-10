# ADR-0003: Stable job-description slot identifiers

- Status: Accepted
- Date: 2026-07-10

## Context

Multiple job descriptions can be uploaded in a session. Array order and retrieval order are not durable identifiers for user references or citations.

## Decision

Use deterministic slot IDs: `cv`, `jd-01`, `jd-02`, and `jd-03`. Carry them through documents, chunks, analyses, chat context, and citations.

## Consequences

- A question about a numbered job maps to a stable record.
- Multi-job comparison can build separately labelled evidence blocks.
- Schema and migration logic must preserve slot IDs consistently.

## Revisit when

The product supports a different number or type of role documents.

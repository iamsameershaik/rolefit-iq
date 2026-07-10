# ADR-0004: AI provider abstraction

- Status: Accepted
- Date: 2026-07-08

## Context

Embedding, analysis, and grounded-answer calls are provider-specific, while product workflows should remain focused on their contracts.

## Decision

Define an `AIProvider` interface and implement the active OpenAI provider behind it. Keep a Bedrock implementation outline as a non-runtime stub.

## Consequences

- Workflow code depends on embedding, analysis, chat, and rewrite contracts instead of direct provider calls.
- A future provider requires a compatible implementation and operational validation.
- The abstraction does not by itself guarantee portability across model dimensions, JSON behavior, cost, or deployment controls.

## Revisit when

A second provider is selected for a concrete product or compliance requirement.

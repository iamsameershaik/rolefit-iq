# ADR-0005: Anonymous MVP data boundary

- Status: Accepted with limitations
- Date: 2026-07-10

## Context

The MVP supports anonymous, browser-persisted sessions and does not yet include accounts or tenant ownership.

## Decision

Keep the anonymous workflow while restricting direct browser-role access to sensitive tables and the retrieval RPC through an additive migration. Retain Edge Functions as the application data boundary.

## Consequences

- The current product flow does not require a login screen.
- The restriction migration must be applied to each target Supabase project before its controls are active.
- Session UUID validation remains insufficient as durable user authorization.
- Auth, ownership, CORS controls, and rate limits remain roadmap work.

## Revisit when

The product introduces accounts, sharing, persistent user history, or broader handling of sensitive user data.

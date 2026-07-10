# ADR-0001: Supabase Edge Functions and pgvector

- Status: Accepted
- Date: 2026-07-08

## Context

RoleFit IQ needs session persistence, vector retrieval, server-side secret handling, and a small operational footprint.

## Decision

Use Supabase PostgreSQL with pgvector for application and vector data, and Supabase Edge Functions for server-side workflows.

## Consequences

- Document records and retrieval vectors live in one transactional data system.
- Edge Functions can use server-side provider and service credentials.
- The MVP avoids a separate API server and vector database.
- Service-role use requires careful access controls and deployment configuration.

## Revisit when

Background processing, tenancy, query volume, or retrieval scale exceed the current session-scoped design.

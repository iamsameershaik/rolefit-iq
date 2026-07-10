# Productionisation plan

## Current deployment shape

The frontend builds to static Vite assets. Supabase provides PostgreSQL, pgvector, and Edge Functions. Functions require Supabase service credentials and an OpenAI API key in their runtime environment.

This repository does not include infrastructure-as-code, a CI workflow, or a declared production deployment. The options below are target architectures, not records of deployed environments.

## Shared baseline

1. Apply database migrations, including the public-data restriction migration.
2. Configure frontend and function secrets through the selected platform's secret manager.
3. Deploy static assets and Edge Functions through a controlled release process.
4. Add identity, ownership, rate controls, monitoring, and retention before handling broader sensitive-data use.

## Platform paths

| Platform | Frontend | Application/data path | Fit |
| --- | --- | --- | --- |
| AWS | CloudFront + S3 or Amplify | Supabase remains external; optional queue and monitoring services later | Existing AWS estates. |
| GCP | Cloud Storage + CDN or Firebase Hosting | Supabase remains external; Cloud Monitoring integrations later | Existing GCP estates. |
| Azure | Static Web Apps | Supabase remains external; Azure Monitor integrations later | Existing Azure estates. |
| Cloudflare | Pages | Supabase remains external; Workers can add edge controls later | Static delivery and edge-focused deployments. |

## Phased roadmap

| Phase | Objective |
| --- | --- |
| MVP hardening | Apply current data restrictions, protect diagnostic endpoints, sanitize server errors. |
| Access control | Add Supabase Auth, ownership fields, owner-scoped RLS, and Edge Function checks. |
| Reliability | Add queues, retries, idempotency, timeouts, and error monitoring. |
| Scale | Measure retrieval, latency, and cost before changing indexing or vector infrastructure. |

## Release checks

- Run `npm run lint` and `npm run build`.
- Apply migrations in a controlled environment before application release.
- Verify required secrets are present without printing values.
- Verify disabled diagnostic endpoints return `404` unless deliberately enabled.
- Exercise the manual QA checklist for the changed workflow.

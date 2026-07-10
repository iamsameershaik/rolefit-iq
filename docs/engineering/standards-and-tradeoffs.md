# Engineering standards and tradeoffs

## Implemented now

- TypeScript is used in the frontend and Edge Functions.
- Frontend API calls use a consistent success/error envelope.
- Edge Functions share validation, logging, prompt, retrieval, chunking, provider, and response modules.
- SQL schema changes are additive, timestamped migrations.
- Stable slot IDs avoid reliance on transient list ordering.
- Prompt output is normalized before storage and display.
- The codebase avoids a large component library and uses local React/Tailwind components.

## Tradeoffs

| Choice | Rationale | Revisit when |
| --- | --- | --- |
| Supabase Edge Functions | Small operational surface for the MVP | Background work or tenancy complexity grows. |
| JSONB analysis fields | Flexible structured-output evolution | Query/reporting requirements become stable. |
| OpenAI provider abstraction | Keeps provider choice out of workflow logic | A second provider is actually implemented. |
| Heuristic role validation | Fast and explainable first filter | Document diversity requires higher recall. |
| Manual QA checklist | Captures important workflow expectations today | Release cadence requires repeatable automation. |

## Change expectations

- Keep frontend and backend contracts aligned.
- Prefer additive migrations; do not rewrite applied migration history.
- Avoid logging raw CV/JD content.
- Validate lint, build, migration safety, and affected manual QA before release.
- Treat model, prompt, retrieval, and schema changes as product behavior changes.

## Production roadmap

Introduce generated database types, automated tests, CI release checks, dependency update policy, and operational runbooks as the system matures.

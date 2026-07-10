# Observability and evaluation

## Implemented now

The repository records pipeline-level events in `ai_events` and analysis-attempt records in `evaluation_runs`.

| Record | Captures |
| --- | --- |
| `ai_events` | Event type, stage, status, latency, selected metadata, token-usage field, and error field. |
| `evaluation_runs` | Analysis-run status, model, jobs compared, latency, error field, and links from analyses. |
| Structured logs | Function, timestamp, session ID where available, and operational metadata. |

Document text is intentionally excluded from event metadata. The implementation records counts, IDs, model names, timing, and status where calls provide them.

## What this does not yet provide

The repository does not include a monitoring backend, alert rules, dashboards, distributed tracing, automated quality scoring, cost allocation, or executable evaluation corpus. Event storage alone is not a complete operational monitoring system.

## Evaluation strategy

Use a staged approach:

1. Maintain a consented, non-sensitive set of CV/JD fixtures.
2. Define expected structural properties: valid JSON, supported evidence labels, stable job slots, no invented claims, and citation/source consistency.
3. Record prompt/model versions and compare outputs on fixed fixtures before changing either.
4. Add human review rubrics for grounding, gap honesty, usefulness, and safety.
5. Monitor latency, failure rate, retrieval-empty rate, and cost only after collection and ownership are implemented.

## Production roadmap

- Export structured logs to a monitoring platform and define alerts for function failures and latency.
- Add redacted request correlation IDs across client, function, provider, and database events.
- Establish an evaluation runner and release gate for prompt/model changes.
- Add per-session cost accounting without storing document text in telemetry.

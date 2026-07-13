# Testing RoleFit IQ

RoleFit IQ currently has a manual QA checklist and build-time validation commands. The canonical checklist is in [docs/quality/qa-checklist.md](docs/quality/qa-checklist.md).

## Current validation commands

```bash
npm run lint
npm run build
```

## Current QA scope

- Document role and size validation.
- Stable job-description slot mapping and citation labels.
- Score explanation presence.
- Grounded-chat refusal and job-reference handling.
- Session refresh, chunk counts, and evaluation-run records.
- Phase 2C database/RPC restriction and test-endpoint guard checks when deploying backend changes.

## Automation status

The repository does not yet contain executable frontend, Edge Function, or end-to-end test suites. `roleValidation.ts` contains pure functions suited to future Deno unit tests; frontend component tests can be added with a browser-compatible test runner. The QA checklist separates current checks from roadmap work.

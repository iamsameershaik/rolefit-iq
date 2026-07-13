# Known limitations and risk register

## Current limitations

| Area | Current state | Impact | Direction |
| --- | --- | --- | --- |
| Identity | Anonymous sessions only | Session UUID is not user ownership | Add Auth and owner-scoped access. |
| Input formats | Plain text is the supported path | PDF/DOCX text extraction is not implemented | Add an evaluated document parser. |
| Processing | Embeddings are serial and synchronous | Large documents can be slow or fail mid-flow | Queue, batch, retry, and make idempotent. |
| Chat | Full response returned at once | Perceived latency can be higher | Consider streaming after reliability controls. |
| Language | Heuristics and prompts target English | Reduced reliability for other languages | Add multilingual evaluation before expansion. |
| Retention | Soft deletion only | Data remains until a future deletion process | Define and implement retention/hard deletion. |
| Evaluation | No executable quality suite | Prompt/model changes lack automated regression evidence | Add versioned fixtures and review rubric. |
| Cost | No per-session cost accounting | Spend is not attributable in the product | Add bounded telemetry and budgets. |

## Security risk status

The current restriction migration improves direct data/RPC exposure only after it is applied to the target project. It does not provide authenticated session ownership, CORS restrictions, or rate limiting. See the [security model](../security/mvp-security-model.md).

## Risk-management principles

- Do not present fit estimates as hiring outcomes.
- Prefer an explicit evidence gap over an unsupported claim.
- Keep sensitive text out of operational logs.
- Validate data and access changes in an isolated environment before wider release.

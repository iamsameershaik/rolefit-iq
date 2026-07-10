# AI-assisted development

## Purpose

AI assistance can accelerate implementation, analysis, documentation, and review. It does not replace accountable engineering judgment for data handling, product behavior, deployment, or release decisions.

## Working approach

1. Define the change boundary and success criteria before implementation.
2. Inspect existing code, migrations, and contracts before proposing changes.
3. Keep changes scoped; avoid unrelated rewrites.
4. Review generated output for security, privacy, correctness, maintainability, and product claims.
5. Run available validation commands and report constraints honestly.
6. Record substantial architectural choices as ADRs.

## Human decision points

Human review is required for provider selection, secrets, data retention, access control, production release approval, prompt changes that alter product behavior, and any claim about system readiness or performance.

## Current boundary

The repository includes AI-oriented product functionality and documents an AI-assisted development workflow. It does not claim that generated changes are automatically safe or that review has been replaced by automation.

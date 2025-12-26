## Context
We need to add a Codex Wrapped dashboard in this repo, mirroring OpenCode Wrapped, based on local Codex JSONL usage data and the ccusage YAML pricing schema.

## Goals / Non-Goals
- Goals: parity with OpenCode Wrapped layout/config, local-first ingestion, fast one-off implementation, browser preview.
- Non-Goals: production-grade ingestion pipeline, multi-year analytics, authentication.

## Decisions
- Decision: Mirror the OpenCode Wrapped UI structure and configuration fields to minimize divergence.
- Decision: Implement a data adapter that maps Codex JSONL entries into a normalized usage model using ccusage YAML pricing data.
- Decision: Keep reference repos under `tmp/` and ignore them in git to keep the workspace clean.

## Alternatives considered
- Rebuild the dashboard from scratch without OpenCode Wrapped reference (rejected for speed).
- Consume ccusage CLI output instead of parsing JSONL (rejected because direct JSONL is required).

## Risks / Trade-offs
- Codex JSONL schema variations could require more robust parsing than anticipated.
- ccusage YAML schema changes could require updates to mapping logic.

## Migration Plan
Not applicable (new capability).

## Open Questions
- Where exactly will the Codex JSONL file live, and what sample should be used for validation?
- Which OpenCode Wrapped configuration fields must be mirrored once the repo is reviewed?

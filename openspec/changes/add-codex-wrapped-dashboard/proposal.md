# Change: Add Codex Wrapped dashboard

## Why
Provide a yearly Codex usage summary similar to OpenCode Wrapped, using local Codex JSONL data and the ccusage pricing schema.

## What Changes
- Add Codex JSONL ingestion and aggregation aligned to the ccusage YAML pricing schema.
- Add a Codex Wrapped dashboard that mirrors the OpenCode Wrapped layout and configuration.
- Add local reference repos under `tmp/` and ignore them in git.
- Add a local preview flow to validate the dashboard in a browser.

## Impact
- Affected specs: usage-ingest, wrapped-dashboard
- Affected code: new Codex Wrapped app and data pipeline (paths finalized after repo review)

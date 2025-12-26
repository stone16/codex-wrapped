## 1. Discovery
- [x] 1.1 Clone `opencode-wrapped` and `ccusage` into `tmp/` (ignored by git).
- [x] 1.2 Review OpenCode Wrapped configuration and layout to capture parity fields.
- [x] 1.3 Review ccusage YAML schema to identify pricing and usage fields.
- [x] 1.4 Locate a local Codex JSONL sample and confirm the schema.

## 2. Implementation
- [x] 2.1 Scaffold the Codex Wrapped app structure based on OpenCode Wrapped.
- [x] 2.2 Implement JSONL ingestion and aggregation using ccusage YAML pricing data.
- [x] 2.3 Build the Codex Wrapped dashboard UI mirroring OpenCode Wrapped sections.
- [x] 2.4 Add configuration options for year, data source path, and presentation.
- [x] 2.5 Add `.gitignore` entries for `tmp/opencode-wrapped/` and `tmp/ccusage/`.

## 3. Validation
- [x] 3.1 Run local dev/build and open the dashboard in a browser.
- [x] 3.2 Verify metrics and totals against the sample Codex JSONL data.

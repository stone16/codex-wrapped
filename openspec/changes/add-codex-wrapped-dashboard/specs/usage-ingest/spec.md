## ADDED Requirements
### Requirement: Codex JSONL ingestion
The system SHALL ingest Codex usage logs from a local JSONL file and normalize them into an internal usage model.

#### Scenario: JSONL file provided
- **WHEN** a valid JSONL file path is configured
- **THEN** the system reads each line as JSON and maps usage metrics into the usage model
- **AND** invalid lines are skipped with a warning

### Requirement: Pricing configuration
The system SHALL load pricing and usage categories from the ccusage YAML schema to compute costs and usage summaries.

#### Scenario: YAML config present
- **WHEN** a ccusage YAML config is available
- **THEN** the system uses it to compute cost totals and group usage by model and category

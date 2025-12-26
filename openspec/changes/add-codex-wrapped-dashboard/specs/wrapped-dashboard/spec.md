## ADDED Requirements
### Requirement: Codex Wrapped dashboard
The system SHALL render a Codex Wrapped dashboard that mirrors the OpenCode Wrapped layout and key sections.

#### Scenario: Dashboard loaded with aggregated data
- **WHEN** aggregated usage data is available
- **THEN** the dashboard displays headline metrics, usage breakdowns, and timeline charts consistent with OpenCode Wrapped

### Requirement: Configuration parity
The system SHALL expose configuration options equivalent to OpenCode Wrapped for data source and presentation.

#### Scenario: Configuration updated
- **WHEN** a user changes the year or data source in configuration
- **THEN** the dashboard refreshes using the new configuration

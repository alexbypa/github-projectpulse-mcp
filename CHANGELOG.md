# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.9.0]

### Added
- `get_health_score`: new `openssf.checks[]` field with the individual OpenSSF Scorecard checks (`name`, `score`, `reason`, `documentation.url`), sorted worst first; not applicable checks (score `-1`) come last.
- `get_health_score`: new `openssf.securityChecksAverage` field, the simple average of the 12 security checks (0-100).
- `analyze_code_scanning`: new `tool_name` field (the tool that raised the alert, e.g. CodeQL or Scorecard).
- `analyze_code_scanning`: new `security_severity_level` field (`critical`, `high`, `medium`, `low` or `null`), matching the severity shown in the GitHub UI.

### Changed
- `get_health_score`: `openssf.score` is now the official Scorecard score (`data.score`, risk-weighted, scaled to 0-100) instead of the simple average of the security checks. The security category score of the health report uses it.
- `get_health_score`: OpenSSF data is unavailable (`openssf: null`) when Scorecard returns no valid score.
- `analyze_code_scanning`: tool description now states that it returns alerts from all code scanning tools, not only CodeQL. `severity` is unchanged (`error`, `warning`, `note`).

### Known limitations
- Code scanning and Dependabot alerts are read from the first page only (30 alerts). Repositories with more open alerts are under-counted.

<div id="top" align="center">

<img src="https://raw.githubusercontent.com/alexbypa/github-projectpulse-mcp/main/docs/images/code-scanning-example.png" width="80%" alt="ProjectPulse MCP Logo" style="border-radius: 12px; box-shadow: 0 8px 24px rgba(106, 13, 173, 0.2); margin-bottom: 20px;"/>

# ⚡ ProjectPulse MCP

**Monitor, score, and compare GitHub repository health directly from your AI agent conversations.**

[![npm version](https://img.shields.io/npm/v/projectpulse-mcp.svg?style=for-the-badge&color=6A0DAD&logo=npm&logoColor=white)](https://www.npmjs.com/package/projectpulse-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-6A0DAD.svg?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Protocol-6A0DAD.svg?style=for-the-badge&logo=anthropic&logoColor=white)](https://modelcontextprotocol.io)
[![Vitest](https://img.shields.io/badge/Tests-58%20Passed-2EA44F.svg?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-features">Features</a> •
  <a href="#-tools-reference">Tools</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-configuration">Configuration</a> •
  <a href="#-license">License</a>
</p>

---

</div>

## 🌟 Overview

**ProjectPulse MCP** is a comprehensive [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server engineered for AI assistants (Claude Desktop, Cursor, Windsurf, Claude Code CLI). It equips LLMs with real-time capabilities to evaluate codebase maintainability, monitor CI/CD reliability, audit security vulnerabilities, track DORA engineering metrics, and rank multiple repositories side-by-side.

---

## 🚀 Features

### 🔍 1. Multi-Repository Benchmark & Comparison
* **`compare_repos`**: Compares 2 to 5 repositories simultaneously and returns a ranked JSON score.
* **Competition Ranking**: Employs standard competition ranking (1224 scheme) with full tie-breaking.
* **Fault Tolerance**: Isolates repository errors (e.g. 404s) so remaining repositories are scored seamlessly.

### 📊 2. Algorithmic Health Scoring (Grade A–F)
* **`get_health_score`**: Weighted composite metric across 5 dimensions:
  - **CI/CD Reliability (25%)**: Evaluates pass rate across recent workflow runs.
  - **Security & Dependabot (25%)**: Audits open critical, high, medium, and low security advisories.
  - **Codebase Freshness (20%)**: Tracks commit recency and push activity.
  - **Community & Activity (15%)**: Measures open issue resolution and fork engagement.
  - **Maintenance Standards (15%)**: Assesses licensing, descriptions, and active status.

### ⏱️ 3. Proxy DORA Metrics
* **`get_dora_metrics`**: Computes core DevOps Research & Assessment metrics over a configurable window (7–90 days):
  - **Deployment Frequency**: Weekly release throughput.
  - **Lead Time for Changes**: Median PR duration from opening to merge.
  - **Change Failure Rate**: Proportion of failed workflow executions.
  - **Mean Time to Recovery (MTTR)**: Median duration between failure and subsequent branch recovery.

### 🛡️ 4. Security & Code Quality Audits
* **`analyze_dependencies`**: Detailed Dependabot alert breakdowns with severity filtering.
* **`analyze_code_scanning`**: CodeQL static analysis and security scanning summaries.
* **`check_ci_status`**: Live inspection of recent GitHub Actions pipeline conclusions.
* **`get_repo_health`**: Raw telemetry (stars, forks, languages, licenses, default branches).

---

## 🛠️ Tools Reference

| Tool Name | Description | Input Schema |
| :--- | :--- | :--- |
| **`compare_repos`** | Compares and ranks 2 to 5 GitHub repositories by health score using standard competition ranking. | `repos: Array<{ owner: string, repo: string }>` *(min: 2, max: 5)* |
| **`get_health_score`** | Calculates a 0–100 weighted health score with letter grade (A–F), category breakdown, and suggestions. | `owner: string`, `repo: string` |
| **`get_dora_metrics`** | Calculates DORA proxy metrics (Deployment Frequency, Lead Time, Change Failure Rate, MTTR). | `owner: string`, `repo: string`, `days?: number` *(7–90, default: 30)* |
| **`get_repo_health`** | Retrieves core repository metadata (stars, open issues, language, license, activity). | `owner: string`, `repo: string` |
| **`analyze_dependencies`** | Lists Dependabot security advisories grouped by severity level. | `owner: string`, `repo: string`, `severity?: "critical" \| "high" \| "medium" \| "low"` |
| **`analyze_code_scanning`** | Fetches CodeQL and static analysis scanning alerts. | `owner: string`, `repo: string` |
| **`check_ci_status`** | Fetches recent GitHub Actions workflow runs and conclusions. | `owner: string`, `repo: string`, `limit?: number` *(default: 10)* |
| **`ping`** | Simple connectivity and latency validation check. | `message: string` |

---

## 📦 Quick Start

### Option A: Claude Desktop Setup

Add the server to your `claude_desktop_config.json`:
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "projectpulse": {
      "command": "npx",
      "args": ["-y", "projectpulse-mcp"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_github_personal_access_token"
      }
    }
  }
}
```

### Option B: Claude Code CLI

```bash
claude mcp add projectpulse -- npx projectpulse-mcp
```

### Option C: Cursor & Other MCP Clients (stdio transport)
* **Command:** `npx`
* **Args:** `-y projectpulse-mcp`
* **Environment Variable:** `GITHUB_TOKEN=your_token_here`

---

## 🔑 Configuration & GitHub Tokens

To prevent GitHub API rate-limiting and allow reading security advisories (Dependabot/CodeQL), generate a GitHub Personal Access Token (PAT):

1. Navigate to **GitHub** > **Settings** > **Developer settings** > **Personal access tokens** > **Fine-grained tokens**.
2. Grant **Read-only** permissions to:
   - `Code scanning alerts`
   - `Dependabot alerts`
   - `Actions`
   - `Metadata` (default)
3. Set your token as the `GITHUB_TOKEN` environment variable in your `.env` file or MCP client configuration.

---

## 🧪 Development & Testing

```bash
# Install dependencies
npm install

# Run comprehensive test suite (58 unit tests)
npm test

# Type-check TypeScript codebase
npm run lint

# Build production bundle
npm run build
```

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more information.

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/alexbypa">Alessandro Chiodo</a></sub>
</div>

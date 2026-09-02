<h1 align="center">ProjectPulse MCP 🏥</h1>

<p align="center">
  <em>GitHub repository health monitoring for AI assistants — works with any language, any repo.</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/projectpulse-mcp"><img src="https://img.shields.io/npm/v/projectpulse-mcp.svg?color=blue" alt="npm version" /></a>
  <a href="https://github.com/alexbypa/github-projectpulse-mcp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/alexbypa/github-projectpulse-mcp" alt="license" /></a>
  <a href="https://github.com/alexbypa/github-projectpulse-mcp/actions"><img src="https://img.shields.io/github/actions/workflow/status/alexbypa/github-projectpulse-mcp/ci.yml?label=tests" alt="tests" /></a>
  <a href="https://github.com/alexbypa/github-projectpulse-mcp/stargazers"><img src="https://img.shields.io/github/stars/alexbypa/github-projectpulse-mcp" alt="stars" /></a>
  <a href="https://www.npmjs.com/package/projectpulse-mcp"><img src="https://img.shields.io/npm/dt/projectpulse-mcp" alt="downloads" /></a>
</p>

---

This [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server gives AI assistants the ability to analyze health, security, CI/CD status, and delivery metrics of any GitHub repository — directly from your conversations.

## ✨ Features

- 🏥 **Health Score** — comprehensive 0-100 score with grade (A-F), category breakdown, and improvement suggestions
- 🔒 **Security** — Dependabot alerts blended with [OpenSSF Scorecard](https://scorecard.dev/) checks (60/40 weighted)
- 📊 **DORA Metrics** — proxy [DORA metrics](https://dora.dev/) from GitHub data: deployment frequency, lead time, change failure rate, MTTR
- 🔍 **Code Scanning** — CodeQL and other code scanning alerts with severity, message, and creation date
- 📦 **Dependency Analysis** — Dependabot alerts with severity filtering
- ⚙️ **CI/CD Status** — recent GitHub Actions workflow runs and conclusions
- 📋 **Repository Info** — stars, forks, language, license, and general metadata

## 📸 Example

![Code Scanning Example](https://raw.githubusercontent.com/alexbypa/github-projectpulse-mcp/main/docs/images/code-scanning-example.png)

## 🚀 Quick Start

### Claude Code (CLI)

```bash
claude mcp add projectpulse -- npx projectpulse-mcp
```

> **Note:** You need a `.env` file with your `GITHUB_TOKEN` in the directory where you run Claude Code.

### Claude Desktop

Add to your `claude_desktop_config.json` (`%APPDATA%\Claude\` on Windows, `~/Library/Application Support/Claude/` on macOS):

```json
{
  "mcpServers": {
    "projectpulse": {
      "command": "npx",
      "args": ["-y", "projectpulse-mcp"],
      "env": {
        "GITHUB_TOKEN": "your-github-personal-access-token"
      }
    }
  }
}
```

### Other MCP Clients (Cursor, Windsurf, etc.)

Configure a new MCP server with:
- **Transport**: `stdio`
- **Command**: `npx`
- **Arguments**: `-y projectpulse-mcp`
- **Environment**: `GITHUB_TOKEN` = your GitHub PAT

## 🛠️ Tools

| Tool | Description | Inputs |
| --- | --- | --- |
| `get_health_score` | 0-100 health score with grade (A-F), category breakdown, and suggestions | `owner`, `repo` |
| `get_dora_metrics` | DORA proxy metrics: deployment frequency, lead time, change failure rate, MTTR | `owner`, `repo`, `days?` (7-90, default 30) |
| `get_repo_health` | General metadata: stars, issues, language, license, etc. | `owner`, `repo` |
| `analyze_dependencies` | Dependabot alerts by severity | `owner`, `repo`, `severity?` |
| `check_ci_status` | Recent CI/CD workflow runs | `owner`, `repo`, `limit?` (default 10) |
| `analyze_code_scanning` | CodeQL / code scanning alerts | `owner`, `repo` |
| `ping` | Connectivity check | `message` |

## 🆕 What's New

### OpenSSF Scorecard Integration

Security score now blends **Dependabot alerts** (60%) with **OpenSSF Scorecard** checks (40%) for a more complete picture. 12 security-relevant checks are evaluated — repos without a scorecard gracefully fall back to Dependabot-only scoring.

### DORA Metrics

New `get_dora_metrics` tool calculates proxy [DORA metrics](https://dora.dev/) from public GitHub data:

| Metric | Source | Unit |
| --- | --- | --- |
| Deployment Frequency | Releases | releases/week |
| Lead Time for Changes | PR created → merged | hours (median) |
| Change Failure Rate | CI workflow conclusions | percentage |
| Mean Time to Recovery | CI failure → next success | hours (median) |

Metrics return `null` when insufficient data is available — works safely on any repository.

## ⚙️ Configuration

### GITHUB_TOKEN

Required to avoid rate limits and access security data (Dependabot, CodeQL alerts).

**Option A: Fine-grained PAT (Recommended)**
1. **Settings** > **Developer settings** > **Personal access tokens** > **Fine-grained tokens**
2. Select target repositories
3. Grant **Read-only** access to:
   - `Code scanning alerts`
   - `Dependabot alerts`
   - `Metadata` (default)

**Option B: Classic Token**
Generate with `repo` + `security_events` scopes.

**Providing the token:**
- **Claude Desktop**: set in `claude_desktop_config.json` (see Quick Start)
- **Claude Code / Local**: create a `.env` file:
  ```env
  GITHUB_TOKEN=ghp_your_token_here
  ```

## 👤 Author

**alexbypa** — [GitHub](https://github.com/alexbypa) · [npm](https://www.npmjs.com/~alexbypa)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!
Feel free to check the [issues page](https://github.com/alexbypa/github-projectpulse-mcp/issues).

## ⭐ Show your support

Give a star if this project helped you!

## 📝 License

MIT — see the [LICENSE](LICENSE) file for details.

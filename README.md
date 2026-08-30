# projectpulse-mcp

GitHub repository health monitoring via MCP. 

This Model Context Protocol (MCP) server allows AI assistants to analyze the health, security, and maintenance status of GitHub repositories directly from your conversations.

## Features

- **Repository Health Score**: Calculates a comprehensive 0-100 score based on CI status, freshness, security, and community metrics.
- **Basic Repository Info**: Fetches general metadata like stars, forks, language, and license.
- **Dependency Analysis**: Lists Dependabot alerts with severity filtering.
- **CI/CD Status**: Checks recent GitHub Actions workflow runs and their conclusions.
- **Code Scanning**: Retrieves CodeQL and other code scanning alerts.
- **Ping**: Simple connectivity test tool.

### Example Output with tool Code Scanning

![Code Scanning Example](https://raw.githubusercontent.com/alexbypa/projectpulse-mcp/main/docs/images/code-scanning-example.png)

## Quick Start

### Claude Code (CLI)

To use this MCP server with Claude Code, run the following command in your terminal:

```bash
claude mcp add projectpulse -- npx projectpulse-mcp
```

*Note: You must have a `.env` file with your `GITHUB_TOKEN` in the directory where you run Claude Code.*

### Claude Desktop Configuration

To use this with Claude Desktop, add the following configuration to your `claude_desktop_config.json` file (usually located at `%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "projectpulse": {
      "command": "npx",
      "args": [
        "-y",
        "projectpulse-mcp"
      ],
      "env": {
        "GITHUB_TOKEN": "your-github-personal-access-token"
      }
    }
  }
}
```

### Other MCP Clients (Cursor, Windsurf, etc.)

To use this MCP server in other clients that support `stdio` transport (like Cursor, Windsurf, or custom applications), configure a new MCP server with the following settings:

- **Type/Transport**: `stdio`
- **Command**: `npx`
- **Arguments**: `-y projectpulse-mcp`
- **Environment Variables**: Add `GITHUB_TOKEN` with your GitHub Personal Access Token.

## Tools

| Tool Name | Description | Input Schema |
| --- | --- | --- |
| `get_health_score` | Calculate a 0-100 health score for a GitHub repository with grade (A-F), category breakdown, and improvement suggestions. | `owner` (string), `repo` (string) |
| `get_repo_health` | Get health information for a GitHub repository (stars, issues, language, license, etc.). | `owner` (string), `repo` (string) |
| `analyze_dependencies` | Get Dependabot alerts for a GitHub repository. | `owner` (string), `repo` (string), `severity` (optional enum: critical, high, medium, low) |
| `check_ci_status` | Get recent CI/CD workflow runs for a GitHub repository. | `owner` (string), `repo` (string), `limit` (optional number, default: 10) |
| `analyze_code_scanning` | Get Code Scanning alerts for a GitHub repository with CodeQL. | `owner` (string), `repo` (string) |
| `ping` | Simple connectivity check that responds with a pong. | `message` (string) |

## Configuration

### GITHUB_TOKEN setup

To use the GitHub API without severe rate limits and to access protected data (like security alerts), you must provide a GitHub Personal Access Token (PAT). 

**Option A: Fine-grained Personal Access Token (Recommended)**
1. Go to **Settings** > **Developer settings** > **Personal access tokens** > **Fine-grained tokens**.
2. Click **Generate new token**.
3. Under **Repository access**, select the repositories you want to analyze.
4. Under **Repository permissions**, grant **Read-only** access to:
   - `Code scanning alerts`
   - `Dependabot alerts`
   - `Metadata` (mandatory default)

**Option B: Classic Token**
Generate a classic token with at least the `repo` and `security_events` scopes.

#### Providing the token to the MCP server

**For Claude Desktop:** 
Set the `GITHUB_TOKEN` environment variable in your `claude_desktop_config.json` as shown in the Quick Start section.

**For Claude Code (CLI) or Local Testing:**
Create a `.env` file in the root of this project (or your working directory) with the following content:
```env
GITHUB_TOKEN=ghp_your_token_here
```
The MCP server automatically loads environment variables from `.env` files on startup.

## License

MIT License. See the `LICENSE` file for details.

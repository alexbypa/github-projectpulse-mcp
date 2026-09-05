import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOctokit } from "../github/client.js";

const inputSchema = z.object({
    owner: z.string().describe("GitHub repository owner (e.g., 'modelcontextprotocol')"),
    repo: z.string().describe("GitHub repository name (e.g., 'sdk')"),
    severity: z.enum(["critical", "high", "medium", "low"]).optional()
});

export async function executeAnalyzeDependencies({ owner, repo, severity }: { owner: string; repo: string; severity?: string }) {
    const { data } = await getOctokit().dependabot.listAlertsForRepo({ owner, repo });
    const result = data.map((alert) => ({
        summary: alert.security_advisory.summary,
        severity: alert.security_advisory.severity,
        package_name: alert.dependency.package?.name,
        state: alert.state,
        html_url: alert.html_url
    }));

    const filtered = severity ? result.filter((alert) => alert.severity === severity) : result;

    return {
        content: [{
            type: "text" as const,
            text: JSON.stringify(filtered, null, 2)
        }]
    };
}

export function registerAnalyzeDependencies(server: McpServer): void {
    server.registerTool(
        "analyze_dependencies",
        {
            description: `Fetches Dependabot alerts for a GitHub repository to analyze vulnerable package dependencies.
- Side effects: None. This is a strictly read-only operation.
- Data sources: GitHub REST API (dependabot/alerts).
- Auth requirements: Requires GITHUB_TOKEN with appropriate permissions (dependabot alerts are often restricted).
- Rate limits: Subject to standard GitHub API limits.
- Return shape: Returns a JSON array of vulnerable package dependencies including summary, severity, package_name, state, and html_url.
- Usage guidelines: Use this tool ONLY to find vulnerable package dependencies (npm, pip, etc.). DO NOT use this tool for other checks:
  - For static code security vulnerabilities (CodeQL), use 'analyze_code_scanning' instead.
  - For a computed A-F health score grading, use 'get_health_score' instead.`,
            inputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: true
            }
        },
        executeAnalyzeDependencies
    );
}
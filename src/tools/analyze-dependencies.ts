import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOctokit } from "../github/client.js";

const inputSchema = z.object({
    owner: z.string().describe("GitHub repository owner"),
    repo: z.string().describe("GitHub repository name"),
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
            description: "Read-only operation to get Dependabot alerts for a GitHub repository. Returns a JSON array of vulnerable package dependencies, including summary, severity, state, and URL. Requires GITHUB_TOKEN with appropriate permissions (public repos often restrict alert visibility). USAGE GUIDELINES: Use this tool ONLY to find vulnerable npm/pip/etc dependencies. For static code vulnerabilities (CodeQL), use analyze_code_scanning. For A-F security grading, use get_health_score.",
            inputSchema
        },
        executeAnalyzeDependencies
    );
}
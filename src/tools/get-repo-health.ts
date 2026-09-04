import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOctokit } from "../github/client.js";

const inputSchema = z.object({
    owner: z.string().describe("GitHub repository owner (e.g., 'modelcontextprotocol')"),
    repo: z.string().describe("GitHub repository name (e.g., 'sdk')")
});

export async function executeGetRepoHealth({ owner, repo }: { owner: string; repo: string }) {
    try {
        const { data } = await getOctokit().repos.get({ owner, repo });
        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify({
                    full_name: data.full_name,
                    description: data.description,
                    stargazers_count: data.stargazers_count,
                    open_issues_count: data.open_issues_count,
                    language: data.language,
                    license: data.license ? data.license.spdx_id : null,
                    pushed_at: data.pushed_at,
                    default_branch: data.default_branch,
                    archived: data.archived,
                    forks_count: data.forks_count
                }, null, 2),
            }]
        };
    } catch (error) {
        if ((error as { status?: number }).status === 404) {
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({
                        error: "Repository not found",
                        details: (error as Error).message
                    }, null, 2),
                }]
            };
        }
        throw error; //-> will be caught by MCP server
    }
}

export function registerGetRepoHealth(server: McpServer): void {
    server.registerTool(
        "get_repo_health",
        {
            description: `Fetches basic repository metadata and statistics from the public GitHub API.
- Side effects: None. This is a strictly read-only operation.
- Data sources: Public GitHub REST API (GET /repos/{owner}/{repo}).
- Auth requirements: No authentication required for public repositories. Uses configured GitHub token if available.
- Rate limits: Subject to standard GitHub API limits (60 requests/hour unauthenticated, 5000 requests/hour authenticated).
- Return shape: Returns a JSON object containing specific metadata: full_name (string), description (string), stargazers_count (number), open_issues_count (number), language (string), license (string, SPDX ID), pushed_at (ISO 8601 string), default_branch (string), archived (boolean), and forks_count (number).
- Usage guidelines: Use this tool ONLY to retrieve basic raw metadata (like stars, forks, language, and issue counts). DO NOT use this tool for other specific analyses:
  - For a computed A-F health score grading, use 'get_health_score' instead.
  - For checking CI/CD workflow run statuses, use 'check_ci_status' instead.
  - For package vulnerabilities and dependency graph, use 'analyze_dependencies' instead.
  - For code security and static analysis, use 'analyze_code_scanning' instead.`,
            inputSchema
        },
        executeGetRepoHealth
    );
}
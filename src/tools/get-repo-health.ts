import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOctokit } from "../github/client.js";

const inputSchema = z.object({
    owner: z.string().describe("GitHub repository owner"),
    repo: z.string().describe("GitHub repository name")
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
            description: "Read-only operation to fetch basic repository metadata from the public GitHub API. Returns a JSON object containing full_name, description, stargazers_count, open_issues_count, language, license (SPDX ID), pushed_at (ISO date), default_branch, archived status, and forks_count. Subject to standard GitHub unauthenticated rate limits (60 requests/hour). USAGE GUIDELINES: Use this tool ONLY for basic metadata and stats. DO NOT use this tool for A-F grading (use get_health_score instead). For CI/CD workflow status, use check_ci_status. For vulnerability alerts, use analyze_dependencies or analyze_code_scanning. For DORA metrics, use get_dora_metrics.",
            inputSchema
        },
        executeGetRepoHealth
    );
}
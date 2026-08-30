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
            description: "Get health information for a GitHub repository",
            inputSchema
        },
        executeGetRepoHealth
    );
}
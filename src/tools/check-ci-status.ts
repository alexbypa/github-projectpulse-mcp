import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOctokit } from "../github/client.js";

const inputSchema = z.object({
    owner: z.string().describe("GitHub repository owner"),
    repo: z.string().describe("GitHub repository name"),
    limit: z.number().min(1).max(30).default(10).describe("Number of runs to return"),
});

export async function executeCheckCiStatus({ owner, repo, limit }: { owner: string; repo: string; limit: number }) {
    const { data } = await getOctokit().actions.listWorkflowRunsForRepo({ owner, repo, per_page: limit });
    const result = data.workflow_runs.map((run) => ({
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        head_branch: run.head_branch,
        created_at: run.created_at,
        updated_at: run.updated_at,
        html_url: run.html_url,
    }));

    return {
        content: [{
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
        }],
    };
}

export function registerCheckCiStatus(server: McpServer): void {
    server.registerTool(
        "check_ci_status",
        {
            description: "Read-only operation to get recent CI/CD workflow runs (GitHub Actions) for a GitHub repository. Returns a JSON array of runs, including name, status, conclusion, branch, timestamps, and URL. Subject to standard public GitHub API rate limits. USAGE GUIDELINES: Use this tool ONLY to check raw GitHub Actions workflow history and CI build statuses. DO NOT use this tool for A-F health grading (use get_health_score), basic repo stats (use get_repo_health), or calculated DORA metrics (use get_dora_metrics).",
            inputSchema,
        },
        executeCheckCiStatus
    );
}

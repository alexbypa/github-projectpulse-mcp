import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOctokit } from "../github/client.js";

const inputSchema = z.object({
    owner: z.string().describe("GitHub repository owner (e.g., 'modelcontextprotocol')"),
    repo: z.string().describe("GitHub repository name (e.g., 'sdk')"),
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
            description: `Fetches recent CI/CD workflow runs (GitHub Actions) for a GitHub repository.
- Side effects: None. This is a strictly read-only operation.
- Data sources: GitHub REST API (actions/runs).
- Auth requirements: No authentication required for public repositories. Uses configured token if available.
- Rate limits: Subject to standard GitHub API limits.
- Return shape: Returns a JSON array of workflow runs including name, status, conclusion, head_branch, created_at, updated_at, and html_url.
- Usage guidelines: Use this tool ONLY to check raw GitHub Actions workflow history and CI build statuses. DO NOT use this tool for other analyses:
  - For a computed A-F health score grading, use 'get_health_score' instead.
  - For retrieving basic repository stats (stars, forks), use 'get_repo_health' instead.
  - For calculated DORA metrics, use 'get_dora_metrics' instead.`,
            inputSchema,
        },
        executeCheckCiStatus
    );
}

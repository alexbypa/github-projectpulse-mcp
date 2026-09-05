import { z } from "zod";
import { listMergedPulls, listReleases, listWorkflowRuns } from "../github/client.js";
import { calculateDoraMetrics } from "../analytics/dora.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = z.object({
    owner: z.string().describe("GitHub repository owner (e.g., 'modelcontextprotocol')"),
    repo: z.string().describe("GitHub repository name (e.g., 'sdk')"),
    days: z.number().min(7).max(90).default(30).describe("Number of past days to analyze (default: 30)")
});

export async function executeGetDoraMetrics({ owner, repo, days }: { owner: string; repo: string; days: number }) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [releases, runs, prs] = await Promise.all([
        listReleases(owner, repo, since),
        listWorkflowRuns(owner, repo, since),
        listMergedPulls(owner, repo, since)
    ])

    const metrics = calculateDoraMetrics({ owner, repo, period_days: days, releases, workflowRuns: runs, mergedPulls: prs })

    return {
        content: [
            { type: "text" as const, text: JSON.stringify(metrics, null, 2) }
        ]
    }
}

export function registerGetDoraMetrics(server: McpServer): void {
    server.registerTool(
        "get_dora_metrics",
        {
            description: `Calculates DORA proxy metrics (deployment frequency, lead time, change failure rate, MTTR) for a GitHub repository.
- Side effects: None. This is a strictly read-only operation.
- Data sources: GitHub REST API (releases, actions/runs, pulls).
- Auth requirements: No special authentication required for public repositories. Private repositories require GITHUB_TOKEN.
- Rate limits: Subject to standard GitHub API limits. Heavy API usage due to multiple list endpoints being queried.
- Return shape: Returns a JSON object with calculated DORA metrics over the specified period.
- Usage guidelines: Use this tool ONLY to evaluate DORA metrics and team delivery performance. DO NOT use this tool for other checks:
  - For raw workflow statuses, use 'check_ci_status' instead.
  - For a computed A-F health score grading, use 'get_health_score' instead.
  - For general repository metadata, use 'get_repo_health' instead.`,
            inputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: true
            }
        },
        executeGetDoraMetrics
    );
}

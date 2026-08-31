import { z } from "zod";
import { listMergedPulls, listReleases, listWorkflowRuns } from "../github/client.js";
import { calculateDoraMetrics } from "../analytics/dora.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = z.object({
    owner: z.string().describe("GitHub repository owner"),
    repo: z.string().describe("GitHub repository name"),
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
            description: "Calculate DORA metrics (deployment frequency, lead time, change failure rate, and MTTR) for a GitHub repository",
            inputSchema,
        },
        executeGetDoraMetrics
    );
}

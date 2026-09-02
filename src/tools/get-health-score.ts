import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOctokit } from "../github/client.js";
import { fetchOpenSSFScore } from "../security/openssf-client.js";
import {
    calculateCiScore,
    calculateFreshnessScore,
    calculateSecurityScore,
    calculateCommunityScore,
    calculateMaintenanceScore,
    calculateHealthScore,
} from "../scoring/health-score.js";

const inputSchema = z.object({
    owner: z.string().describe("GitHub repository owner"),
    repo: z.string().describe("GitHub repository name"),
});

export async function executeGetHealthScore({ owner, repo }: { owner: string; repo: string }) {
    const octokit = getOctokit();

    const [repoData, runsData, openssfResult] = await Promise.all([
        octokit.repos.get({ owner, repo }),
        octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 10 }),
        fetchOpenSSFScore(owner, repo)
    ]);

    let alertCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    try {
        const { data: alerts } = await octokit.dependabot.listAlertsForRepo({ owner, repo });
        for (const alert of alerts) {
            if (alert.state === "open") {
                const sev = alert.security_advisory.severity as keyof typeof alertCounts;
                if (sev in alertCounts) alertCounts[sev]++;
            }
        }
    } catch {
        // Dependabot not enabled or no access — keep zeros
    }

    const categories = {
        ci: calculateCiScore(runsData.data.workflow_runs as any),
        freshness: calculateFreshnessScore(repoData.data.pushed_at ?? new Date().toISOString()),
        security: calculateSecurityScore(alertCounts, openssfResult?.score),
        community: calculateCommunityScore(repoData.data.open_issues_count, repoData.data.forks_count),
        maintenance: calculateMaintenanceScore(
            repoData.data.license !== null,
            repoData.data.description !== null,
            repoData.data.archived,
        ),
    };

    const report = calculateHealthScore(`${owner}/${repo}`, categories);

    return {
        content: [{
            type: "text" as const,
            text: JSON.stringify(report, null, 2),
        }],
    };
}

export function registerGetHealthScore(server: McpServer): void {
    server.registerTool(
        "get_health_score",
        {
            description: "Calculate a 0-100 health score for a GitHub repository with grade (A-F), category breakdown, and improvement suggestions",
            inputSchema,
        },
        executeGetHealthScore
    );
}

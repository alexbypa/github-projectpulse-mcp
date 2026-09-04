import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOctokit } from "../github/client.js";
import { fetchOpenSSFScore } from "../security/openssf-client.js";
import { saveSnapshot, getLastSnapshot } from "../analytics/trend-tracker.js";

import {
    calculateCiScore,
    calculateFreshnessScore,
    calculateSecurityScore,
    calculateCommunityScore,
    calculateMaintenanceScore,
    calculateHealthScore,
} from "../scoring/health-score.js";

const inputSchema = z.object({
    owner: z.string().describe("GitHub repository owner (e.g., 'modelcontextprotocol')"),
    repo: z.string().describe("GitHub repository name (e.g., 'sdk')"),
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


    const previousSnapshot = await getLastSnapshot(owner, repo);

    const report = calculateHealthScore(`${owner}/${repo}`, categories);

    const response = {
        report,
        trend: previousSnapshot ? {
            previousScore: previousSnapshot.score,
            previousGrade: previousSnapshot.grade,
            previousCheckedAt: previousSnapshot.checkedAt,
            scoreDiff: report.score - previousSnapshot.score,
            direction: report.score < previousSnapshot.score ? "↓" : report.score > previousSnapshot.score ? "↑" : "→"
        } : null
    }

    await saveSnapshot(owner, repo, report);

    return {
        content: [{
            type: "text" as const,
            text: JSON.stringify(response, null, 2),
        }],
    };
}

export function registerGetHealthScore(server: McpServer): void {
    server.registerTool(
        "get_health_score",
        {
            description: `Calculates a 0-100 health score and A-F grade for a GitHub repository.
- Side effects: Writes a trend snapshot to local disk for history tracking. Read-only against GitHub API.
- Data sources: GitHub REST API (repos, actions, dependabot) and OpenSSF Scorecard API.
- Auth requirements: No authentication required for public repositories. Uses configured token if available.
- Rate limits: Subject to standard GitHub API limits (heavy usage across multiple endpoints).
- Return shape: Returns a JSON object with a grade (A-F), total score, detailed category breakdown (CI, freshness, security, community, maintenance), improvement suggestions, and historical trend data.
- Usage guidelines: Use this tool ONLY for deep analytical grading and overall repository health assessment. DO NOT use this tool for quick metadata checks:
  - For basic raw metadata (stars, language, etc.), use 'get_repo_health' instead.
  - For raw CI workflow statuses, use 'check_ci_status' instead.
  - For deep code vulnerability scanning, use 'analyze_code_scanning' instead.
  - For DORA metrics, use 'get_dora_metrics' instead.`,
            inputSchema,
        },
        executeGetHealthScore
    );
}

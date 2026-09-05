import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeGetHealthScore } from "./get-health-score.js";
import { ComparisonResult, HealthReport } from "../types/health.js";

export const inputSchema = z.object({
    repos: z.array(
        z.object({
            owner: z.string().describe("GitHub repository owner (e.g., 'modelcontextprotocol')"),
            repo: z.string().describe("GitHub repository name (e.g., 'sdk')")
        })
    ).min(2, {
        message: "At least 2 repositories are required"
    }).max(5, {
        message: "At most 5 repositories are allowed"
    })
});

const healthReportSchema = z.object({
    repo: z.string(),
    score: z.number(),
    grade: z.string(),
    breakdown: z.record(z.string(), z.object({
        score: z.number(),
        weight: z.number(),
        detail: z.string()
    })),
    suggestions: z.array(z.string()),
    checkedAt: z.string(),
    gradeMeaning: z.string()
});

const outputSchema = z.object({
    compared_at: z.string(),
    repos: z.array(z.object({
        owner: z.string(),
        repo: z.string(),
        rank: z.number(),
        health: healthReportSchema.nullable(),
        error: z.string().nullable()
    }))
});

export async function executeCompareRepos({ repos }: { repos: { owner: string; repo: string; }[] }) {
    const reposResults = await Promise.all(
        repos.map(async (repo): Promise<{ owner: string; repo: string; health: HealthReport | null; error: string | null }> => {
            try {
                const result = await executeGetHealthScore(repo);
                const report = JSON.parse(result.content[0].text) as HealthReport;
                return {
                    owner: repo.owner,
                    repo: repo.repo,
                    health: report,
                    error: null,
                };
            } catch (error) {
                return {
                    owner: repo.owner,
                    repo: repo.repo,
                    health: null,
                    error: (error as Error).message || String(error),
                };
            }
        })
    );

    const successes = reposResults
        .filter((r): r is typeof r & { health: HealthReport } => r.health !== null)
        .sort((a, b) => b.health.score - a.health.score);

    const failures = reposResults
        .filter(r => r.health === null)
        .map(r => ({
            owner: r.owner,
            repo: r.repo,
            rank: 0,
            health: null,
            error: r.error
        }));

    const rankedSuccesses: Array<{ owner: string; repo: string; rank: number; health: HealthReport | null; error: string | null }> = [];
    let currentRank = 1;
    for (let i = 0; i < successes.length; i++) {
        const current = successes[i];
        if (i > 0) {
            const prev = successes[i - 1];
            if (current.health.score < prev.health.score) {
                currentRank = i + 1;
            }
        }
        rankedSuccesses.push({
            owner: current.owner,
            repo: current.repo,
            rank: currentRank,
            health: current.health,
            error: null
        });
    }

    const comparedRepos = [...rankedSuccesses, ...failures];

    const comparison: ComparisonResult = {
        compared_at: new Date().toISOString(),
        repos: comparedRepos
    };

    return {
        content: [
            { type: "text" as const, text: JSON.stringify(comparison, null, 2) }
        ]
    };
}

export function registerCompareRepos(server: McpServer): void {
    server.registerTool(
        "compare_repos",
        {
            description: `Compares health scores of multiple GitHub repositories (2-5 repos) and ranks them.
- Side effects: None. This is a strictly read-only operation.
- Data sources: GitHub REST API and OpenSSF Scorecard API (via get_health_score logic).
- Auth requirements: No authentication required for public repositories. Uses configured token if available.
- Rate limits: Subject to standard GitHub API limits. Multiplies API calls by the number of repositories compared.
- Return shape: Returns a JSON object containing a ranked list of repositories (owner, repo, rank) with their detailed health breakdown (score, CI, freshness, security, community, maintenance).
- Usage guidelines: Use this tool ONLY when you need to compare or rank multiple repositories against each other based on their health scores. DO NOT use this tool for analyzing a single repository:
  - For getting the health score of a single repository, use 'get_health_score' instead.
  - For comparing raw metadata instead of health scores, query 'get_repo_health' individually.`,
            inputSchema,
            outputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: true
            }
        },
        executeCompareRepos
    );
}

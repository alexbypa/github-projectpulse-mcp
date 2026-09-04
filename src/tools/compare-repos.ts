import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeGetHealthScore } from "./get-health-score.js";
import { ComparisonResult, HealthReport } from "../types/health.js";

export const inputSchema = z.object({
    repos: z.array(
        z.object({
            owner: z.string().describe("GitHub repository owner"),
            repo: z.string().describe("GitHub repository name")
        })
    ).min(2, {
        message: "At least 2 repositories are required"
    }).max(5, {
        message: "At most 5 repositories are allowed"
    })
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
            description: "Read-only operation to compare health scores of multiple GitHub repositories (minimum 2, maximum 5). Returns a JSON object containing a ranked list of repositories, where each entry includes the owner, repo, assigned rank (1 being best), and detailed health breakdown (score, CI, freshness, security, community, maintenance). Re-uses get_health_score logic under the hood and is subject to the same public GitHub API rate limits. Requires no authentication.",
            inputSchema,
        },
        executeCompareRepos
    );
}

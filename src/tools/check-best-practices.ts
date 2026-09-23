import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOctokit, getCommunityProfile, getReadme, getFileExists, getBranchProtection } from "../github/client.js";
import { analyzeBestPractices } from "../analytics/best-practices.js";

const inputSchema = z.object({
    owner: z.string().describe("GitHub repository owner (e.g., 'facebook')"),
    repo: z.string().describe("GitHub repository name (e.g., 'react')")
});

const outputSchema = z.object({
    repo: z.string(),
    score: z.number(),
    grade: z.string(),
    totalChecks: z.number(),
    passed: z.number(),
    failed: z.number(),
    unknown: z.number(),
    checks: z.array(z.object({
        name: z.string(),
        status: z.enum(['pass', 'fail', 'unknown']),
        weight: z.number(),
        detail: z.string()
    })),
    suggestions: z.array(z.string()),
    checkedAt: z.string()
});

export async function executeCheckBestPractices({ owner, repo }: { owner: string; repo: string }) {
    try {
        const octokit = getOctokit();

        // Fetch tutto in parallelo — 5 call, ~1 secondo totale
        const [repoResponse, communityProfile, readme, dependabotConfigured, workflowsResponse] = await Promise.all([
            octokit.repos.get({ owner, repo }),
            getCommunityProfile(owner, repo),
            getReadme(owner, repo),
            getFileExists(owner, repo, '.github/dependabot.yml'),
            octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 1 })
        ]);

        const repoData = repoResponse.data;

        // Branch protection separata — può fallire con 403
        const branchProtection = await getBranchProtection(owner, repo, repoData.default_branch);

        const result = analyzeBestPractices({
            owner,
            repo,
            repoData: {
                description: repoData.description,
                license: repoData.license ? { spdx_id: repoData.license.spdx_id ?? 'Unknown' } : null,
                topics: repoData.topics ?? [],
                default_branch: repoData.default_branch,
            },
            communityProfile: {
                files: {
                    code_of_conduct: (communityProfile.files as any).code_of_conduct,
                    contributing: (communityProfile.files as any).contributing,
                    security: (communityProfile.files as any).security ?? (communityProfile.files as any).security_advisories,
                    pull_request_template: (communityProfile.files as any).pull_request_template,
                    issue_template: (communityProfile.files as any).issue_template,
                }
            },
            readme,
            dependabotConfigured,
            hasWorkflows: workflowsResponse.data.total_count > 0,
            branchProtection,
        });

        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
            }],
            structuredContent: result
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
        throw error;
    }
}

export function registerCheckBestPractices(server: McpServer): void {
    server.registerTool(
        "check_best_practices",
        {
            description: `Checks whether a GitHub repository follows open-source community best practices.
- Evaluates 12 checks: README, LICENSE, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT, issue/PR templates, branch protection, Dependabot, CI/CD, description, and topics.
- Returns a weighted 0-100 score with A-F grade, per-check pass/fail/unknown status, and actionable suggestions for missing items.
- Side effects: None. Read-only operation.
- Rate limits: ~6 GitHub API calls per invocation.
- Branch protection check requires admin access — returns "unknown" (not penalized) if token lacks permission.
- Use this tool to audit repo quality and discoverability. For a computed health grade based on CI/security/activity, use 'get_health_score' instead.`,
            inputSchema,
            outputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: true
            }
        },
        executeCheckBestPractices
    );
}

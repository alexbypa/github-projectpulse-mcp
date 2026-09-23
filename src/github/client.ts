import { Octokit } from "@octokit/rest";
import type { Release, PullRequest, WorkflowRun } from "../analytics/types.js";

let octokitInstance: Octokit | null = null;

export function getOctokit(): Octokit {
    if (!octokitInstance) {
        const token = process.env.GITHUB_TOKEN;
        octokitInstance = new Octokit({ auth: token });
    }
    return octokitInstance;
}

export async function listReleases(owner: string, repo: string, since: Date): Promise<Release[]> {
    const octokit = getOctokit();
    const { data } = await octokit.repos.listReleases({
        owner,
        repo,
        per_page: 100
    });
    return data
        .filter(r => r.published_at !== null && new Date(r.published_at) >= since)
        .map((r) => ({
        id: r.id,
        tag_name: r.tag_name,
        published_at: r.published_at!,
    }));
}

export async function listMergedPulls(owner: string, repo: string, since: Date): Promise<PullRequest[]> {
    const octokit = getOctokit();
    const { data } = await octokit.pulls.list({
        owner,
        repo,
        state: "closed",
        sort: "updated",
        direction: "desc",
        per_page: 100
    });
    return data
        .filter(p => p.merged_at !== null && new Date(p.merged_at) >= since)
        .map((p) => ({
        number: p.number,
        created_at: p.created_at,
        merged_at: p.merged_at,
    }));
}

export async function listWorkflowRuns(owner: string, repo: string, since: Date): Promise<WorkflowRun[]> {
    const octokit = getOctokit();
    const { data } = await octokit.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        per_page: 100
    });
    return data.workflow_runs
        .filter(r => new Date(r.created_at) >= since)
        .map((r) => ({
        id: r.id,
        name: r.name ?? "unknown",
        head_branch: r.head_branch ?? "unknown",
        conclusion: r.conclusion,
        created_at: r.created_at,
    }));
}

// --- Best Practices ---

export async function getCommunityProfile(owner: string, repo: string) {
    const octokit = getOctokit();
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/community/profile', {
        owner,
        repo,
    });
    return data;
}

export async function getReadme(owner: string, repo: string): Promise<{ found: boolean; size: number }> {
    const octokit = getOctokit();
    try {
        const { data } = await octokit.repos.getReadme({ owner, repo });
        return { found: true, size: data.size };
    } catch {
        return { found: false, size: 0 };
    }
}

export async function getFileExists(owner: string, repo: string, path: string): Promise<boolean> {
    const octokit = getOctokit();
    try {
        await octokit.repos.getContent({ owner, repo, path });
        return true;
    } catch {
        return false;
    }
}

export async function getBranchProtection(owner: string, repo: string, branch: string): Promise<{ protected: boolean | null }> {
    const octokit = getOctokit();
    try {
        await octokit.repos.getBranchProtection({ owner, repo, branch });
        return { protected: true };
    } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        if (status === 404) return { protected: false };
        // 403 = no admin access, can't check
        return { protected: null };
    }
}
import { DoraInput, DoraMetrics, WorkflowRun } from './types.js';

function getMedian(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

function diffHours(start: string, end: string): number {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return (e - s) / (1000 * 3600);
}

export function calculateDoraMetrics(input: DoraInput): DoraMetrics {
    // 1. deployment_frequency
    const releases_count = input.releases.length;
    const per_week = releases_count > 0 ? releases_count / (input.period_days / 7) : null;

    // 2. lead_time
    const prHours = input.mergedPulls.map(pr => diffHours(pr.created_at, pr.merged_at!));
    const lead_median = getMedian(prHours);

    // 3. change_failure_rate
    const total_runs = input.workflowRuns.length;
    const failed_runs = input.workflowRuns.filter(r => r.conclusion === 'failure').length;
    const rate_percent = total_runs > 0 ? (failed_runs / total_runs) * 100 : null;

    // 4. mttr
    const branchRuns = new Map<string, WorkflowRun[]>();
    for (const run of input.workflowRuns) {
        if (!branchRuns.has(run.head_branch)) {
            branchRuns.set(run.head_branch, []);
        }
        branchRuns.get(run.head_branch)!.push(run);
    }

    const recoveryTimes: number[] = [];
    for (const runs of branchRuns.values()) {
        runs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        let currentFailure: string | null = null;
        for (const run of runs) {
            if (run.conclusion === 'failure' && !currentFailure) {
                currentFailure = run.created_at;
            } else if (run.conclusion === 'success' && currentFailure) {
                recoveryTimes.push(diffHours(currentFailure, run.created_at));
                currentFailure = null;
            }
        }
    }

    // 5. metadata
    const measured_to = new Date();
    const measured_from = new Date(measured_to.getTime() - input.period_days * 24 * 3600 * 1000);

    return {
        owner: input.owner,
        repo: input.repo,
        period_days: input.period_days,
        measured_from: measured_from.toISOString(),
        measured_to: measured_to.toISOString(),
        deployment_frequency: {
            releases_count,
            per_week
        },
        lead_time: {
            median_hours: lead_median,
            pr_count: input.mergedPulls.length
        },
        change_failure_rate: {
            total_runs,
            failed_runs,
            rate_percent
        },
        mttr: {
            median_hours: getMedian(recoveryTimes),
            incidents_count: recoveryTimes.length
        }
    };
}

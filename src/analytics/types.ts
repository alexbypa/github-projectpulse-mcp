export type Release = {
    id: number;
    tag_name: string;
    published_at: string;
};

export type PullRequest = {
    number: number;
    created_at: string;
    merged_at: string | null;
};

export type WorkflowRun = {
    id: number;
    name: string;
    head_branch: string;
    conclusion: string | null;
    created_at: string;
};

export type DoraInput = {
    owner: string;
    repo: string;
    period_days: number;
    releases: Release[];
    mergedPulls: PullRequest[];
    workflowRuns: WorkflowRun[];
};

export type DoraMetrics = {
    owner: string;
    repo: string;
    period_days: number;
    measured_from: string;
    measured_to: string;
    deployment_frequency: {
        releases_count: number;
        per_week: number | null;
    };
    lead_time: {
        median_hours: number | null;
        pr_count: number;
    };
    change_failure_rate: {
        total_runs: number;
        failed_runs: number;
        rate_percent: number | null;
    };
    mttr: {
        median_hours: number | null;
        incidents_count: number;
    };
};
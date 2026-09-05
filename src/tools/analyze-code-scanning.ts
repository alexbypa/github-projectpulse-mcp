import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOctokit } from "../github/client.js";

const inputSchema = z.object({
    owner: z.string().describe("GitHub repository owner (e.g., 'modelcontextprotocol')"),
    repo: z.string().describe("GitHub repository name (e.g., 'sdk')"),
    trigger_scan: z.boolean().optional().default(false)
        .describe("If true, triggers CodeQL workflow then polls for results before returning alerts"),
    poll_timeout_seconds: z.number().optional().default(300)
        .describe("Max seconds to wait for CodeQL scan completion (default 300)"),
    poll_interval_seconds: z.number().optional().default(15)
        .describe("Seconds between poll attempts (default 15)")
});

const outputSchema = z.object({
    alerts: z.array(z.object({
        rule_id: z.string().nullable(),
        severity: z.string().nullable(),
        rule_description: z.string().nullable(),
        state: z.string(),
        most_recent_instance_path: z.string().optional(),
        most_recent_instance_start_line: z.number().optional(),
        html_url: z.string(),
        alert_number: z.number(),
        message_text: z.string().optional(),
        end_line: z.number().optional(),
        created_at: z.string()
    })),
    warning: z.string().optional()
});

async function discoverCodeQLWorkflow(owner: string, repo: string): Promise<{ id: number; name: string }> {
    const octokit = getOctokit();
    
    try {
        // Check if Default Setup is active
        const { data: defaultSetup } = await octokit.request(
            'GET /repos/{owner}/{repo}/code-scanning/default-setup',
            { owner, repo }
        );
        if (defaultSetup.state === 'configured') {
            throw new Error(
                `CodeQL uses Default Setup (schedule: ${defaultSetup.schedule}, last update: ${defaultSetup.updated_at}). ` +
                `Manual trigger not supported via API. Switch to Advanced Setup in repo settings to enable trigger_scan.`
            );
        }
    } catch (e: unknown) {
        // Rethrow if it's our specific error about Default Setup being active
        if (e instanceof Error && e.message.includes("CodeQL uses Default Setup")) {
            throw e;
        }
        // Otherwise (e.g., 404), proceed to look for a YAML workflow file
    }

    const { data: workflows } = await octokit.actions.listRepoWorkflows({ owner, repo });
    const codeQLWorkflow = workflows.workflows.find(w => 
        w.name.toLowerCase().includes("codeql") || 
        w.path.toLowerCase().includes("codeql")
    );
    if (!codeQLWorkflow) {
        throw new Error("CodeQL workflow not found in this repository.");
    }
    return { id: codeQLWorkflow.id, name: codeQLWorkflow.name };
}

async function triggerWorkflow(owner: string, repo: string, workflowId: number): Promise<void> {
    const octokit = getOctokit();
    const { data: repoInfo } = await octokit.repos.get({ owner, repo });
    try {
        await octokit.actions.createWorkflowDispatch({
            owner,
            repo,
            workflow_id: workflowId,
            ref: repoInfo.default_branch
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(`Failed to trigger workflow (does it have workflow_dispatch trigger?): ${message}`);
    }
}

async function findTriggeredRun(owner: string, repo: string, workflowId: number, triggeredAfter: Date): Promise<number> {
    const octokit = getOctokit();
    for (let i = 0; i < 5; i++) {
        const { data: runs } = await octokit.actions.listWorkflowRuns({
            owner,
            repo,
            workflow_id: workflowId,
            per_page: 5
        });
        
        const run = runs.workflow_runs.find(r => new Date(r.created_at) >= triggeredAfter);
        if (run) {
            return run.id;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error("Could not find the triggered workflow run.");
}

async function pollRunCompletion(owner: string, repo: string, runId: number, timeoutSec: number, intervalSec: number): Promise<{ status: string; conclusion: string | null }> {
    const octokit = getOctokit();
    const startTime = Date.now();
    const timeoutMs = timeoutSec * 1000;
    const intervalMs = intervalSec * 1000;

    while (Date.now() - startTime < timeoutMs) {
        const { data: run } = await octokit.actions.getWorkflowRun({ owner, repo, run_id: runId });
        if (run.status === "completed") {
            return { status: run.status, conclusion: run.conclusion };
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return { status: "in_progress", conclusion: null };
}

export async function executeAnalyzeCodeScanning(input: z.infer<typeof inputSchema>) {
    const { owner, repo, trigger_scan, poll_timeout_seconds, poll_interval_seconds } = input;
    
    let warning = "";

    if (trigger_scan) {
        try {
            const workflow = await discoverCodeQLWorkflow(owner, repo);
            
            // Allow a small buffer for the trigger time
            const triggeredAfter = new Date(Date.now() - 5000); 
            
            await triggerWorkflow(owner, repo, workflow.id);
            const runId = await findTriggeredRun(owner, repo, workflow.id, triggeredAfter);
            const result = await pollRunCompletion(owner, repo, runId, poll_timeout_seconds, poll_interval_seconds);
            
            if (result.status !== "completed") {
                warning = `WARNING: CodeQL scan did not complete within the timeout of ${poll_timeout_seconds} seconds. Returning currently available alerts.`;
            } else if (result.conclusion !== "success") {
                warning = `WARNING: CodeQL scan completed with conclusion: ${result.conclusion}. Returning currently available alerts.`;
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            warning = `WARNING: Failed to trigger or poll scan: ${message}. Returning currently available alerts.`;
        }
    }

    try {
        const { data } = await getOctokit().codeScanning.listAlertsForRepo({ owner, repo, state: "open" });
        const result = data.map((alert) => ({
            rule_id: alert.rule.id,
            severity: alert.rule.severity,
            rule_description: alert.rule.description,
            state: alert.state,
            most_recent_instance_path: alert.most_recent_instance.location?.path,
            most_recent_instance_start_line: alert.most_recent_instance.location?.start_line,
            html_url: alert.html_url,
            alert_number: alert.number,
            message_text: alert.most_recent_instance.message?.text,
            end_line: alert.most_recent_instance.location?.end_line,
            created_at: alert.created_at
        }));
        
        const responseText = JSON.stringify({
            alerts: result,
            ...(warning ? { warning } : {})
        }, null, 2);
        
        return {
            content: [{
                type: "text" as const,
                text: responseText
            }]
        };

    } catch (error) {
        if ((error as { status?: number }).status === 404) {
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({
                        message: "Code scanning not configured on this repo",
                        ...(warning ? { warning } : {})
                    }, null, 2)
                }]
            };
        }
        throw error;
    }
}

export function registerAnalyzeCodeScanning(server: McpServer): void {
    server.registerTool(
        "analyze_code_scanning",
        {
            description: `Fetches or triggers open Code Scanning (CodeQL) alerts for a GitHub repository.
- Side effects: Read-only by default. If trigger_scan=true, writes to GitHub Actions by creating a workflow_dispatch event.
- Data sources: GitHub REST API (code-scanning/alerts and actions).
- Auth requirements: Requires GITHUB_TOKEN with appropriate permissions (security-events).
- Rate limits: Subject to standard GitHub API limits.
- Return shape: Returns a JSON array of alert objects including rule_id, severity, rule_description, state, location paths, and html_url.
- Usage guidelines: Use this tool ONLY for deep static code vulnerability scanning (CodeQL). DO NOT use this tool for other checks:
  - For package/dependency vulnerabilities, use 'analyze_dependencies' instead.
  - For a computed A-F health score grading, use 'get_health_score' instead.
  - For checking standard CI/CD workflow statuses, use 'check_ci_status' instead.`,
            inputSchema,
            outputSchema,
            annotations: {
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false
            }
        },
        executeAnalyzeCodeScanning
    );
}

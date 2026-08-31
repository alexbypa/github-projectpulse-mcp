import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listMergedPulls, listReleases, listWorkflowRuns } from '../github/client.js';
import { executeGetDoraMetrics } from './get-dora-metrics.js';

vi.mock('../github/client.js');

describe('executeGetDoraMetrics', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should fetch data and return metrics as JSON text', async () => {
        // mock return values for the client functions
        vi.mocked(listReleases).mockResolvedValue([
            { id: 1, tag_name: 'v1.0', published_at: '2026-08-01T00:00:00Z' }
        ]);

        vi.mocked(listWorkflowRuns).mockResolvedValue([
            { id: 1, name: 'CI', head_branch: 'main', conclusion: 'success', created_at: '2026-08-01T00:00:00Z' }
        ]);

        vi.mocked(listMergedPulls).mockResolvedValue([
            { number: 1, created_at: '2026-08-01T00:00:00Z', merged_at: '2026-08-02T00:00:00Z' }
        ]);

        const result = await executeGetDoraMetrics({ owner: 'testowner', repo: 'testrepo', days: 14 });

        expect(listReleases).toHaveBeenCalledWith('testowner', 'testrepo', expect.any(Date));
        expect(listWorkflowRuns).toHaveBeenCalledWith('testowner', 'testrepo', expect.any(Date));
        expect(listMergedPulls).toHaveBeenCalledWith('testowner', 'testrepo', expect.any(Date));

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        const parsedText = JSON.parse(result.content[0].text);
        expect(parsedText.owner).toBe('testowner');
        expect(parsedText.repo).toBe('testrepo');
        expect(parsedText.period_days).toBe(14);
        
        // Assert some metric outputs based on the mocked input
        expect(parsedText.deployment_frequency.releases_count).toBe(1);
        expect(parsedText.lead_time.pr_count).toBe(1);
        expect(parsedText.change_failure_rate.total_runs).toBe(1);
        expect(parsedText.change_failure_rate.failed_runs).toBe(0);
    });

    it('should handle empty data correctly (zero releases, PRs, runs)', async () => {
        vi.mocked(listReleases).mockResolvedValue([]);
        vi.mocked(listWorkflowRuns).mockResolvedValue([]);
        vi.mocked(listMergedPulls).mockResolvedValue([]);

        const result = await executeGetDoraMetrics({ owner: 'testowner', repo: 'testrepo', days: 30 });
        const parsedText = JSON.parse(result.content[0].text);

        expect(parsedText.deployment_frequency.releases_count).toBe(0);
        expect(parsedText.deployment_frequency.per_week).toBeNull();
        expect(parsedText.lead_time.pr_count).toBe(0);
        expect(parsedText.lead_time.median_hours).toBeNull();
        expect(parsedText.change_failure_rate.total_runs).toBe(0);
        expect(parsedText.change_failure_rate.rate_percent).toBeNull();
        expect(parsedText.mttr.incidents_count).toBe(0);
        expect(parsedText.mttr.median_hours).toBeNull();
    });

    it('should pass the correct since Date to client functions', async () => {
        vi.mocked(listReleases).mockResolvedValue([]);
        vi.mocked(listWorkflowRuns).mockResolvedValue([]);
        vi.mocked(listMergedPulls).mockResolvedValue([]);

        const days = 14;
        await executeGetDoraMetrics({ owner: 'testowner', repo: 'testrepo', days });

        const expectedSince = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const callArg = vi.mocked(listReleases).mock.calls[0][2];
        
        const diffMs = Math.abs(callArg.getTime() - expectedSince.getTime());
        expect(diffMs).toBeLessThan(1000); // Tolleranza di 1 secondo per l'esecuzione
    });

    it('should fail if any client call fails', async () => {
        vi.mocked(listReleases).mockRejectedValue(new Error('API Error'));
        vi.mocked(listWorkflowRuns).mockResolvedValue([]);
        vi.mocked(listMergedPulls).mockResolvedValue([]);

        await expect(executeGetDoraMetrics({ owner: 'testowner', repo: 'testrepo', days: 30 }))
            .rejects
            .toThrow('API Error');
    });
});

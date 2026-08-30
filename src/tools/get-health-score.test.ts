import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOctokit } from '../github/client.js';
import { executeGetHealthScore } from './get-health-score.js';

vi.mock('../github/client.js');

describe('executeGetHealthScore', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should calculate health score successfully with dependabot alerts', async () => {
        const mockReposGet = vi.fn().mockResolvedValue({
            data: {
                pushed_at: '2023-10-01T00:00:00Z',
                open_issues_count: 5,
                forks_count: 10,
                license: { spdx_id: 'MIT' },
                description: 'test repo',
                archived: false
            }
        });

        const mockListRuns = vi.fn().mockResolvedValue({
            data: {
                workflow_runs: [{ conclusion: 'success' }]
            }
        });

        const mockListAlerts = vi.fn().mockResolvedValue({
            data: [
                { security_advisory: { severity: 'critical' }, state: 'open' },
                { security_advisory: { severity: 'high' }, state: 'open' }
            ]
        });

        vi.mocked(getOctokit).mockReturnValue({
            repos: { get: mockReposGet },
            actions: { listWorkflowRunsForRepo: mockListRuns },
            dependabot: { listAlertsForRepo: mockListAlerts }
        } as any);

        const result = await executeGetHealthScore({ owner: 'test', repo: 'repo' });
        
        expect(mockReposGet).toHaveBeenCalledWith({ owner: 'test', repo: 'repo' });
        expect(mockListRuns).toHaveBeenCalledWith({ owner: 'test', repo: 'repo', per_page: 10 });
        expect(mockListAlerts).toHaveBeenCalledWith({ owner: 'test', repo: 'repo' });
        
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        
        const parsedText = JSON.parse(result.content[0].text);
        expect(parsedText.repo).toBe('test/repo');
        expect(parsedText.score).toBeTypeOf('number');
        expect(parsedText.grade).toBeTypeOf('string');
        // Ensure dependabot parsing worked:
        expect(parsedText.breakdown.security.detail).toContain('1 critical');
        expect(parsedText.breakdown.security.detail).toContain('1 high');
    });

    it('should calculate health score successfully even if dependabot fails', async () => {
        const mockReposGet = vi.fn().mockResolvedValue({
            data: {
                pushed_at: '2023-10-01T00:00:00Z',
                open_issues_count: 5,
                forks_count: 10,
                license: { spdx_id: 'MIT' },
                description: 'test repo',
                archived: false
            }
        });

        const mockListRuns = vi.fn().mockResolvedValue({
            data: {
                workflow_runs: [{ conclusion: 'success' }]
            }
        });

        // Simulating 404 or disabled dependabot
        const mockListAlerts = vi.fn().mockRejectedValue(new Error('Not Found'));

        vi.mocked(getOctokit).mockReturnValue({
            repos: { get: mockReposGet },
            actions: { listWorkflowRunsForRepo: mockListRuns },
            dependabot: { listAlertsForRepo: mockListAlerts }
        } as any);

        const result = await executeGetHealthScore({ owner: 'test', repo: 'repo' });
        
        const parsedText = JSON.parse(result.content[0].text);
        expect(parsedText.repo).toBe('test/repo');
        // If dependabot fails, it should assume 0 alerts
        expect(parsedText.breakdown.security.detail).toContain('0 critical');
        expect(parsedText.breakdown.security.detail).toContain('0 high');
    });

    it('should fail if repos.get fails', async () => {
        const mockReposGet = vi.fn().mockRejectedValue(new Error('API Error'));
        const mockListRuns = vi.fn().mockResolvedValue({ data: { workflow_runs: [] } });

        vi.mocked(getOctokit).mockReturnValue({
            repos: { get: mockReposGet },
            actions: { listWorkflowRunsForRepo: mockListRuns },
            dependabot: { listAlertsForRepo: vi.fn() }
        } as any);

        await expect(executeGetHealthScore({ owner: 'test', repo: 'error-repo' }))
            .rejects
            .toThrow('API Error');
    });
});

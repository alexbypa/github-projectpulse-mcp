import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOctokit } from '../github/client.js';
import { executeCheckCiStatus } from './check-ci-status.js';

vi.mock('../github/client.js');

describe('executeCheckCiStatus', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should return recent workflow runs', async () => {
        const mockListRuns = vi.fn().mockResolvedValue({
            data: {
                workflow_runs: [
                    {
                        name: 'CI',
                        status: 'completed',
                        conclusion: 'success',
                        head_branch: 'main',
                        created_at: '2023-10-01T00:00:00Z',
                        updated_at: '2023-10-01T00:05:00Z',
                        html_url: 'https://github.com/test/repo/actions/runs/1',
                        id: 123
                    },
                    {
                        name: 'CI',
                        status: 'completed',
                        conclusion: 'failure',
                        head_branch: 'feature-branch',
                        created_at: '2023-10-02T00:00:00Z',
                        updated_at: '2023-10-02T00:05:00Z',
                        html_url: 'https://github.com/test/repo/actions/runs/2',
                        id: 124
                    }
                ]
            }
        });

        vi.mocked(getOctokit).mockReturnValue({
            actions: { listWorkflowRunsForRepo: mockListRuns }
        } as any);

        const result = await executeCheckCiStatus({ owner: 'test', repo: 'repo', limit: 10 });
        
        expect(mockListRuns).toHaveBeenCalledWith({ owner: 'test', repo: 'repo', per_page: 10 });
        
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        
        const parsedText = JSON.parse(result.content[0].text);
        expect(parsedText).toEqual([
            {
                name: 'CI',
                status: 'completed',
                conclusion: 'success',
                head_branch: 'main',
                created_at: '2023-10-01T00:00:00Z',
                updated_at: '2023-10-01T00:05:00Z',
                html_url: 'https://github.com/test/repo/actions/runs/1'
            },
            {
                name: 'CI',
                status: 'completed',
                conclusion: 'failure',
                head_branch: 'feature-branch',
                created_at: '2023-10-02T00:00:00Z',
                updated_at: '2023-10-02T00:05:00Z',
                html_url: 'https://github.com/test/repo/actions/runs/2'
            }
        ]);
    });

    it('should handle empty workflow runs', async () => {
        const mockListRuns = vi.fn().mockResolvedValue({
            data: {
                workflow_runs: []
            }
        });

        vi.mocked(getOctokit).mockReturnValue({
            actions: { listWorkflowRunsForRepo: mockListRuns }
        } as any);

        const result = await executeCheckCiStatus({ owner: 'test', repo: 'empty-repo', limit: 5 });
        
        expect(mockListRuns).toHaveBeenCalledWith({ owner: 'test', repo: 'empty-repo', per_page: 5 });
        
        const parsedText = JSON.parse(result.content[0].text);
        expect(parsedText).toEqual([]);
    });

    it('should throw error if API fails', async () => {
        const error = new Error('API Error');
        const mockListRuns = vi.fn().mockRejectedValue(error);
        
        vi.mocked(getOctokit).mockReturnValue({
            actions: { listWorkflowRunsForRepo: mockListRuns }
        } as any);

        await expect(executeCheckCiStatus({ owner: 'test', repo: 'error-repo', limit: 10 }))
            .rejects
            .toThrow('API Error');
    });
});

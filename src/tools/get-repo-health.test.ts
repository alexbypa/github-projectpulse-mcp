import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOctokit } from '../github/client.js';
import { executeGetRepoHealth } from './get-repo-health.js';

// Mock intero modulo
vi.mock('../github/client.js');

describe('executeGetRepoHealth', () => {
    beforeEach(() => {
        vi.resetAllMocks();  // pulisci mock tra un test e l'altro
    });

    it('should return repo data for valid repo', async () => {
        // 1. Configura mock: getOctokit() ritorna oggetto con repos.get()
        const mockReposGet = vi.fn().mockResolvedValue({
            data: {
                full_name: 'test/repo',
                description: 'test description',
                stargazers_count: 100,
                open_issues_count: 5,
                language: 'TypeScript',
                license: { spdx_id: 'MIT' },
                pushed_at: '2023-10-01T00:00:00Z',
                default_branch: 'main',
                archived: false,
                forks_count: 10
            }
        });

        vi.mocked(getOctokit).mockReturnValue({
            repos: { get: mockReposGet }
        } as any);

        // 2. Chiama il tool
        const result = await executeGetRepoHealth({ owner: 'test', repo: 'repo' });

        // 3. Verifica output
        expect(mockReposGet).toHaveBeenCalledWith({ owner: 'test', repo: 'repo' });

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        const parsedText = JSON.parse(result.content[0].text);
        expect(parsedText).toEqual({
            full_name: 'test/repo',
            description: 'test description',
            stargazers_count: 100,
            open_issues_count: 5,
            language: 'TypeScript',
            license: 'MIT',
            pushed_at: '2023-10-01T00:00:00Z',
            default_branch: 'main',
            archived: false,
            forks_count: 10
        });
    });

    it('should handle 404 for non-existent repo', async () => {
        // 1. Configura mock: repos.get() lancia errore con status 404
        const notFoundError = new Error('Not Found') as any;
        notFoundError.status = 404;

        const mockReposGet = vi.fn().mockRejectedValue(notFoundError);

        vi.mocked(getOctokit).mockReturnValue({
            repos: { get: mockReposGet }
        } as any);

        // 2. Chiama il tool
        const result = await executeGetRepoHealth({ owner: 'test', repo: 'not-found' });

        // 3. Verifica che ritorna messaggio errore, non throw
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        const parsedText = JSON.parse(result.content[0].text);
        expect(parsedText).toEqual({
            error: "Repository not found",
            details: "Not Found"
        });
    });

    it('should throw error for non-404 errors', async () => {
        const serverError = new Error('Internal Server Error') as any;
        serverError.status = 500;

        const mockReposGet = vi.fn().mockRejectedValue(serverError);

        vi.mocked(getOctokit).mockReturnValue({
            repos: { get: mockReposGet }
        } as any);

        await expect(executeGetRepoHealth({ owner: 'test', repo: 'error-repo' }))
            .rejects
            .toThrow('Internal Server Error');
    });
});
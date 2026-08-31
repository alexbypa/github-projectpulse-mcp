import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCompareRepos, inputSchema } from './compare-repos.js';
import { executeGetHealthScore } from './get-health-score.js';

vi.mock('./get-health-score.js');

describe('executeCompareRepos', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should retrieve scores, rank repositories correctly including ties, and handle failures gracefully', async () => {
        // Mock executeGetHealthScore behavior:
        // repo-a: 85 score
        // repo-b: 85 score (tie with repo-a)
        // repo-c: 70 score (should be rank 3 in standard competition ranking)
        // repo-fail: fails
        
        vi.mocked(executeGetHealthScore).mockImplementation(async (repo) => {
            if (repo.repo === 'repo-a') {
                return {
                    content: [{
                        type: 'text' as const,
                        text: JSON.stringify({
                            repo: 'test/repo-a',
                            score: 85,
                            grade: 'B',
                            breakdown: {},
                            suggestions: [],
                            checkedAt: '2023-10-01T00:00:00Z'
                        })
                    }]
                };
            }
            if (repo.repo === 'repo-b') {
                return {
                    content: [{
                        type: 'text' as const,
                        text: JSON.stringify({
                            repo: 'test/repo-b',
                            score: 85,
                            grade: 'B',
                            breakdown: {},
                            suggestions: [],
                            checkedAt: '2023-10-01T00:00:00Z'
                        })
                    }]
                };
            }
            if (repo.repo === 'repo-c') {
                return {
                    content: [{
                        type: 'text' as const,
                        text: JSON.stringify({
                            repo: 'test/repo-c',
                            score: 70,
                            grade: 'C',
                            breakdown: {},
                            suggestions: [],
                            checkedAt: '2023-10-01T00:00:00Z'
                        })
                    }]
                };
            }
            throw new Error('API Rate Limit or Repository not found');
        });

        const repos = [
            { owner: 'test', repo: 'repo-a' },
            { owner: 'test', repo: 'repo-fail' },
            { owner: 'test', repo: 'repo-b' },
            { owner: 'test', repo: 'repo-c' }
        ];

        const result = await executeCompareRepos({ repos });
        
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        
        const comparison = JSON.parse(result.content[0].text);
        expect(comparison.compared_at).toBeDefined();
        expect(comparison.repos).toHaveLength(4);

        // Verify sorting order: success ordered by score desc, then failures
        expect(comparison.repos[0].repo).toMatch(/repo-a|repo-b/);
        expect(comparison.repos[1].repo).toMatch(/repo-a|repo-b/);
        expect(comparison.repos[2].repo).toBe('repo-c');
        expect(comparison.repos[3].repo).toBe('repo-fail');

        const repoA = comparison.repos.find((r: any) => r.repo === 'repo-a');
        const repoB = comparison.repos.find((r: any) => r.repo === 'repo-b');
        const repoC = comparison.repos.find((r: any) => r.repo === 'repo-c');
        const repoFail = comparison.repos.find((r: any) => r.repo === 'repo-fail');

        expect(repoA.rank).toBe(1);
        expect(repoA.health.score).toBe(85);
        expect(repoA.error).toBeNull();

        expect(repoB.rank).toBe(1);
        expect(repoB.health.score).toBe(85);
        expect(repoB.error).toBeNull();

        // repo-c should be rank 3 (since 2 repos share rank 1)
        expect(repoC.rank).toBe(3);
        expect(repoC.health.score).toBe(70);
        expect(repoC.error).toBeNull();

        // repo-fail should be rank 0 with error details
        expect(repoFail.rank).toBe(0);
        expect(repoFail.health).toBeNull();
        expect(repoFail.error).toContain('API Rate Limit');
    });

    describe('inputSchema validation', () => {
        it('should validate correctly with 2 to 5 repos', () => {
            const valid = inputSchema.safeParse({
                repos: [
                    { owner: 'owner1', repo: 'repo1' },
                    { owner: 'owner2', repo: 'repo2' }
                ]
            });
            expect(valid.success).toBe(true);
        });

        it('should fail validation with less than 2 repos', () => {
            const invalid = inputSchema.safeParse({
                repos: [
                    { owner: 'owner1', repo: 'repo1' }
                ]
            });
            expect(invalid.success).toBe(false);
            if (!invalid.success) {
                expect(invalid.error.issues[0].message).toBe('At least 2 repositories are required');
            }
        });

        it('should fail validation with more than 5 repos', () => {
            const invalid = inputSchema.safeParse({
                repos: [
                    { owner: 'owner1', repo: 'repo1' },
                    { owner: 'owner2', repo: 'repo2' },
                    { owner: 'owner3', repo: 'repo3' },
                    { owner: 'owner4', repo: 'repo4' },
                    { owner: 'owner5', repo: 'repo5' },
                    { owner: 'owner6', repo: 'repo6' }
                ]
            });
            expect(invalid.success).toBe(false);
            if (!invalid.success) {
                expect(invalid.error.issues[0].message).toBe('At most 5 repositories are allowed');
            }
        });
    });
});

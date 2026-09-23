import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOctokit, getCommunityProfile, getReadme, getFileExists, getBranchProtection } from '../github/client.js';
import { executeCheckBestPractices } from './check-best-practices.js';

vi.mock('../github/client.js');

describe('check_best_practices', () => {
    const owner = 'test-owner';
    const repo = 'test-repo';

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should return score and checks for valid repo', async () => {
        // Mock: getOctokit() -> repos.get() + actions.listWorkflowRunsForRepo()
        const mockOctokit = {
            repos: {
                get: vi.fn().mockResolvedValue({ 
                    data: { 
                        default_branch: 'main',
                        description: 'Test repo',
                        license: { spdx_id: 'MIT' },
                        topics: ['testing']
                    } 
                })
            },
            actions: {
                listWorkflowRunsForRepo: vi.fn().mockResolvedValue({ data: { total_count: 5 } })
            }
        };
        vi.mocked(getOctokit).mockReturnValue(mockOctokit as any);

        // Mock: getCommunityProfile() -> files con contributing, security, ecc.
        vi.mocked(getCommunityProfile).mockResolvedValue({
            description: 'Test repo',
            documentation: 'https://docs.test',
            files: {
                code_of_conduct: { key: 'coc', name: 'CODE_OF_CONDUCT.md', html_url: 'url', url: 'url' },
                code_of_conduct_file: { url: 'url', html_url: 'url' },
                contributing: { url: 'url', html_url: 'url' },
                issue_template: null,
                pull_request_template: null,
                license: { key: 'mit', name: 'MIT', spdx_id: 'MIT', url: 'url', node_id: 'node' },
                readme: { url: 'url', html_url: 'url' },
                security: { url: 'url', html_url: 'url' }
            },
            health_percentage: 100,
            updated_at: '2023-01-01T00:00:00Z'
        });

        // Mock: getReadme() -> { found: boolean, size: number }
        vi.mocked(getReadme).mockResolvedValue({ found: true, size: 100 } as any);

        // Mock: getFileExists() -> true (dependabot)
        vi.mocked(getFileExists).mockResolvedValue(true);

        // Mock: getBranchProtection() -> { protected: boolean | null }
        vi.mocked(getBranchProtection).mockResolvedValue({ protected: true } as any);

        // Chiama executeCheckBestPractices({ owner, repo })
        const result = await executeCheckBestPractices({ owner, repo });

        // Verifica: result.structuredContent ha score, grade, checks array, suggestions
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content[0].type).toBe('text');
        
        const contentText = result.content[0].text;
        expect(contentText).toContain('test-owner/test-repo');
        
        expect(result.structuredContent).toBeDefined();
        const sc = result.structuredContent as any;
        expect(sc.score).toBeDefined();
        expect(typeof sc.score).toBe('number');
        expect(sc.grade).toBeDefined();
        expect(typeof sc.grade).toBe('string');
        expect(sc.checks).toBeDefined();
        expect(Array.isArray(sc.checks)).toBe(true);
        expect(sc.suggestions).toBeDefined();
        expect(Array.isArray(sc.suggestions)).toBe(true);
    });

    it('should handle 404 for non-existent repo', async () => {
        // Mock: getOctokit() -> repos.get() lancia errore status 404
        const mockOctokit = {
            repos: {
                get: vi.fn().mockRejectedValue({ status: 404 })
            },
            actions: {
                listWorkflowRunsForRepo: vi.fn().mockResolvedValue({ data: { total_count: 0 } })
            }
        };
        vi.mocked(getOctokit).mockReturnValue(mockOctokit as any);

        const result = await executeCheckBestPractices({ owner, repo });

        // Verifica: result.content[0].text contiene "Repository not found"
        expect(result.content[0].text).toContain('not found');
    });

    it('should handle unknown branch protection when 403', async () => {
         const mockOctokit = {
            repos: {
                get: vi.fn().mockResolvedValue({ 
                    data: { 
                        default_branch: 'main',
                        description: 'Test repo',
                        license: { spdx_id: 'MIT' },
                        topics: ['testing']
                    } 
                })
            },
            actions: {
                listWorkflowRunsForRepo: vi.fn().mockResolvedValue({ data: { total_count: 5 } })
            }
        };
        vi.mocked(getOctokit).mockReturnValue(mockOctokit as any);

        vi.mocked(getCommunityProfile).mockResolvedValue({
            description: 'Test',
            documentation: '',
            files: {
                 code_of_conduct: null,
                code_of_conduct_file: null,
                contributing: null,
                issue_template: null,
                pull_request_template: null,
                license: null,
                readme: null,
                security: null
            },
            health_percentage: 50,
            updated_at: '2023-01-01'
        });

        vi.mocked(getReadme).mockResolvedValue({ found: false, size: 0 } as any);
        vi.mocked(getFileExists).mockResolvedValue(true);

        // Mock: getBranchProtection() -> { protected: null } per test 403
        vi.mocked(getBranchProtection).mockResolvedValue({ protected: null } as any);

        const result = await executeCheckBestPractices({ owner, repo });

        // Verifica: check branch_protection ha status 'unknown', non 'fail'
        expect(result.structuredContent).toBeDefined();
        const sc = result.structuredContent as any;
        const branchProtectionCheck = sc.checks.find((c: any) => c.name === 'Branch Protection');
        expect(branchProtectionCheck).toBeDefined();
        expect(branchProtectionCheck.status).toBe('unknown');
    });
});

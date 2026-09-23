import { describe, it, expect } from 'vitest';
import { analyzeBestPractices, BestPracticesInput } from './best-practices.js';

const fullPassInput: BestPracticesInput = {
  owner: 'test',
  repo: 'repo',
  repoData: {
    description: 'A test repo',
    license: { spdx_id: 'MIT' },
    topics: ['mcp', 'health'],
    default_branch: 'main',
  },
  communityProfile: {
    files: {
      code_of_conduct: { url: 'x' },
      contributing: { url: 'x' },
      security: { url: 'x' },
      pull_request_template: { url: 'x' },
      issue_template: { url: 'x' },
    },
  },
  readme: { found: true, size: 500 },
  dependabotConfigured: true,
  hasWorkflows: true,
  branchProtection: { protected: true },
};

describe('analyzeBestPractices', () => {
  it('returns score 100 and grade A when all checks pass', () => {
    const result = analyzeBestPractices(fullPassInput);
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.passed).toBe(12);
    expect(result.failed).toBe(0);
    expect(result.suggestions).toHaveLength(0);
  });

  it('returns grade F when everything fails', () => {
    const input: BestPracticesInput = {
      owner: 'test',
      repo: 'empty',
      repoData: { description: null, license: null, topics: [], default_branch: 'main' },
      communityProfile: {
        files: {
          code_of_conduct: null, contributing: null,
          security: null, pull_request_template: null, issue_template: null,
        },
      },
      readme: { found: false, size: 0 },
      dependabotConfigured: false,
      hasWorkflows: false,
      branchProtection: { protected: false },
    };
    const result = analyzeBestPractices(input);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
    expect(result.failed).toBe(12);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('unknown branch protection does not penalize score', () => {
    const input: BestPracticesInput = {
      ...fullPassInput,
      branchProtection: { protected: null },
    };
    const result = analyzeBestPractices(input);
    expect(result.unknown).toBe(1);
    // Score calcolato su 11 check, tutti pass → still 100
    expect(result.score).toBe(100);
  });

  it('suggestions ordered by weight descending', () => {
    const input: BestPracticesInput = {
      ...fullPassInput,
      repoData: { ...fullPassInput.repoData, topics: [] }, // weight 1, fail
      communityProfile: {
        files: { ...fullPassInput.communityProfile.files, security: null }, // weight 3, fail
      },
    };
    const result = analyzeBestPractices(input);
    expect(result.suggestions[0]).toContain('Security Policy');
    expect(result.suggestions[1]).toContain('Topics');
  });
});

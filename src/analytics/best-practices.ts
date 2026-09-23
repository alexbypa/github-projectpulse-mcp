import type { BestPracticeCheck, BestPracticesReport, CheckStatus } from '../types/best-practices.js';
import { scoreToGrade } from '../scoring/health-score.js';

// Input: dati già raccolti dal tool wrapper
type BestPracticesInput = {
  owner: string;
  repo: string;
  repoData: {
    description: string | null;
    license: { spdx_id: string } | null;
    topics: string[];
    default_branch: string;
  };
  communityProfile: {
    files: {
      code_of_conduct: unknown | null;
      contributing: unknown | null;
      security: unknown | null;
      pull_request_template: unknown | null;
      issue_template: unknown | null;
    };
  };
  readme: { found: boolean; size: number };
  dependabotConfigured: boolean;
  hasWorkflows: boolean;
  branchProtection: { protected: boolean | null };
};

function check(name: string, status: CheckStatus, weight: number, detail: string): BestPracticeCheck {
  return { name, status, weight, detail };
}

export function analyzeBestPractices(input: BestPracticesInput): BestPracticesReport {
  const { repoData, communityProfile, readme, dependabotConfigured, hasWorkflows, branchProtection } = input;
  const files = communityProfile.files;

  const checks: BestPracticeCheck[] = [
    // Alto (weight 3)
    check('README', readme.found && readme.size > 0 ? 'pass' : 'fail', 3,
      readme.found ? (readme.size > 0 ? 'README present and not empty' : 'README exists but is empty') : 'No README found'),

    check('LICENSE', repoData.license != null ? 'pass' : 'fail', 3,
      repoData.license ? `License: ${repoData.license.spdx_id}` : 'No license — code is not legally reusable'),

    check('Security Policy', files.security != null ? 'pass' : 'fail', 3,
      files.security ? 'SECURITY.md or security policy present' : 'No security policy — vulnerability reporters have no contact channel'),

    check('Branch Protection',
      branchProtection.protected == null ? 'unknown' : (branchProtection.protected ? 'pass' : 'fail'), 3,
      branchProtection.protected == null ? 'Cannot verify — requires admin access'
        : (branchProtection.protected ? 'Default branch is protected' : 'Default branch has no protection — anyone can push directly')),

    check('Dependabot', dependabotConfigured ? 'pass' : 'fail', 3,
      dependabotConfigured ? '.github/dependabot.yml configured' : 'No Dependabot config — dependency vulnerabilities not auto-detected'),

    check('CI/CD', hasWorkflows ? 'pass' : 'fail', 3,
      hasWorkflows ? 'GitHub Actions workflows configured' : 'No CI/CD workflows found'),

    // Medio (weight 2)
    check('CONTRIBUTING', files.contributing != null ? 'pass' : 'fail', 2,
      files.contributing ? 'CONTRIBUTING.md present' : 'No contributing guide — new contributors lack onboarding'),

    check('Issue Templates', files.issue_template != null ? 'pass' : 'fail', 2,
      files.issue_template ? 'Issue templates configured' : 'No issue templates — bug reports will lack structure'),

    check('PR Template', files.pull_request_template != null ? 'pass' : 'fail', 2,
      files.pull_request_template ? 'Pull request template configured' : 'No PR template'),

    check('Description', (repoData.description ?? '').length > 0 ? 'pass' : 'fail', 2,
      repoData.description ? 'Repository description set' : 'No description — repo is invisible in search'),

    // Basso (weight 1)
    check('Code of Conduct', files.code_of_conduct != null ? 'pass' : 'fail', 1,
      files.code_of_conduct ? 'Code of conduct present' : 'No code of conduct'),

    check('Topics', repoData.topics.length > 0 ? 'pass' : 'fail', 1,
      repoData.topics.length > 0 ? `${repoData.topics.length} topics configured` : 'No topics — reduces discoverability'),
  ];

  // Score pesato: solo pass e fail contano, unknown esclusi
  const scorable = checks.filter(c => c.status !== 'unknown');
  const totalWeight = scorable.reduce((sum, c) => sum + c.weight, 0);
  const passedWeight = scorable.filter(c => c.status === 'pass').reduce((sum, c) => sum + c.weight, 0);
  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

  // Suggestions per i fail, ordinati per weight decrescente
  const suggestions = checks
    .filter(c => c.status === 'fail')
    .sort((a, b) => b.weight - a.weight)
    .map(c => `${c.name}: ${c.detail}`);

  return {
    repo: `${input.owner}/${input.repo}`,
    score,
    grade: scoreToGrade(score),
    totalChecks: checks.length,
    passed: checks.filter(c => c.status === 'pass').length,
    failed: checks.filter(c => c.status === 'fail').length,
    unknown: checks.filter(c => c.status === 'unknown').length,
    checks,
    suggestions,
    checkedAt: new Date().toISOString(),
  };
}

export type { BestPracticesInput };

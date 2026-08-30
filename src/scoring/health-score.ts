import { Grade, CategoryScore, HealthReport } from "../types/health.js";

const WEIGHTS = {
    ci: 0.25,
    freshness: 0.20,
    community: 0.15,
    security: 0.25,
    maintenance: 0.15,
} as const;

export function scoreToGrade(score: number): Grade {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
}

export function calculateCiScore(runs: Array<{ conclusion: string | null }>): CategoryScore {
    const passed = runs.filter(r => r.conclusion === "success").length;
    const total = runs.length;
    const score = total === 0 ? 0 : Math.round((passed / total) * 100);
    return { score, weight: WEIGHTS.ci, detail: `${passed}/${total} runs passed` };
}

export function calculateFreshnessScore(pushedAt: string): CategoryScore {
    const daysAgo = (Date.now() - new Date(pushedAt).getTime()) / (1000 * 60 * 60 * 24);
    let score: number;
    if (daysAgo < 7) score = 100;
    else if (daysAgo < 30) score = 70;
    else if (daysAgo < 90) score = 40;
    else score = 10;
    return { score, weight: WEIGHTS.freshness, detail: `Last push ${Math.round(daysAgo)} days ago` };
}

export function calculateSecurityScore(alertCounts: { critical: number; high: number; medium: number; low: number }): CategoryScore {
    const { critical, high, medium, low } = alertCounts;
    let score = 100;
    score -= critical * 25;
    score -= high * 15;
    score -= medium * 5;
    score -= low * 2;
    score = Math.max(0, score);
    return { score, weight: WEIGHTS.security, detail: `Alerts: ${critical} critical, ${high} high, ${medium} medium, ${low} low` };
}

export function calculateCommunityScore(openIssues: number, forks: number): CategoryScore {
    let score = 50;
    if (forks > 10) score += 25;
    else if (forks > 0) score += 10;
    if (openIssues > 50) score -= 25;
    else if (openIssues > 20) score -= 10;
    score = Math.max(0, Math.min(100, score));
    return { score, weight: WEIGHTS.community, detail: `${openIssues} open issues, ${forks} forks` };
}

export function calculateMaintenanceScore(hasLicense: boolean, hasDescription: boolean, archived: boolean): CategoryScore {
    let score = 0;
    if (hasLicense) score += 35;
    if (hasDescription) score += 35;
    if (!archived) score += 30;
    return { score, weight: WEIGHTS.maintenance, detail: `License: ${hasLicense}, Description: ${hasDescription}, Active: ${!archived}` };
}

export function calculateHealthScore(
    repo: string,
    categories: Record<string, CategoryScore>
): HealthReport {
    const values = Object.values(categories);
    const score = Math.round(values.reduce((sum, cat) => sum + cat.score * cat.weight, 0));
    const grade = scoreToGrade(score);
    const suggestions = values
        .filter(cat => cat.score < 50)
        .map(cat => `Improve ${cat.detail} (score: ${cat.score}/100)`);
    return { repo, score, grade, breakdown: categories, suggestions, checkedAt: new Date().toISOString() };
}

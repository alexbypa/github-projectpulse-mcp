import { Grade, CategoryScore, HealthReport, Recommendation, RecommendationContext } from "../types/health.js";
import { fetchOpenSSFScore } from "../security/openssf-client.js";

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

export function calculateSecurityScore(alertCounts: { critical: number; high: number; medium: number; low: number }, openssfScore?: number): CategoryScore {
    const { critical, high, medium, low } = alertCounts;

    // openSsfScore viene calcolato prendendo i punteggi più recenti di security-scorecards
    let scoreDependaBot = 100;

    scoreDependaBot -= critical * 25;
    scoreDependaBot -= high * 15;
    scoreDependaBot -= medium * 5;
    scoreDependaBot -= low * 2;
    scoreDependaBot = Math.max(0, scoreDependaBot);

    let score = scoreDependaBot;
    if (openssfScore != undefined) {
        score = Math.round(scoreDependaBot * 0.6 + openssfScore * 0.4)
    }

    return {
        score: score,
        weight: WEIGHTS.security,
        detail: `Alerts: ${critical} critical, ${high} high, ${medium} medium, ${low} low${openssfScore !== undefined ? ` | OpenSSF: ${openssfScore}/100` : ''}`
    };

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
    return { repo, score, grade, breakdown: categories, suggestions, checkedAt: new Date().toISOString(), gradeMeaning: gradeToMeaning(grade) };
}

export function generateRecommendations(
    categories: Record<string, CategoryScore>,
    context: RecommendationContext
): Recommendation[] {
    const recs: Recommendation[] = [];

    // CI
    if (context.ciTotal > 0) {
        const failed = context.ciTotal - context.ciPassed;
        const failRate = failed / context.ciTotal;
        if (failRate > 0.3) {
            recs.push({
                category: "ci",
                priority: "high",
                message: `Stabilize CI pipeline: ${failed}/${context.ciTotal} recent runs failed`,
                impact: "Score +10-20 points",
            });
        }
    } else {
        recs.push({
            category: "ci",
            priority: "medium",
            message: "Set up CI/CD with GitHub Actions to automate testing and builds",
            impact: "Score +15-25 points",
        });
    }

    // Freshness
    if (context.daysSinceLastPush > 90) {
        recs.push({
            category: "freshness",
            priority: "high",
            message: `Repository appears inactive — last push was ${Math.round(context.daysSinceLastPush)} days ago`,
            impact: "Score +15-25 points",
        });
    } else if (context.daysSinceLastPush > 30) {
        recs.push({
            category: "freshness",
            priority: "medium",
            message: `Last push was ${Math.round(context.daysSinceLastPush)} days ago — consider more frequent updates`,
            impact: "Score +5-10 points",
        });
    }

    // Security — critical
    if (context.alerts.critical > 0) {
        recs.push({
            category: "security",
            priority: "high",
            message: `Fix ${context.alerts.critical} critical Dependabot alert(s) to reduce security risk`,
            impact: "Score +10-25 points",
        });
    }
    // Security — high
    if (context.alerts.high > 0) {
        recs.push({
            category: "security",
            priority: "medium",
            message: `Address ${context.alerts.high} high-severity Dependabot alert(s)`,
            impact: "Score +5-15 points",
        });
    }

    // Maintenance — license
    if (!context.hasLicense) {
        recs.push({
            category: "maintenance",
            priority: "high",
            message: "Add a LICENSE file — without one, the code is legally unusable by others",
            impact: "Score +5 points",
        });
    }
    // Maintenance — description
    if (!context.hasDescription) {
        recs.push({
            category: "maintenance",
            priority: "medium",
            message: "Add a repository description to improve discoverability",
            impact: "Score +5 points",
        });
    }
    // Maintenance — archived
    if (context.archived) {
        recs.push({
            category: "maintenance",
            priority: "high",
            message: "Repository is archived — unarchive it if the project is still active",
            impact: "Score +5 points",
        });
    }

    // Community — issue backlog
    if (context.openIssues > 50) {
        recs.push({
            category: "community",
            priority: "medium",
            message: `${context.openIssues} open issues — consider triaging or closing stale ones`,
            impact: "Score +5-10 points",
        });
    }

    // Sort: high → medium → low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recs;
}

export function generateBadgeSnippet(score: number): string {
    let color: string;
    if (score >= 90) color = "brightgreen";
    else if (score >= 70) color = "green";
    else if (score >= 50) color = "yellow";
    else if (score >= 30) color = "orange";
    else color = "red";

    const now = new Date();
    const monthYear = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const label = encodeURIComponent("ProjectPulse Health");
    const value = encodeURIComponent(`${score}/100 · ${monthYear}`);

    return [
        `### Badge for your README`,
        `\`\`\`markdown`,
        `![ProjectPulse Health](https://img.shields.io/badge/${label}-${value}-${color})`,
        `\`\`\``,
        ``,
        `Powered by [projectpulse-mcp](https://www.npmjs.com/package/projectpulse-mcp)`,
    ].join("\n");
}

function gradeToMeaning(grade: Grade): string {
    switch (grade) {
        case "A":
            return "Excellent: The repository is actively maintained, secure, and has a strong community presence.";
        case "B":
            return "Good: The repository is well-maintained but may have minor areas for improvement.";
        case "C":
            return "Average: The repository needs significant improvements to be considered healthy.";
        case "D":
            return "Poor: The repository is not well-maintained and requires immediate attention.";
        case "F":
            return "Critical: The repository is abandoned or has critical issues that need to be addressed.";
        default:
            return "Unknown";
    }
}


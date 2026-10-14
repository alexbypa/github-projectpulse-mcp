import { OpenSSFCheck, OpenSSFResult } from "./types.js";

const BASE_URL = "https://api.securityscorecards.dev/projects/github.com";

export async function fetchOpenSSFScore(owner: string, repo: string): Promise<OpenSSFResult | null> {
    try {
        const response = await fetch(`${BASE_URL}/${owner}/${repo}`, {
            signal: AbortSignal.timeout(5000)
        })

        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        if (typeof data.score !== "number" || data.score < 0) {
            return null;
        }
        const checks: OpenSSFCheck[] = data.checks;

        return calculateOpenSSFResult(checks, data.score);


    } catch (error) {
        console.error("Error fetching OpenSSF score:", error);
        return null;
    }
}

const SECURITY_CHECKS = new Set(["Binary-Artifacts", "Fuzzing", "Dependency-Update-Tool", "Branch-Protection", "Code-Review", "Dangerous-Workflow", "Pinned-Dependencies", "SAST", "Security-Policy", "Signed-Releases", "Token-Permissions", "Vulnerabilities"]);

export function calculateOpenSSFResult(checks: OpenSSFCheck[], officialScore: number): OpenSSFResult | null {
    const securityChecks = checks.filter(check => SECURITY_CHECKS.has(check.name));
    const applicableChecks = securityChecks.filter(c => c.score !== -1);// solo quelli applicabili

    if (applicableChecks.length === 0) {
        return null;
    }
    const securityChecksAverage = Math.round((applicableChecks.reduce((sum, item) => sum + item.score, 0) / applicableChecks.length) * 10);
    const score = Math.round(officialScore * 10);

    const sorted = [...checks]
        .map(c => ({
            name: c.name,
            score: c.score,
            reason: c.reason,
            documentation: { url: c.documentation?.url ?? "" }
        }))
        .sort((a, b) => {
            if (a.score === b.score) return 0;
            if (a.score === -1) return 1;
            if (b.score === -1) return -1;
            return a.score - b.score;
        });

    return {
        score: score,
        securityChecksAverage: securityChecksAverage,
        checksUsed: applicableChecks.length,
        checksTotal: securityChecks.length,
        details: `${applicableChecks.length}/${securityChecks.length} security checks, official ${score}/100, security-checks avg ${securityChecksAverage}/100`,
        checks: sorted
    };
}
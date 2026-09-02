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
        const checks: OpenSSFCheck[] = data.checks;

        return calculateOpenSSFResult(checks);


    } catch (error) {
        console.debug("Error fetching OpenSSF score:", error);
        return null;
    }
}

const SECURITY_CHECKS = new Set(["Binary-Artifacts", "Fuzzing", "Dependency-Update-Tool", "Branch-Protection", "Code-Review", "Dangerous-Workflow", "Pinned-Dependencies", "SAST", "Security-Policy", "Signed-Releases", "Token-Permissions", "Vulnerabilities"]);

export function calculateOpenSSFResult(checks: OpenSSFCheck[]): OpenSSFResult | null {
    const securityChecks = checks.filter(check => SECURITY_CHECKS.has(check.name));
    const applicableChecks = securityChecks.filter(c => c.score !== -1);// solo quelli applicabili

    if (applicableChecks.length === 0) {
        return null;
    }
    const score = Math.round((applicableChecks.reduce((sum, item) => sum + item.score, 0) / applicableChecks.length) * 10);

    return {
        score: score,
        checksUsed: applicableChecks.length,
        checksTotal: securityChecks.length,
        details: `${applicableChecks.length}/${securityChecks.length} security checks, score ${score}/100`
    }
}
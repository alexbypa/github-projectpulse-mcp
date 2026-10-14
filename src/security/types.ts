export type OpenSSFCheck = {
    name: string;
    score: number;
    reason: string;
    documentation: { url: string };
};

export type OpenSSFResult = {
    score: number;                  // ufficiale Scorecard, 0-100 (data.score * 10)
    securityChecksAverage: number;  // media semplice dei 12 check security, 0-100
    checksUsed: number;
    checksTotal: number;
    details: string;
    checks: OpenSSFCheck[];         // tutti i check, peggiore prima, -1 in fondo
};
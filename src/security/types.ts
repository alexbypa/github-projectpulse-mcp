export type OpenSSFCheck = {
    name: string;
    score: number;
    reason: string;
    documentation: { url: string };
};

export type OpenSSFResult = {
    score: number;
    checksUsed: number;
    checksTotal: number;
    details: string;
};
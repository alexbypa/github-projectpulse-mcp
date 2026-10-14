import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateOpenSSFResult, fetchOpenSSFScore } from './openssf-client.js';
import { OpenSSFCheck } from './types.js';

describe('calculateOpenSSFResult', () => {
    it('calcola correttamente lo score con check misti', () => {
        const mockChecks: OpenSSFCheck[] = [
            { name: "Branch-Protection", score: 8, reason: "found", documentation: { url: "https://..." } },
            { name: "SAST", score: 6, reason: "found", documentation: { url: "https://..." } },
            { name: "Vulnerabilities", score: -1, reason: "not applicable", documentation: { url: "https://..." } },
            { name: "CI-Tests", score: 10, reason: "found", documentation: { url: "https://..." } },
        ];
        
        const result = calculateOpenSSFResult(mockChecks, 7.2);
        
        expect(result).not.toBeNull();
        expect(result?.checksTotal).toBe(3);
        expect(result?.checksUsed).toBe(2);
        expect(result?.score).toBe(72);
        expect(result?.securityChecksAverage).toBe(70);
        expect(result?.details).toBe('2/3 security checks, official 72/100, security-checks avg 70/100');
    });

    it('ritorna null se tutti i security check hanno score -1', () => {
        const mockChecks: OpenSSFCheck[] = [
            { name: "Branch-Protection", score: -1, reason: "not applicable", documentation: { url: "https://..." } },
            { name: "SAST", score: -1, reason: "not applicable", documentation: { url: "https://..." } },
        ];
        
        const result = calculateOpenSSFResult(mockChecks, 7.2);
        
        expect(result).toBeNull();
    });

    it('ritorna null se non ci sono check security nel set', () => {
        const mockChecks: OpenSSFCheck[] = [
            { name: "CI-Tests", score: 10, reason: "found", documentation: { url: "https://..." } },
            { name: "License", score: 10, reason: "found", documentation: { url: "https://..." } },
            { name: "Maintained", score: 10, reason: "found", documentation: { url: "https://..." } },
        ];
        
        const result = calculateOpenSSFResult(mockChecks, 7.2);
        
        expect(result).toBeNull();
    });

    it('ritorna null per un array vuoto', () => {
        const result = calculateOpenSSFResult([], 7.2);
        
        expect(result).toBeNull();
    });

    it('should return checks sorted worst first with -1 last', () => {
        const input: OpenSSFCheck[] = [
            { name: "Branch-Protection", score: 10, reason: "found", documentation: { url: "https://..." } },
            { name: "SAST", score: -1, reason: "not applicable", documentation: { url: "https://..." } },
            { name: "Vulnerabilities", score: 3, reason: "found", documentation: { url: "https://..." } },
            { name: "Token-Permissions", score: 7, reason: "found", documentation: { url: "https://..." } },
        ];

        const result = calculateOpenSSFResult(input, 6.0);

        expect(result).not.toBeNull();
        expect(result?.checks.map(c => c.score)).toEqual([3, 7, 10, -1]);
        expect(input[0].score).toBe(10);
    });
});

describe('fetchOpenSSFScore', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        fetchSpy = vi.spyOn(global, 'fetch');
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    it('ritorna OpenSSFResult in caso di successo', async () => {
        const mockChecks = [
            { name: "Branch-Protection", score: 10, reason: "found", documentation: { url: "https://..." } }
        ];
        fetchSpy.mockResolvedValue(new Response(JSON.stringify({ score: 10, checks: mockChecks }), { status: 200 }));
        
        const result = await fetchOpenSSFScore('owner', 'repo');
        
        expect(result).not.toBeNull();
        expect(result?.score).toBe(100);
        expect(result?.checksTotal).toBe(1);
        expect(result?.checksUsed).toBe(1);
    });

    it('ritorna null se score è -1 o assente', async () => {
        const mockChecks = [
            { name: "Branch-Protection", score: 10, reason: "found", documentation: { url: "https://..." } }
        ];

        // score assente
        fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ checks: mockChecks }), { status: 200 }));
        const resultMissing = await fetchOpenSSFScore('owner', 'repo');
        expect(resultMissing).toBeNull();

        // score: -1
        fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ score: -1, checks: mockChecks }), { status: 200 }));
        const resultNegative = await fetchOpenSSFScore('owner', 'repo');
        expect(resultNegative).toBeNull();
    });

    it('ritorna null in caso di 404', async () => {
        fetchSpy.mockResolvedValue(new Response(null, { status: 404 }));
        
        const result = await fetchOpenSSFScore('owner', 'repo');
        
        expect(result).toBeNull();
    });

    it('ritorna null in caso di timeout (errore in fetch)', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        fetchSpy.mockRejectedValue(new DOMException("Timeout", "AbortError"));
        
        const result = await fetchOpenSSFScore('owner', 'repo');
        
        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

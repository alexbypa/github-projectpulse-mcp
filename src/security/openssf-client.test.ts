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
        
        const result = calculateOpenSSFResult(mockChecks);
        
        expect(result).not.toBeNull();
        expect(result?.checksTotal).toBe(3);
        expect(result?.checksUsed).toBe(2);
        expect(result?.score).toBe(70);
        expect(result?.details).toBe('2/3 security checks, score 70/100');
    });

    it('ritorna null se tutti i security check hanno score -1', () => {
        const mockChecks: OpenSSFCheck[] = [
            { name: "Branch-Protection", score: -1, reason: "not applicable", documentation: { url: "https://..." } },
            { name: "SAST", score: -1, reason: "not applicable", documentation: { url: "https://..." } },
        ];
        
        const result = calculateOpenSSFResult(mockChecks);
        
        expect(result).toBeNull();
    });

    it('ritorna null se non ci sono check security nel set', () => {
        const mockChecks: OpenSSFCheck[] = [
            { name: "CI-Tests", score: 10, reason: "found", documentation: { url: "https://..." } },
            { name: "License", score: 10, reason: "found", documentation: { url: "https://..." } },
            { name: "Maintained", score: 10, reason: "found", documentation: { url: "https://..." } },
        ];
        
        const result = calculateOpenSSFResult(mockChecks);
        
        expect(result).toBeNull();
    });

    it('ritorna null per un array vuoto', () => {
        const result = calculateOpenSSFResult([]);
        
        expect(result).toBeNull();
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
        fetchSpy.mockResolvedValue(new Response(JSON.stringify({ checks: mockChecks }), { status: 200 }));
        
        const result = await fetchOpenSSFScore('owner', 'repo');
        
        expect(result).not.toBeNull();
        expect(result?.score).toBe(100);
        expect(result?.checksTotal).toBe(1);
        expect(result?.checksUsed).toBe(1);
    });

    it('ritorna null in caso di 404', async () => {
        fetchSpy.mockResolvedValue(new Response(null, { status: 404 }));
        
        const result = await fetchOpenSSFScore('owner', 'repo');
        
        expect(result).toBeNull();
    });

    it('ritorna null in caso di timeout (errore in fetch)', async () => {
        fetchSpy.mockRejectedValue(new DOMException("Timeout", "AbortError"));
        
        const result = await fetchOpenSSFScore('owner', 'repo');
        
        expect(result).toBeNull();
    });
});

import { describe, it, expect } from 'vitest';
import { 
    scoreToGrade, 
    calculateCiScore, 
    calculateSecurityScore,
    calculateFreshnessScore,
    calculateCommunityScore,
    calculateMaintenanceScore,
    calculateHealthScore
} from './health-score.js';

describe('scoreToGrade', () => {
    // qui dentro scrivi i test case
    // ogni it() testa un caso specifico

    it('should return A for score 85', () => {
        expect(scoreToGrade(85)).toBe('A');
    });
    it('should return B for score 65', () => {
        expect(scoreToGrade(65)).toBe('B');
    });
    it('should return C for score 45', () => {
        expect(scoreToGrade(45)).toBe('C');
    });
    it('should return D for score 25', () => {
        expect(scoreToGrade(25)).toBe('D');
    });
});

describe('calculateCiScore', () => {
    it('should return 100 for all successful runs', () => {
        expect(calculateCiScore([{
            conclusion: 'success'
        }])).toEqual({
            score: 100,
            weight: 0.25,
            detail: '1/1 runs passed'
        })
    });
    it('should return 50 for 1 failed run', () => {
        expect(calculateCiScore([{
            conclusion: 'failure',
        }, {
            conclusion: 'success'
        }])).toEqual({
            score: 50,
            weight: 0.25,
            detail: '1/2 runs passed'
        })
    });
    it('should return 0 for no runs', () => {
        expect(calculateCiScore([])).toEqual({
            score: 0,
            weight: 0.25,
            detail: '0/0 runs passed'
        })
    })
})

describe('calculateSecurityScore', () => {
    it('should return 100 with no alerts', () => {
        expect(calculateSecurityScore({
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        })).toEqual({
            score: 100,
            weight: 0.25,
            detail: 'Alerts: 0 critical, 0 high, 0 medium, 0 low'
        });
    });

    it('should return 50 for 2 critical alerts', () => {
        expect(calculateSecurityScore({
            critical: 2, // -50
            high: 0,
            medium: 0,
            low: 0
        })).toEqual({
            score: 50,
            weight: 0.25,
            detail: 'Alerts: 2 critical, 0 high, 0 medium, 0 low'
        });
    });

    it('should calculate 44 for a mix of severities', () => {
        expect(calculateSecurityScore({
            critical: 1, // -25
            high: 1, // -15
            medium: 2, // -10
            low: 3 // -6
        })).toEqual({
            score: 44, // 100 - 25 - 15 - 10 - 6 = 44
            weight: 0.25,
            detail: 'Alerts: 1 critical, 1 high, 2 medium, 3 low'
        });
    });

    it('should bound score to 0 (overflow)', () => {
        expect(calculateSecurityScore({
            critical: 5, // -125
            high: 0,
            medium: 0,
            low: 0
        })).toEqual({
            score: 0,
            weight: 0.25,
            detail: 'Alerts: 5 critical, 0 high, 0 medium, 0 low'
        });
    });
});

describe('calculateFreshnessScore', () => {
    it('should return 100 for push within 7 days', () => {
        const date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
        expect(calculateFreshnessScore(date)).toEqual({
            score: 100,
            weight: 0.20,
            detail: 'Last push 5 days ago'
        });
    });

    it('should return 70 for push within 30 days', () => {
        const date = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
        expect(calculateFreshnessScore(date)).toEqual({
            score: 70,
            weight: 0.20,
            detail: 'Last push 15 days ago'
        });
    });

    it('should return 40 for push within 90 days', () => {
        const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
        expect(calculateFreshnessScore(date)).toEqual({
            score: 40,
            weight: 0.20,
            detail: 'Last push 60 days ago'
        });
    });

    it('should return 10 for push older than 90 days', () => {
        const date = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
        expect(calculateFreshnessScore(date)).toEqual({
            score: 10,
            weight: 0.20,
            detail: 'Last push 100 days ago'
        });
    });
});

describe('calculateCommunityScore', () => {
    it('should return 50 for no forks and no issues', () => {
        expect(calculateCommunityScore(0, 0)).toEqual({
            score: 50,
            weight: 0.15,
            detail: '0 open issues, 0 forks'
        });
    });

    it('should increase score for forks', () => {
        expect(calculateCommunityScore(0, 5)).toEqual({
            score: 60, // 50 + 10
            weight: 0.15,
            detail: '0 open issues, 5 forks'
        });
        expect(calculateCommunityScore(0, 15)).toEqual({
            score: 75, // 50 + 25
            weight: 0.15,
            detail: '0 open issues, 15 forks'
        });
    });

    it('should decrease score for many open issues', () => {
        expect(calculateCommunityScore(25, 0)).toEqual({
            score: 40, // 50 - 10
            weight: 0.15,
            detail: '25 open issues, 0 forks'
        });
        expect(calculateCommunityScore(55, 0)).toEqual({
            score: 25, // 50 - 25
            weight: 0.15,
            detail: '55 open issues, 0 forks'
        });
    });
});

describe('calculateMaintenanceScore', () => {
    it('should return 100 for perfect maintenance', () => {
        expect(calculateMaintenanceScore(true, true, false)).toEqual({
            score: 100,
            weight: 0.15,
            detail: 'License: true, Description: true, Active: true'
        });
    });

    it('should return 0 for poor maintenance', () => {
        expect(calculateMaintenanceScore(false, false, true)).toEqual({
            score: 0,
            weight: 0.15,
            detail: 'License: false, Description: false, Active: false'
        });
    });
});

describe('calculateHealthScore', () => {
    it('should calculate final health report and grade', () => {
        const report = calculateHealthScore('test/repo', {
            ci: { score: 100, weight: 0.25, detail: '1/1 runs passed' },
            freshness: { score: 70, weight: 0.20, detail: 'Last push 15 days ago' },
            community: { score: 75, weight: 0.15, detail: '10 open issues, 15 forks' },
            security: { score: 100, weight: 0.25, detail: 'Alerts: 0 critical' },
            maintenance: { score: 100, weight: 0.15, detail: 'Active' },
        });
        
        expect(report).toEqual({
            repo: 'test/repo',
            score: 90,
            grade: 'A',
            breakdown: expect.any(Object),
            suggestions: [],
            checkedAt: expect.any(String),
            gradeMeaning: expect.any(String)
        });
    });

    it('should generate suggestions for categories with score < 50', () => {
        const report = calculateHealthScore('test/repo', {
            ci: { score: 0, weight: 0.25, detail: '0/1 runs passed' },
            freshness: { score: 100, weight: 0.20, detail: 'Last push 1 days ago' },
        });
        
        expect(report.suggestions).toEqual([
            'Improve 0/1 runs passed (score: 0/100)'
        ]);
    });
});
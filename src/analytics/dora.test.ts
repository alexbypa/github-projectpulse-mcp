import { describe, it, expect } from 'vitest';
import { calculateDoraMetrics } from './dora.js';
import { DoraInput } from './types.js';

// Helper: crea DoraInput con default vuoti, override parziale
function makeInput(overrides: Partial<DoraInput> = {}): DoraInput {
    return {
        owner: 'testowner',
        repo: 'testrepo',
        period_days: 28,
        releases: [],
        mergedPulls: [],
        workflowRuns: [],
        ...overrides
    };
}

describe('calculateDoraMetrics', () => {

    describe('1. deployment_frequency', () => {
        it('4 release in 28 giorni -> releases_count: 4, per_week: 1', () => {
            const input = makeInput({
                releases: [
                    { id: 1, tag_name: 'v1.0', published_at: '2026-08-01T00:00:00Z' },
                    { id: 2, tag_name: 'v1.1', published_at: '2026-08-08T00:00:00Z' },
                    { id: 3, tag_name: 'v1.2', published_at: '2026-08-15T00:00:00Z' },
                    { id: 4, tag_name: 'v1.3', published_at: '2026-08-22T00:00:00Z' },
                ],
                period_days: 28
            });
            const result = calculateDoraMetrics(input);
            expect(result.deployment_frequency.releases_count).toBe(4);
            expect(result.deployment_frequency.per_week).toBe(1);
        });

        it('0 release -> releases_count: 0, per_week: null', () => {
            const input = makeInput({ releases: [] });
            const result = calculateDoraMetrics(input);
            expect(result.deployment_frequency.releases_count).toBe(0);
            expect(result.deployment_frequency.per_week).toBeNull();
        });
    });

    describe('2. lead_time', () => {
        it('3 PR con merge time 24h, 48h, 72h -> median_hours: 48, pr_count: 3', () => {
            const input = makeInput({
                mergedPulls: [
                    { number: 1, created_at: '2026-08-01T00:00:00Z', merged_at: '2026-08-02T00:00:00Z' }, // 24h
                    { number: 2, created_at: '2026-08-02T00:00:00Z', merged_at: '2026-08-04T00:00:00Z' }, // 48h
                    { number: 3, created_at: '2026-08-03T00:00:00Z', merged_at: '2026-08-06T00:00:00Z' }, // 72h
                ]
            });
            const result = calculateDoraMetrics(input);
            expect(result.lead_time.pr_count).toBe(3);
            expect(result.lead_time.median_hours).toBe(48);
        });

        it('0 PR -> median_hours: null, pr_count: 0', () => {
            const input = makeInput({ mergedPulls: [] });
            const result = calculateDoraMetrics(input);
            expect(result.lead_time.pr_count).toBe(0);
            expect(result.lead_time.median_hours).toBeNull();
        });

        it('2 PR (pari) con 24h e 48h -> median_hours: 36 (media dei due centrali)', () => {
            const input = makeInput({
                mergedPulls: [
                    { number: 1, created_at: '2026-08-01T00:00:00Z', merged_at: '2026-08-02T00:00:00Z' }, // 24h
                    { number: 2, created_at: '2026-08-02T00:00:00Z', merged_at: '2026-08-04T00:00:00Z' }, // 48h
                ]
            });
            const result = calculateDoraMetrics(input);
            expect(result.lead_time.pr_count).toBe(2);
            expect(result.lead_time.median_hours).toBe(36);
        });
    });

    describe('3. change_failure_rate', () => {
        it('10 run, 3 failure -> total_runs: 10, failed_runs: 3, rate_percent: 30', () => {
            const runs = Array.from({ length: 10 }).map((_, i) => ({
                id: i,
                name: 'CI',
                head_branch: 'main',
                conclusion: i < 3 ? 'failure' : 'success',
                created_at: '2026-08-01T00:00:00Z'
            }));
            const input = makeInput({ workflowRuns: runs });
            const result = calculateDoraMetrics(input);
            expect(result.change_failure_rate.total_runs).toBe(10);
            expect(result.change_failure_rate.failed_runs).toBe(3);
            expect(result.change_failure_rate.rate_percent).toBe(30);
        });

        it('0 run -> rate_percent: null', () => {
            const input = makeInput({ workflowRuns: [] });
            const result = calculateDoraMetrics(input);
            expect(result.change_failure_rate.total_runs).toBe(0);
            expect(result.change_failure_rate.rate_percent).toBeNull();
        });

        it('Tutti success -> rate_percent: 0', () => {
            const input = makeInput({
                workflowRuns: [
                    { id: 1, name: 'CI', head_branch: 'main', conclusion: 'success', created_at: '2026-08-01T00:00:00Z' }
                ]
            });
            const result = calculateDoraMetrics(input);
            expect(result.change_failure_rate.failed_runs).toBe(0);
            expect(result.change_failure_rate.rate_percent).toBe(0);
        });
    });

    describe('4. mttr', () => {
        it('2 cicli failure->success (4h e 8h) -> median_hours: 6, incidents_count: 2', () => {
            const input = makeInput({
                workflowRuns: [
                    // Cycle 1: 4h recovery
                    { id: 1, name: 'CI', head_branch: 'main', conclusion: 'failure', created_at: '2026-08-01T10:00:00Z' },
                    { id: 2, name: 'CI', head_branch: 'main', conclusion: 'success', created_at: '2026-08-01T14:00:00Z' },
                    // Cycle 2: 8h recovery
                    { id: 3, name: 'CI', head_branch: 'main', conclusion: 'failure', created_at: '2026-08-02T10:00:00Z' },
                    { id: 4, name: 'CI', head_branch: 'main', conclusion: 'success', created_at: '2026-08-02T18:00:00Z' },
                ]
            });
            const result = calculateDoraMetrics(input);
            expect(result.mttr.incidents_count).toBe(2);
            expect(result.mttr.median_hours).toBe(6);
        });

        it('Solo success -> median_hours: null, incidents_count: 0', () => {
            const input = makeInput({
                workflowRuns: [
                    { id: 1, name: 'CI', head_branch: 'main', conclusion: 'success', created_at: '2026-08-01T10:00:00Z' }
                ]
            });
            const result = calculateDoraMetrics(input);
            expect(result.mttr.incidents_count).toBe(0);
            expect(result.mttr.median_hours).toBeNull();
        });

        it('Multi-branch: main ha failure->success (4h), dev ha failure senza recovery -> incidents_count: 1 (solo main conta)', () => {
            const input = makeInput({
                workflowRuns: [
                    // main: 4h recovery
                    { id: 1, name: 'CI', head_branch: 'main', conclusion: 'failure', created_at: '2026-08-01T10:00:00Z' },
                    { id: 2, name: 'CI', head_branch: 'main', conclusion: 'success', created_at: '2026-08-01T14:00:00Z' },
                    // dev: failure without success
                    { id: 3, name: 'CI', head_branch: 'dev', conclusion: 'failure', created_at: '2026-08-02T10:00:00Z' },
                ]
            });
            const result = calculateDoraMetrics(input);
            expect(result.mttr.incidents_count).toBe(1);
            expect(result.mttr.median_hours).toBe(4);
        });
    });

    describe('5. metadata', () => {
        it('Verifica owner, repo, period_days, measured_from, measured_to presenti', () => {
            const input = makeInput({ owner: 'alice', repo: 'wonderland', period_days: 14 });
            const result = calculateDoraMetrics(input);
            expect(result.owner).toBe('alice');
            expect(result.repo).toBe('wonderland');
            expect(result.period_days).toBe(14);
            expect(result.measured_to).toBeDefined();
            expect(result.measured_from).toBeDefined();
        });
    });

    describe('6. all null scenario', () => {
        it('Input completamente vuoto -> tutti i nullable sono null, nessun crash', () => {
            const input = makeInput();
            const result = calculateDoraMetrics(input);

            expect(result.deployment_frequency.per_week).toBeNull();
            expect(result.lead_time.median_hours).toBeNull();
            expect(result.change_failure_rate.rate_percent).toBeNull();
            expect(result.mttr.median_hours).toBeNull();
        });
    });

});

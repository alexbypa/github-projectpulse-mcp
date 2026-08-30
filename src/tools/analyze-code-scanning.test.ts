import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOctokit } from '../github/client.js';
import { executeAnalyzeCodeScanning } from './analyze-code-scanning.js';

vi.mock('../github/client.js');

describe('executeAnalyzeCodeScanning', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should return code scanning alerts', async () => {
        const mockAlerts = [
            {
                number: 1,
                created_at: '2026-08-28T10:00:00Z',
                rule: { id: 'js/sql-injection', severity: 'error', description: 'SQL Injection' },
                state: 'open',
                most_recent_instance: {
                    message: { text: 'SQL query built from user input' },
                    location: { path: 'src/db.ts', start_line: 10, end_line: 15 }
                },
                html_url: 'https://github.com/test/repo/security/code-scanning/1'
            }
        ];

        const mockListAlerts = vi.fn().mockResolvedValue({ data: mockAlerts });

        vi.mocked(getOctokit).mockReturnValue({
            codeScanning: { listAlertsForRepo: mockListAlerts }
        } as any);

        const result = await executeAnalyzeCodeScanning({ owner: 'test', repo: 'repo', trigger_scan: false, poll_timeout_seconds: 300, poll_interval_seconds: 15 });

        expect(mockListAlerts).toHaveBeenCalledWith({ owner: 'test', repo: 'repo', state: 'open' });

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        const parsedText = JSON.parse(result.content[0].text);
        expect(parsedText.alerts).toHaveLength(1);
        expect(parsedText.alerts[0]).toEqual({
            alert_number: 1,
            rule_id: 'js/sql-injection',
            severity: 'error',
            rule_description: 'SQL Injection',
            state: 'open',
            message_text: 'SQL query built from user input',
            most_recent_instance_path: 'src/db.ts',
            most_recent_instance_start_line: 10,
            end_line: 15,
            created_at: '2026-08-28T10:00:00Z',
            html_url: 'https://github.com/test/repo/security/code-scanning/1'
        });
    });

    it('should handle 404 when code scanning is not configured', async () => {
        const notFoundError = new Error('Not Found') as any;
        notFoundError.status = 404;

        const mockListAlerts = vi.fn().mockRejectedValue(notFoundError);

        vi.mocked(getOctokit).mockReturnValue({
            codeScanning: { listAlertsForRepo: mockListAlerts }
        } as any);

        const result = await executeAnalyzeCodeScanning({ owner: 'test', repo: 'repo', trigger_scan: false, poll_timeout_seconds: 300, poll_interval_seconds: 15 });

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        const parsedText = JSON.parse(result.content[0].text);
        expect(parsedText.message).toBe("Code scanning not configured on this repo");
    });

    it('should throw error for non-404 API failures', async () => {
        const serverError = new Error('Server Error') as any;
        serverError.status = 500;

        const mockListAlerts = vi.fn().mockRejectedValue(serverError);

        vi.mocked(getOctokit).mockReturnValue({
            codeScanning: { listAlertsForRepo: mockListAlerts }
        } as any);

        await expect(executeAnalyzeCodeScanning({ owner: 'test', repo: 'repo', trigger_scan: false, poll_timeout_seconds: 300, poll_interval_seconds: 15 }))
            .rejects
            .toThrow('Server Error');
    });
});

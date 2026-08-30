import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOctokit } from '../github/client.js';
import { executeAnalyzeDependencies } from './analyze-dependencies.js';

vi.mock('../github/client.js');

describe('executeAnalyzeDependencies', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    const mockAlerts = [
        {
            security_advisory: { summary: 'Critical bug', severity: 'critical' },
            dependency: { package: { name: 'lodash' } },
            state: 'open',
            html_url: 'https://github.com/advisory/1'
        },
        {
            security_advisory: { summary: 'High bug', severity: 'high' },
            dependency: { package: { name: 'express' } },
            state: 'fixed',
            html_url: 'https://github.com/advisory/2'
        },
        {
            security_advisory: { summary: 'Another High bug', severity: 'high' },
            dependency: { package: { name: 'react' } },
            state: 'open',
            html_url: 'https://github.com/advisory/3'
        }
    ];

    it('should return all dependencies if no severity is provided', async () => {
        const mockListAlerts = vi.fn().mockResolvedValue({ data: mockAlerts });

        vi.mocked(getOctokit).mockReturnValue({
            dependabot: { listAlertsForRepo: mockListAlerts }
        } as any);

        const result = await executeAnalyzeDependencies({ owner: 'test', repo: 'repo' });

        expect(mockListAlerts).toHaveBeenCalledWith({ owner: 'test', repo: 'repo' });

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        const parsedText = JSON.parse(result.content[0].text);
        expect(parsedText).toHaveLength(3);
        expect(parsedText[0].severity).toBe('critical');
        expect(parsedText[1].severity).toBe('high');
        expect(parsedText[2].severity).toBe('high');
    });

    it('should return filtered dependencies if severity is provided', async () => {
        const mockListAlerts = vi.fn().mockResolvedValue({ data: mockAlerts });

        vi.mocked(getOctokit).mockReturnValue({
            dependabot: { listAlertsForRepo: mockListAlerts }
        } as any);

        const result = await executeAnalyzeDependencies({ owner: 'test', repo: 'repo', severity: 'high' });

        const parsedText = JSON.parse(result.content[0].text);
        expect(parsedText).toHaveLength(2);
        expect(parsedText[0].package_name).toBe('express');
        expect(parsedText[1].package_name).toBe('react');
    });

    it('should throw an error if API fails', async () => {
        const mockListAlerts = vi.fn().mockRejectedValue(new Error('API Error'));

        vi.mocked(getOctokit).mockReturnValue({
            dependabot: { listAlertsForRepo: mockListAlerts }
        } as any);

        await expect(executeAnalyzeDependencies({ owner: 'test', repo: 'repo' }))
            .rejects
            .toThrow('API Error');
    });
});

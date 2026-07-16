import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scoreResume } from './llmScorer';

describe('scoreResume', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts scoring input to the configured API and returns the scoring result', async () => {
    const result = {
      score: 'good',
      percentage: 62,
      summary: 'Solid match.',
      strengths: ['React'],
      improvements: ['Add metrics'],
      keywordMatches: ['TypeScript'],
      missingKeywords: ['Testing'],
    };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => result,
    } as Response);

    await expect(scoreResume('resume', 'job', 'frontend', 'mid')).resolves.toEqual(result);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/score-resume',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: 'resume',
          jobDescription: 'job',
          roleType: 'frontend',
          experienceLevel: 'mid',
        }),
      })
    );
  });

  it('surfaces API error messages from the scoring server', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Resume text is required.' }),
    } as Response);

    await expect(scoreResume('', '', '', '')).rejects.toThrow('Resume text is required.');
  });

  it('translates network failures into a backend availability hint', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(scoreResume('resume', '', 'frontend', 'mid')).rejects.toThrow(
      'Could not reach the scoring server. Please make sure the backend is running.'
    );
  });
});

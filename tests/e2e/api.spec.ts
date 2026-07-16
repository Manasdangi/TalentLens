import { expect, test } from '@playwright/test';
import { backendUrl } from './fixtures';

test.describe('backend API checks', () => {
  test('health endpoint reports the server is alive', async ({ request }) => {
    const response = await request.get(`${backendUrl}/health`);
    const body = await response.json();

    expect(response.ok()).toBe(true);
    expect(body).toEqual({ status: 'ok' });
  });

  test('auth/me returns an unauthenticated response without a session', async ({ request }) => {
    const response = await request.get(`${backendUrl}/auth/me`);
    const body = await response.json();

    expect(response.status()).toBe(401);
    expect(body).toEqual({ user: null });
  });

  test('score-resume validates required resume text', async ({ request }) => {
    const response = await request.post(`${backendUrl}/api/score-resume`, {
      data: {
        resumeText: '',
        jobDescription: 'React role',
        roleType: 'frontend',
        experienceLevel: 'mid',
      },
    });
    const body = await response.json();

    expect(response.status()).toBe(400);
    expect(body).toEqual({ error: 'Resume text is required.' });
  });

  test('score-resume returns the scoring contract in mock mode', async ({ request }) => {
    const response = await request.post(`${backendUrl}/api/score-resume`, {
      data: {
        resumeText: 'React TypeScript engineer with testing experience.',
        jobDescription: 'Build React applications.',
        roleType: 'frontend',
        experienceLevel: 'mid',
      },
    });
    const body = await response.json();

    expect(response.ok()).toBe(true);
    expect(body).toMatchObject({
      score: 'very_good',
      percentage: 78,
    });
    expect(Array.isArray(body.strengths)).toBe(true);
    expect(Array.isArray(body.improvements)).toBe(true);
    expect(Array.isArray(body.keywordMatches)).toBe(true);
    expect(Array.isArray(body.missingKeywords)).toBe(true);
  });
});

import { expect, test } from '@playwright/test';
import { seedSignedOut, seedUser } from './fixtures';

test.describe('auth and onboarding workflow', () => {
  test('signs in through the login screen without opening a real Google popup', async ({ page }) => {
    await seedSignedOut(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'TalentLens' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign in with Google' }).click();

    await expect(page.getByRole('heading', { name: 'Resume', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeHidden();
  });

  test('lets a signed-in user choose candidate account type', async ({ page }) => {
    await seedUser(page, 'unassigned');
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Welcome, E2E Candidate!' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await page.getByRole('button', { name: 'Candidate' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'Resume', exact: true })).toBeVisible();
  });

  test('lets a signed-in user choose recruiter account type', async ({ page }) => {
    await seedUser(page, 'unassigned');
    await page.goto('/');

    await page.getByRole('button', { name: 'Recruiter' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByText('Post a new job above or view your listings below.')).toBeVisible();
  });
});

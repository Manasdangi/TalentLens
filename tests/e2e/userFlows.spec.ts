import { expect, test } from '@playwright/test';
import { seedUser } from './fixtures';

test.describe('candidate workflow', () => {
  test.beforeEach(async ({ page }) => {
    await seedUser(page, 'candidate');
  });

  test('scores a saved resume, navigates jobs, and applies with a resume', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Resume', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Analyze Resume' })).toBeDisabled();

    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByText('Frontend Resume').click();

    await expect(page.getByText(/characters extracted/)).toBeVisible();
    await page.locator('select').first().selectOption('frontend');
    await page.locator('select').nth(1).selectOption('mid');
    await page.getByPlaceholder(/Paste the job description here/).fill('React TypeScript role with testing ownership.');

    await page.getByRole('button', { name: 'Analyze Resume' }).click();

    await expect(page.getByRole('heading', { name: 'Analysis Results' })).toBeVisible();
    await expect(page.getByText('78%')).toBeVisible();
    await expect(page.getByText('Mock scoring result for Frontend Developer at Mid-Level')).toBeVisible();

    await page.getByRole('button', { name: 'See latest openings' }).click();
    await expect(page.getByRole('heading', { name: 'Job Opportunities' })).toBeVisible();

    await page.getByText('Frontend Engineer').click();
    await expect(page.getByText('Build polished React interfaces')).toBeVisible();

    await page.getByRole('button', { name: 'Apply for Frontend Engineer' }).click();
    const applyModal = page.locator('div').filter({ hasText: 'Choose a resume to submit' }).last();
    await applyModal.getByText('Frontend Resume').click();
    await applyModal.getByRole('button', { name: 'Apply' }).click();

    await expect(page.getByText('Applied', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back to home' }).click();
    await expect(page.getByRole('heading', { name: 'Resume', exact: true })).toBeVisible();
  });
});

test.describe('recruiter workflow', () => {
  test.beforeEach(async ({ page }) => {
    await seedUser(page, 'recruiter');
  });

  test('posts, views, edits, and deletes a job listing', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Post a new job above or view your listings below.')).toBeVisible();
    await page.getByRole('button', { name: 'Post new job' }).click();

    await page.getByPlaceholder('your.email@company.com').fill('recruiter@example.com');
    await page.getByPlaceholder('e.g., Senior Frontend Developer').fill('QA Automation Engineer');
    await page.getByPlaceholder('e.g., Tech Corp').fill('TalentLens Labs');
    await page.getByPlaceholder(/Describe the role/).fill('Own browser and API automation for TalentLens.');
    await page.locator('select').first().selectOption('frontend');
    await page.locator('select').nth(1).selectOption('mid');
    await page.getByPlaceholder('e.g., San Francisco, CA or Remote').fill('Remote');
    await page.getByPlaceholder('e.g., $100k - $150k').fill('$100k - $130k');
    await page.locator('textarea').nth(1).fill('Playwright\nAPI testing\nRegression coverage');
    await page.getByRole('button', { name: 'Post Job Opportunity' }).click();

    await expect(page.getByRole('heading', { name: 'Post Job Opportunity' })).toBeHidden();

    await page.getByRole('button', { name: 'View my posted jobs' }).click();
    await expect(page.getByRole('heading', { name: 'Your Posted Jobs' })).toBeVisible();
    await expect(page.getByText('QA Automation Engineer')).toBeVisible();

    await page.getByText('QA Automation Engineer').click();
    await page.getByRole('button', { name: 'Edit QA Automation Engineer' }).click();

    await page.getByPlaceholder('e.g., Senior Frontend Developer').fill('Senior QA Automation Engineer');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Senior QA Automation Engineer')).toBeVisible();
    const deleteButton = page.getByRole('button', { name: 'Delete Senior QA Automation Engineer' });
    if (!(await deleteButton.isVisible())) {
      await page.getByText('Senior QA Automation Engineer').click();
    }

    page.once('dialog', (dialog) => dialog.accept());
    await deleteButton.click();
    await expect(page.getByText('Senior QA Automation Engineer')).toBeHidden();
  });
});

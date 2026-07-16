import type { Page } from '@playwright/test';

export const backendUrl = 'http://127.0.0.1:3001';
export const e2eUserStorageKey = 'talentlens_e2e_user';

export type E2EUserType = 'candidate' | 'recruiter' | 'unassigned';

export async function seedSignedOut(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

export async function seedUser(page: Page, userType: E2EUserType) {
  await page.addInitScript(
    ({ key, type }) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem(
        key,
        JSON.stringify({
          id: type === 'recruiter' ? 'e2e-recruiter' : 'e2e-candidate',
          name: type === 'recruiter' ? 'E2E Recruiter' : 'E2E Candidate',
          email: type === 'recruiter' ? 'recruiter@example.com' : 'candidate@example.com',
          userType: type === 'unassigned' ? undefined : type,
        })
      );
    },
    { key: e2eUserStorageKey, type: userType }
  );
}

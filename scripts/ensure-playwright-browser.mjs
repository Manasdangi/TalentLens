import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const executablePath = chromium.executablePath();

if (existsSync(executablePath)) {
  console.log(`Playwright Chromium is ready: ${executablePath}`);
  process.exit(0);
}

console.log('Playwright Chromium is missing. Installing it now...');
const result = spawnSync('yarn', ['playwright', 'install', 'chromium'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  console.error('Could not install Playwright Chromium automatically.');
  process.exit(result.status ?? 1);
}

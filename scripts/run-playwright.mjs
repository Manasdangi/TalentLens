import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const env = { ...process.env };
delete env.NO_COLOR;

const executable = join(
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'playwright.cmd' : 'playwright'
);

const result = spawnSync(executable, ['test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env,
});

process.exit(result.status ?? 1);

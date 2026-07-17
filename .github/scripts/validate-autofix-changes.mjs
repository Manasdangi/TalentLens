import { execFileSync } from 'node:child_process';

function gitPaths(args) {
  const output = execFileSync('git', args, { encoding: 'buffer' });
  return output.toString('utf8').split('\0').filter(Boolean);
}

function patchPaths(patchFile) {
  const records = gitPaths(['apply', '--numstat', '-z', patchFile]);
  return records.map((record) => {
    const fields = record.split('\t');
    if (fields.length < 3 || !fields.slice(2).join('\t')) {
      throw new Error('Rename and copy patches are not allowed in automated fixes.');
    }
    return fields.slice(2).join('\t');
  });
}

const patchFile = process.argv[2];
const changedPaths = new Set(patchFile
  ? patchPaths(patchFile)
  : [
      ...gitPaths(['diff', '--name-only', '-z']),
      ...gitPaths(['ls-files', '--others', '--exclude-standard', '-z']),
    ]);

const protectedPaths = [
  '.github/',
  '.git/',
  '.env',
  'backend/.env',
  'backend/src/sentryAutofix.ts',
  'node_modules/',
  'dist/',
];

const forbidden = [...changedPaths].filter((file) => protectedPaths.some((protectedPath) => (
  protectedPath.endsWith('/')
    ? file.startsWith(protectedPath)
    : file === protectedPath || file.startsWith(`${protectedPath}.`)
)));

if (changedPaths.size === 0) {
  throw new Error('The autofix patch did not change any files.');
}

if (changedPaths.size > 25) {
  throw new Error(`The autofix changed ${changedPaths.size} files; the maximum is 25.`);
}

if (forbidden.length > 0) {
  throw new Error(`The autofix attempted to modify protected paths: ${forbidden.join(', ')}`);
}

console.log(`Validated ${changedPaths.size} changed file(s):`);
for (const file of changedPaths) console.log(`- ${file}`);

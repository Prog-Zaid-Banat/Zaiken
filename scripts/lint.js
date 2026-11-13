// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 1 lint: syntax-check every source JS file with `node --check`
// and type-check the TypeScript tree with `tsc --noEmit`.
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function collectJs(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectJs(full));
    } else if (entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

const jsFiles = ['main.js', 'electron-main.js']
  .map((f) => path.join(ROOT, f))
  .concat(collectJs(path.join(ROOT, 'src')))
  .concat(collectJs(path.join(ROOT, 'scripts')))
  .concat(collectJs(path.join(ROOT, 'server')))
  .concat(collectJs(path.join(ROOT, 'test')));

let failed = false;

for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (e) {
    failed = true;
    console.error(`Syntax error in ${path.relative(ROOT, file)}`);
    console.error(String(e.stderr || e.message).trim());
  }
}

try {
  execFileSync(
    process.execPath,
    [path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit', '-p', path.join(ROOT, 'tsconfig.json')],
    { stdio: 'pipe' }
  );
} catch (e) {
  failed = true;
  console.error(String(e.stdout || e.message).trim());
  console.error(String(e.stderr || '').trim());
}

if (failed) {
  console.error('\n✗ Lint failed');
  process.exit(1);
}

console.log(`✓ ${jsFiles.length} JS files parsed, TypeScript type-check passed`);

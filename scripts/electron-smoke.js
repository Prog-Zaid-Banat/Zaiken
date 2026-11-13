// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 3: Electron runtime smoke test.
//
// Launches the real app (`electron . --smoke-test`), waits for the main-process
// success markers, verifies the renderer loaded, and asserts a clean exit.
// Fails the build if the app crashes, the database fails to initialize, IPC
// registration throws, or the window fails to load.

'use strict';

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ELECTRON_BIN = require(path.join(ROOT, 'node_modules', 'electron'));

const TIMEOUT_MS = 60000;
const REQUIRED_MARKERS = [
  '[Zaiken] Runtime initialized successfully',
  '[Zaiken] IPC handlers registered',
  '[Zaiken] Application started successfully',
  '[Zaiken] SMOKE renderer loaded',
  '[Zaiken] SMOKE window open; quitting',
];
const FATAL_MARKERS = ['[Zaiken] Fatal startup error', 'SMOKE renderer load failed'];

const child = spawn(ELECTRON_BIN, ['.', '--smoke-test'], {
  cwd: ROOT,
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (d) => {
  output += d.toString();
});
child.stderr.on('data', (d) => {
  output += d.toString();
});

let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  console.error('FAIL: Electron smoke test timed out after ' + TIMEOUT_MS + 'ms');
  child.kill();
}, TIMEOUT_MS);

child.on('error', (err) => {
  clearTimeout(timer);
  console.error('FAIL: could not spawn Electron:', err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  clearTimeout(timer);

  const missing = REQUIRED_MARKERS.filter((m) => !output.includes(m));
  const fatalHit = FATAL_MARKERS.some((m) => output.includes(m));
  const ok = !timedOut && code === 0 && missing.length === 0 && !fatalHit;

  console.log('---- electron smoke output ----');
  console.log(output.trim() || '(no output)');
  console.log('--------------------------------');
  console.log('exit code:', code);
  if (timedOut) console.error('result: TIMEOUT');
  else if (missing.length) console.error('result: FAIL — missing markers: ' + missing.join(', '));
  else if (fatalHit) console.error('result: FAIL — fatal marker detected');
  else if (code !== 0) console.error('result: FAIL — non-zero exit');
  else console.log('result: PASS');

  process.exit(ok ? 0 : 1);
});

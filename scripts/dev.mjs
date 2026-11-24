#!/usr/bin/env node
/** Runs the API (8788) and Vite (5173) together for local development. */
import { spawn } from 'node:child_process';

const procs = [];
const run = (cmd, args, name) => {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: false });
  p.on('exit', (code) => {
    if (code !== 0) console.error(`[dev] ${name} exited with ${code}`);
    shutdown(code ?? 0);
  });
  procs.push(p);
  return p;
};

let closing = false;
function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  for (const p of procs) {
    try {
      p.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
  setTimeout(() => process.exit(code), 150);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('node', ['--watch', 'server/index.ts'], 'api');
run('npx', ['vite', '--host', '127.0.0.1', '--port', '5173'], 'vite');

import { spawn } from 'node:child_process';
const args = process.argv.slice(2).filter((x) => x !== '--');
const child = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['exec', 'playwright', 'test', ...args], {
  stdio: 'inherit', env: { ...process.env, SP_E2E_SERVER: process.env.SP_E2E_SERVER || 'built' },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });

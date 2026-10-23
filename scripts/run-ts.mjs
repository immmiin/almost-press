// Runs a TypeScript module through Vite's module runner (no server listening). Usage: node scripts/run-ts.mjs scripts/x.ts
import { runnerImport } from 'vite';
await runnerImport(process.argv[2], { server: { hmr: false, ws: false }, logLevel: 'error' });

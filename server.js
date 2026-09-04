/**
 * STUNNING BIRDS ATELIER - Production Node.js Server Entry Point
 * Used by hosting environments (Hostinger, cPanel, Cloud Run, Render, VPS)
 * that execute `node server.js` or expect server.js at the project root.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const distServer = path.join(__dirname, 'dist', 'server.cjs');
const distHtml = path.join(__dirname, 'dist', 'index.html');

if (!fs.existsSync(distServer) || !fs.existsSync(distHtml)) {
  console.log('[STUNNING BIRDS] dist not detected. Automatically building application bundle...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
  } catch (err) {
    console.error('[STUNNING BIRDS] Build execution error:', err);
  }
}

if (fs.existsSync(distServer)) {
  require(distServer);
} else {
  console.error('[STUNNING BIRDS] dist/server.cjs not found after build. Exiting.');
  process.exit(1);
}

/**
 * STUNNING BIRDS ATELIER - Production Node.js Server Entry Point
 * Used by hosting environments (Hostinger, cPanel, Cloud Run, Render, VPS)
 * that execute `node server.js` or expect server.js at the project root.
 */
const path = require('path');
const fs = require('fs');

const distServer = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(distServer)) {
  require(distServer);
} else {
  console.error('[STUNNING BIRDS] dist/server.cjs not found. Please run "npm run build" first.');
  process.exit(1);
}

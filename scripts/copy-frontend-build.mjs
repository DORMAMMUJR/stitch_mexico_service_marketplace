import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const sourceDist = path.join(repoRoot, 'app', 'dist');
const targetPublic = path.join(repoRoot, 'server', 'public');

if (!fs.existsSync(sourceDist)) {
  console.log('[copy-frontend-build] app/dist no existe. Se asume que Vite ya escribio en server/public.');
  process.exit(0);
}

fs.mkdirSync(targetPublic, { recursive: true });
fs.cpSync(sourceDist, targetPublic, { recursive: true, force: true });
console.log('[copy-frontend-build] Build frontend copiado a server/public');

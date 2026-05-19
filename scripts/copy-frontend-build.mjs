import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const sourceDist = path.join(repoRoot, 'app', 'dist');
const targetPublic = path.join(repoRoot, 'server', 'public');

if (!fs.existsSync(sourceDist)) {
  console.error('[copy-frontend-build] app/dist no existe. Ejecuta primero el build del frontend.');
  process.exit(1);
}

// Evita drift: borra por completo server/public antes de copiar app/dist.
fs.rmSync(targetPublic, { recursive: true, force: true });
fs.mkdirSync(targetPublic, { recursive: true });
fs.cpSync(sourceDist, targetPublic, { recursive: true, force: true });
console.log('[copy-frontend-build] Build frontend sincronizado: app/dist -> server/public');

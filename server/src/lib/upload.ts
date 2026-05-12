/**
 * server/src/lib/upload.ts
 *
 * Exporta DOS instancias de multer con responsabilidades distintas:
 *
 *   uploadPrivateDoc  → Documentos KYC (INE, Pasaporte, Constancia SAT).
 *                       Siempre se guardan bajo el prefijo `private/` en S3.
 *                       NUNCA reciben ACL public-read. La bucket policy de AWS
 *                       bloquea explícitamente el acceso público a ese prefijo.
 *
 *   uploadPublicImage → Fotos de perfil y portafolio.
 *                       Se guardan bajo el prefijo `public/` con ACL public-read,
 *                       lo que permite que el frontend los muestre directamente
 *                       sin pre-signed URLs.
 *
 * La decisión de privacidad está fijada en el servidor (en el uploader que
 * elige cada router), NO en ningún campo que venga del cliente. Un cliente
 * malintencionado no puede cambiar el ACL enviando un fieldname diferente.
 *
 * Fallback local (desarrollo sin AWS):
 *   Si las variables de entorno de AWS no están presentes, ambos uploaders
 *   usan diskStorage y guardan en /uploads/private/ y /uploads/public/
 *   según corresponda. El prefijo de carpeta refleja la intención aunque
 *   no haya restricción real en disco (es solo desarrollo).
 */

import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

// ─── Detección de AWS ─────────────────────────────────────────────────────────

const hasAWS =
  !!process.env.AWS_REGION &&
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY &&
  !!process.env.AWS_S3_BUCKET_NAME;

let s3: S3Client | null = null;

if (hasAWS) {
  logger.info('AWS configurado. Usando S3 para almacenamiento');
  s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
} else {
  logger.info('AWS no detectado. Usando diskStorage local (solo desarrollo)');
}

// ─── Factories ────────────────────────────────────────────────────────────────

/**
 * Devuelve un multer.StorageEngine para S3 con el prefijo de carpeta dado.
 * El ACL se fija aquí en el servidor — el cliente no puede influir en él.
 */
function makeS3Storage(prefix: 'private/' | 'public/', acl: 'private' | 'public-read') {
  return multerS3({
    s3: s3!,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    acl,
    metadata(_req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key(_req, file, cb) {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${prefix}${unique}${path.extname(file.originalname)}`);
    },
  });
}

/**
 * Devuelve un multer.diskStorage para desarrollo local.
 * Crea la carpeta destino si no existe.
 */
function makeDiskStorage(subfolder: 'private' | 'public') {
  const dir = path.join(__dirname, '../../uploads', subfolder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, dir);
    },
    filename(_req, file, cb) {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
}

// ─── Uploader: Documentos KYC privados ───────────────────────────────────────
//
// Úsalo en: POST /api/verification/upload-doc
// Acepta:   PDF, JPG, PNG, WebP  (máx 5 MB)
// En S3:    prefijo `private/`, ACL `private`
// En disco: /uploads/private/

export const uploadPrivateDoc = multer({
  storage: hasAWS ? makeS3Storage('private/', 'private') : makeDiskStorage('private'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no permitido. Se aceptan PDF, JPG, PNG y WebP.') as any);
    }
  },
});

// ─── Uploader: Imágenes públicas (avatar / portafolio) ───────────────────────
//
// Úsalo en: POST /api/users/avatar
//           POST /api/professionals/:id/portfolio
// Acepta:   JPG, PNG, WebP, GIF  (máx 5 MB)
// En S3:    prefijo `public/`, ACL `public-read`
// En disco: /uploads/public/

export const uploadPublicImage = multer({
  storage: hasAWS ? makeS3Storage('public/', 'public-read') : makeDiskStorage('public'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes.') as any);
    }
  },
});

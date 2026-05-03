# 🚀 Intecnia Backend — Plan de Producción
**Para el desarrollador: leer completo antes de tocar cualquier archivo.**

---

## ⚠️ Reglas antes de empezar

1. Trabaja en una rama separada: `git checkout -b fix/produccion`
2. Después de cada fase, correr `npm run build` para verificar que no hay errores de TypeScript
3. **No modificar** `schema.prisma` sin ejecutar `npx prisma migrate dev` después
4. El orden de las fases importa — no saltar a Fase 2 sin terminar Fase 1

---

# FASE 1 — Bloqueos Críticos
> **Tiempo estimado: 1-2 días**
> Esto debe estar listo ANTES de cualquier deploy a producción.

---

## Fix 1: Stripe Singleton
**Problema:** Stripe se instancia 3 veces en `index.ts`, `orders.ts` y `escrow.ts`.
**Archivos afectados:** 3 archivos

### Paso 1.1 — Crear `server/src/lib/stripe.ts` (archivo nuevo)

```typescript
import Stripe from 'stripe';
import { env } from '../config/env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-04-22.dahlia' as any,
});
```

### Paso 1.2 — Actualizar `server/src/lib/escrow.ts`

**ELIMINAR** estas líneas al inicio del archivo:
```typescript
// ELIMINAR ESTO:
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-04-22.dahlia' as any,
});
```

**AGREGAR** este import en su lugar:
```typescript
import { stripe } from './stripe';
```

### Paso 1.3 — Actualizar `server/src/routes/orders.ts`

**ELIMINAR** estas líneas al inicio:
```typescript
// ELIMINAR ESTO:
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-04-22.dahlia' as any,
});
```

**AGREGAR** este import en su lugar:
```typescript
import { stripe } from '../lib/stripe';
```

### Paso 1.4 — Actualizar `server/src/index.ts`

**ELIMINAR** estas líneas al inicio:
```typescript
// ELIMINAR ESTO:
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-04-22.dahlia' as any,
});
```

**AGREGAR** este import en su lugar:
```typescript
import { stripe } from './lib/stripe';
```

---

## Fix 2: Helmet (Security Headers)
**Problema:** El servidor no envía headers de seguridad HTTP.
**Archivo:** `server/src/index.ts`

### Paso 2.1 — Instalar dependencia

```bash
cd server
npm install helmet
npm install --save-dev @types/helmet
```

### Paso 2.2 — Agregar Helmet en `index.ts`

Agregar el import al inicio del archivo:
```typescript
import helmet from 'helmet';
```

Agregar como **primera** línea después de `const app = express();`:
```typescript
const app = express();
app.set('trust proxy', 1);

// ✅ AGREGAR AQUÍ — antes de cualquier otro middleware
app.use(helmet({
  contentSecurityPolicy: false, // Desactivar CSP por ahora si sirves el frontend desde aquí
  crossOriginEmbedderPolicy: false,
}));
```

---

## Fix 3: CORS con dominio de producción
**Problema:** El dominio de producción no está explícitamente en la lista permitida.
**Archivo:** `server/src/index.ts`

### Paso 3.1 — Actualizar `env.ts`

Agregar esta variable al schema de Zod en `server/src/config/env.ts`:
```typescript
// Agregar dentro del objeto z.object({...}):
ALLOWED_ORIGINS: z.string().optional(), // ej: "https://intecnia.com,https://www.intecnia.com"
```

### Paso 3.2 — Actualizar la configuración de CORS en `index.ts`

**REEMPLAZAR** el bloque de `allowedOrigins` actual:
```typescript
// ANTES (reemplazar esto):
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o)) || origin.includes('seende.com')) {
      return callback(null, true);
    }
    callback(new Error(`CORS bloqueado para: ${origin}`));
  },
  credentials: true,
}));
```

**CON esto:**
```typescript
// DESPUÉS (pegar esto):
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  // Agregar dominios de producción desde .env
  ...(env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin === o)) {
      return callback(null, true);
    }
    callback(new Error(`CORS bloqueado para: ${origin}`));
  },
  credentials: true,
}));
```

### Paso 3.3 — Agregar en `.env` del servidor

```env
ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com
```

---

## Fix 4: JWT — Bug de expiración (Cookie 1 día vs JWT 15 min)
**Problema:** La cookie vive 24h pero el token JWT dentro de ella expira en 15 minutos.
**Archivo:** `server/src/routes/auth.ts`

### Paso 4.1 — Corregir la expiración de la cookie en el login

Buscar la sección del login donde se establece la cookie y **REEMPLAZAR**:
```typescript
// ANTES:
res.cookie('access_token', token, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 1 día en milisegundos
  path: '/',
});
```

**CON esto:**
```typescript
// DESPUÉS:
const JWT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

res.cookie('access_token', token, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  maxAge: JWT_EXPIRY_MS,
  path: '/',
});
```

### Paso 4.2 — Corregir el tiempo de expiración del JWT

Buscar donde se firma el token y **REEMPLAZAR**:
```typescript
// ANTES:
const token = jwt.sign(
  { userId: user.id, role: user.role, email: user.email },
  privateKey,
  { algorithm: algorithm as any, expiresIn: env.JWT_ACCESS_EXPIRY || '1d' } as any
);
```

**CON esto:**
```typescript
// DESPUÉS:
const token = jwt.sign(
  { userId: user.id, role: user.role, email: user.email },
  privateKey,
  { algorithm: algorithm as any, expiresIn: '7d' } as any
);
```

### Paso 4.3 — Actualizar `env.ts` para hacer JWT_PRIVATE_KEY requerida en producción

En `server/src/config/env.ts`, **REEMPLAZAR**:
```typescript
// ANTES:
JWT_PRIVATE_KEY: z.string().optional(),
JWT_PUBLIC_KEY: z.string().optional(),
```

**CON esto:**
```typescript
// DESPUÉS:
JWT_PRIVATE_KEY: z.string().min(1, 'JWT_PRIVATE_KEY es requerida'),
JWT_PUBLIC_KEY: z.string().optional(),
```

Y en tu `.env` de producción, asegúrate de tener una clave real:
```env
JWT_PRIVATE_KEY=una_clave_secreta_larga_y_aleatoria_de_al_menos_64_caracteres
```

---

## Fix 5: Idempotencia en Stripe Checkout
**Problema:** Dos llamadas a `/checkout` crean dos PaymentIntents y pueden cobrar dos veces.
**Archivo:** `server/src/routes/orders.ts`

### Paso 5.1 — Agregar idempotency key

Buscar la llamada a `stripe.paymentIntents.create` y **REEMPLAZAR**:
```typescript
// ANTES:
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInCents,
  currency: (order.currency || 'mxn').toLowerCase(),
  metadata: {
    orderId: order.id,
    clientId: order.clientId,
    professionalId: order.professionalId,
  },
  description: `Intecnia Order ${order.id}: ${order.description}`,
});
```

**CON esto:**
```typescript
// DESPUÉS:
const paymentIntent = await stripe.paymentIntents.create(
  {
    amount: amountInCents,
    currency: (order.currency || 'mxn').toLowerCase(),
    metadata: {
      orderId: order.id,
      clientId: order.clientId,
      professionalId: order.professionalId,
    },
    description: `Intecnia Order ${order.id}: ${order.description}`,
  },
  {
    idempotencyKey: `checkout-${order.id}`, // ← CRÍTICO: evita doble cobro
  }
);
```

---

## Fix 6: Verificar que .env NO está en git

Ejecutar desde la raíz del proyecto:

```bash
# Verificar si .env está trackeado en git
git ls-files server/.env

# Si devuelve algo, ejecutar:
git rm --cached server/.env
echo "server/.env" >> .gitignore
git commit -m "fix: remove .env from git tracking"

# Verificar que node_modules tampoco está trackeado
git ls-files server/node_modules | head -5
# Si devuelve algo:
git rm -r --cached server/node_modules
echo "server/node_modules/" >> .gitignore
git commit -m "fix: remove node_modules from git tracking"
```

---

# FASE 2 — Estabilidad
> **Tiempo estimado: 3-5 días**
> Para aguantar usuarios reales sin que el sistema falle.

---

## Fix 7: Índices en la base de datos
**Problema:** Sin índices, las queries lentas con más de 1,000 registros.
**Archivo:** `server/prisma/schema.prisma`

### Paso 7.1 — Agregar índices al schema

Buscar el modelo `Order` y agregar al final (antes del cierre `}`):
```prisma
model Order {
  // ... todos los campos existentes sin cambiar ...

  // ✅ AGREGAR estos índices al final:
  @@index([clientId])
  @@index([professionalId])
  @@index([status])
  @@index([status, completedAt]) // Para el cron job de escrow
}
```

Buscar el modelo `Notification` y agregar:
```prisma
model Notification {
  // ... todos los campos existentes sin cambiar ...

  // ✅ AGREGAR:
  @@index([userId, read]) // Para contar no-leídas eficientemente
  @@index([userId])
}
```

Buscar el modelo `Message` y verificar que ya tiene `@@index([conversationId])` — si no, agregar:
```prisma
model Message {
  // ... campos existentes ...
  @@index([conversationId])
  @@index([receiverId])
}
```

### Paso 7.2 — Ejecutar la migración

```bash
cd server
npx prisma migrate dev --name "add_performance_indexes"
```

---

## Fix 8: Reemplazar setInterval con node-cron
**Problema:** `setInterval` se resetea con cada reinicio del servidor.
**Archivos:** `server/src/index.ts` + nuevo `server/src/jobs/escrowCron.ts`

### Paso 8.1 — Instalar dependencia

```bash
cd server
npm install node-cron
npm install --save-dev @types/node-cron
```

### Paso 8.2 — Crear `server/src/jobs/escrowCron.ts` (archivo nuevo)

```typescript
import cron from 'node-cron';
import { EscrowStateMachine } from '../lib/escrow';

export function startEscrowCron() {
  console.log('⏰ Iniciando cron job de Escrow...');

  // Ejecutar inmediatamente al arrancar (para no perder órdenes si el server estuvo caído)
  runEscrowRelease();

  // Luego ejecutar cada hora
  cron.schedule('0 * * * *', () => {
    runEscrowRelease();
  });
}

async function runEscrowRelease() {
  console.log('🔄 Ejecutando revisión de Escrow Automático...');
  try {
    await EscrowStateMachine.processAutoReleases();
    console.log('✅ Revisión de Escrow completada.');
  } catch (err) {
    console.error('❌ Error en cron de Escrow:', err);
  }
}
```

### Paso 8.3 — Actualizar `server/src/index.ts`

**ELIMINAR** este bloque completo del final de `index.ts`:
```typescript
// ELIMINAR ESTO COMPLETO:
setInterval(() => {
  console.log('🔄 Ejecutando revisión de Escrow Automático...');
  EscrowStateMachine.processAutoReleases()
    .then(() => console.log('✅ Revisión de Escrow completada.'))
    .catch(err => console.error('❌ Error en cron de Escrow:', err));
}, 60 * 60 * 1000);
```

**AGREGAR** este import al inicio de `index.ts`:
```typescript
import { startEscrowCron } from './jobs/escrowCron';
```

**AGREGAR** esto después de `app.listen(...)`:
```typescript
app.listen(Number(port), '0.0.0.0', () => {
  console.log(`🚀 Intecnia corriendo en http://localhost:${port}`);
  console.log(`   ENV: ${process.env.NODE_ENV}`);

  // ✅ AGREGAR AQUÍ:
  startEscrowCron();
});
```

---

## Fix 9: Extraer rutas de admin de index.ts
**Problema:** Las rutas de admin están en `index.ts` en lugar de su propio router.
**Archivo nuevo:** `server/src/routes/admin.ts`

### Paso 9.1 — Crear `server/src/routes/admin.ts` (archivo nuevo)

```typescript
import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { sendEmail, emailTemplates } from '../lib/email';
import { uploadDoc } from '../lib/upload';

const router = Router();

// GET /api/admin/verifications/pending
router.get('/verifications/pending', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }

    const pendingDocs = await prisma.verificationDocument.findMany({
      where: { status: 'PENDING' },
      include: {
        professional: {
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(pendingDocs);
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/admin/verifications/:id/approve
router.patch('/verifications/:id/approve', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }

    const { id } = req.params;
    const adminId = user.userId;

    const result = await prisma.$transaction(async (tx: any) => {
      const doc = await tx.verificationDocument.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      if (doc.type === 'SAT_CONSTANCIA') {
        const updatedProf = await tx.professional.update({
          where: { id: doc.professionalId },
          data: { isVerified: true, verificationStatus: 'APPROVED', satVerifiedAt: new Date() },
          include: { user: true }
        });

        sendEmail({
          to: updatedProf.user.email,
          subject: '¡Verificación Aprobada! - Intecnia',
          html: emailTemplates.verificationApproved(updatedProf.user.name)
        }).catch(console.error);
      }
      return doc;
    });

    res.json({ message: 'Documento aprobado exitosamente', document: result });
  } catch (error) {
    res.status(500).json({ error: 'Error interno al aprobar documento' });
  }
});

// PATCH /api/admin/verifications/:id/reject
router.patch('/verifications/:id/reject', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const adminId = user.userId;

    if (!reason?.trim()) {
      return res.status(400).json({ error: 'El motivo de rechazo es obligatorio.' });
    }

    const doc = await prisma.verificationDocument.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      include: {
        professional: {
          include: { user: true }
        }
      }
    });

    sendEmail({
      to: doc.professional.user.email,
      subject: 'Actualizacion requerida en tu Verificacion - Intecnia',
      html: emailTemplates.verificationRejected(doc.professional.user.name, reason.trim())
    }).catch(console.error);

    res.json({ message: 'Documento rechazado. Se notificara al profesional.', document: doc });
  } catch (error) {
    console.error('Error rejecting document:', error);
    res.status(500).json({ error: 'Error interno al rechazar documento' });
  }
});

// POST /api/admin/verification/upload
router.post('/verification/upload', authenticate, uploadDoc.single('constancia'), async (req: any, res) => {
  try {
    const { professionalId, docType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se cargó ningún archivo' });
    }

    if (!professionalId || !docType) {
      return res.status(400).json({ error: 'professionalId y docType son requeridos' });
    }

    const validDocTypes = ['INE', 'PASSPORT', 'SAT_CONSTANCIA', 'CONOCER_CERT', 'COMPROBANTE_DOMICILIO'];
    if (!validDocTypes.includes(docType)) {
      return res.status(400).json({ error: `docType inválido. Válidos: ${validDocTypes.join(', ')}` });
    }

    const fileUrl = file.location || `/uploads/${file.filename}`;

    const document = await prisma.verificationDocument.create({
      data: {
        professionalId,
        type: docType as any,
        fileUrl,
        status: 'PENDING',
      },
    });

    res.json({
      id: document.id,
      fileUrl: document.fileUrl,
      status: document.status,
      message: 'Documento subido exitosamente. Pendiente de revisión.',
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Error al subir el documento' });
  }
});

export { router as adminRouter };
```

### Paso 9.2 — Agregar el import y la ruta en `index.ts`

**AGREGAR** el import:
```typescript
import { adminRouter } from './routes/admin';
```

**AGREGAR** la ruta después de los otros routers:
```typescript
app.use('/api/admin', adminRouter);
app.use('/api/verification', adminRouter); // Para el upload de docs
```

### Paso 9.3 — Eliminar las rutas de admin de `index.ts`

Eliminar los siguientes bloques completos de `index.ts`:
- `app.post('/api/verification/upload', ...)` — todo el bloque
- `app.get('/api/admin/verifications/pending', ...)` — todo el bloque
- `app.patch('/api/admin/verifications/:id/approve', ...)` — todo el bloque
- `app.patch('/api/admin/verifications/:id/reject', ...)` — todo el bloque

---

## Fix 10: Paginación en endpoints de listado
**Problema:** `GET /api/orders/my` puede devolver cientos de registros.
**Archivo:** `server/src/routes/orders.ts`

### Paso 10.1 — Agregar paginación al GET /my

Buscar el handler de `router.get('/my', ...)` y **REEMPLAZAR** la lógica de queries:

```typescript
router.get('/my', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    // ✅ Paginación
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    let orders;
    let total;

    if (role === 'PROFESSIONAL') {
      const professional = await prisma.professional.findUnique({ where: { userId } });
      if (!professional) {
        return res.json({ data: [], total: 0, page, limit });
      }

      [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { professionalId: professional.id },
          include: {
            client: { select: { name: true, avatarUrl: true, email: true } },
            timeline: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.order.count({ where: { professionalId: professional.id } })
      ]);
    } else {
      [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { clientId: userId },
          include: {
            professional: {
              include: { user: { select: { name: true, avatarUrl: true } } }
            },
            timeline: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.order.count({ where: { clientId: userId } })
      ]);
    }

    res.json({
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

---

## Fix 11: Rate limiting en endpoints críticos
**Problema:** `POST /orders` y `POST /checkout` no tienen rate limit.
**Archivo:** `server/src/routes/orders.ts`

### Paso 11.1 — Agregar imports

Al inicio de `orders.ts`, agregar:
```typescript
import rateLimit from 'express-rate-limit';

const createOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // máx 20 órdenes por hora por IP
  message: { error: 'Demasiadas órdenes creadas. Intenta de nuevo en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: 'Demasiados intentos de pago. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### Paso 11.2 — Aplicar limiters

```typescript
// ANTES:
router.post('/', authenticate, async (req: any, res: any) => {

// DESPUÉS:
router.post('/', authenticate, createOrderLimiter, async (req: any, res: any) => {
```

```typescript
// ANTES:
router.post('/:id/checkout', authenticate, async (req: any, res: any) => {

// DESPUÉS:
router.post('/:id/checkout', authenticate, checkoutLimiter, async (req: any, res: any) => {
```

---

# FASE 3 — Escalabilidad
> **Tiempo estimado: 1-2 semanas**
> Para crecer sin reescribir el sistema.

---

## Fix 12: Validación de inputs con Zod
**Problema:** Los route handlers no validan el body. Un input malicioso puede causar errores 500.
**Archivo:** `server/src/routes/orders.ts` (aplica el mismo patrón a todos los routes)

### Paso 12.1 — Crear middleware de validación

Crear `server/src/middleware/validate.ts` (archivo nuevo):
```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data; // Datos limpios y tipados
    next();
  };
}
```

### Paso 12.2 — Schemas para Orders

Crear `server/src/schemas/orderSchemas.ts` (archivo nuevo):
```typescript
import { z } from 'zod';

export const createOrderSchema = z.object({
  professionalId: z.string().cuid('professionalId inválido'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres').max(1000),
  agreedPrice: z.number().positive('El precio debe ser mayor a 0').max(1000000),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
});

export const disputeOrderSchema = z.object({
  reason: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
});

export const resolveDisputeSchema = z.object({
  resolution: z.enum(['FAVOR_CLIENT', 'FAVOR_PROFESSIONAL', 'PARTIAL_REFUND', 'TIMEOUT_RELEASE']),
});
```

### Paso 12.3 — Aplicar validación en orders.ts

```typescript
import { validate } from '../middleware/validate';
import { createOrderSchema, disputeOrderSchema, resolveDisputeSchema } from '../schemas/orderSchemas';

// ANTES:
router.post('/', authenticate, createOrderLimiter, async (req: any, res: any) => {

// DESPUÉS:
router.post('/', authenticate, createOrderLimiter, validate(createOrderSchema), async (req: any, res: any) => {
```

```typescript
// ANTES:
router.patch('/:id/dispute', authenticate, async (req: any, res: any) => {

// DESPUÉS:
router.patch('/:id/dispute', authenticate, validate(disputeOrderSchema), async (req: any, res: any) => {
```

---

## Fix 13: Compression middleware
**Problema:** Las respuestas JSON no están comprimidas, transferencia innecesariamente grande.
**Archivo:** `server/src/index.ts`

### Paso 13.1 — Instalar

```bash
cd server
npm install compression
npm install --save-dev @types/compression
```

### Paso 13.2 — Agregar en index.ts

```typescript
import compression from 'compression';

// Agregar DESPUÉS de helmet() y ANTES de express.json():
app.use(compression());
```

---

## Fix 14: Logging estructurado
**Problema:** Solo hay `console.log` — imposible filtrar errores en producción.

### Paso 14.1 — Instalar pino

```bash
cd server
npm install pino pino-http
npm install --save-dev @types/pino-http
```

### Paso 14.2 — Crear `server/src/lib/logger.ts` (archivo nuevo)

```typescript
import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
```

### Paso 14.3 — Agregar HTTP logger en index.ts

```typescript
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';

// Agregar después de helmet():
app.use(pinoHttp({ logger }));
```

---

## Fix 15: Global Error Handler
**Problema:** Errores no capturados en handlers async pueden crashear el proceso.
**Archivo:** `server/src/middleware/errorHandler.ts` (archivo nuevo)

### Paso 15.1 — Crear el middleware

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' ? { details: err.message } : {}),
  });
}
```

### Paso 15.2 — Registrar en index.ts

Agregar como **el último middleware** en `index.ts`, después del SPA fallback:
```typescript
import { globalErrorHandler } from './middleware/errorHandler';

// Al final de todo, después de app.get('*', ...):
app.use(globalErrorHandler);
```

---

## Fix 16: Notificaciones cuando se crea una orden
**Problema:** El profesional no recibe aviso cuando un cliente le crea una orden.
**Archivo:** `server/src/routes/orders.ts`

### Paso 16.1 — Agregar notificación en POST /

Buscar el final del handler de `router.post('/', ...)` y **agregar antes del `res.json`**:

```typescript
// Notificar al profesional (async, no bloquea la respuesta)
prisma.professional.findUnique({
  where: { id: professionalId },
  include: { user: true }
}).then(prof => {
  if (prof?.user?.email) {
    // Crear notificación en BD
    prisma.notification.create({
      data: {
        userId: prof.userId,
        type: 'ORDER_STATUS',
        title: 'Nueva orden recibida',
        body: `Tienes una nueva orden de trabajo: "${description.substring(0, 50)}..."`,
        metadata: { orderId: order.id },
      }
    }).catch(console.error);

    // Enviar email
    sendEmail({
      to: prof.user.email,
      subject: 'Nueva orden recibida — Intecnia',
      html: `
        <h2>¡Tienes una nueva orden!</h2>
        <p>Un cliente ha creado una orden para ti:</p>
        <p><strong>${description.substring(0, 200)}</strong></p>
        <p>Precio acordado: $${agreedPrice} MXN</p>
        <a href="${env.APP_URL}/dashboard">Ver orden en mi dashboard</a>
      `,
    }).catch(console.error);
  }
}).catch(console.error);

res.status(201).json({ message: 'Orden creada exitosamente', order });
```

**AGREGAR** el import de `sendEmail` y `env` al inicio de `orders.ts` si no están:
```typescript
import { sendEmail } from '../lib/email';
import { env } from '../config/env';
```

---

# FASE 4 — Monitoring y Testing (Producción Real)
> Esto va después del primer deploy, de forma continua.

---

## Fix 17: Sentry para errores en producción

### Paso 17.1 — Instalar

```bash
cd server
npm install @sentry/node @sentry/profiling-node
```

### Paso 17.2 — Configurar en index.ts

```typescript
import * as Sentry from '@sentry/node';

// Lo primero de todo, antes de cualquier otro import de la app:
Sentry.init({
  dsn: env.SENTRY_DSN, // Agregar SENTRY_DSN a env.ts
  environment: env.NODE_ENV,
  tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Agregar a `env.ts`:
```typescript
SENTRY_DSN: z.string().url().optional(),
```

### Paso 17.3 — Registrar handler de Sentry

```typescript
// Agregar ANTES del globalErrorHandler, al final de index.ts:
Sentry.setupExpressErrorHandler(app);
app.use(globalErrorHandler);
```

---

## Fix 18: Healthcheck mejorado

**REEMPLAZAR** el healthcheck actual en `index.ts`:
```typescript
// ANTES:
app.get('/health', async (req, res) => {
  try {
    const result: any[] = await prisma.$queryRaw`SELECT NOW()`;
    res.json({ status: 'ok', env: process.env.NODE_ENV, db: result[0]?.now });
  } catch (err) {
    res.json({ status: 'ok', env: process.env.NODE_ENV, db: 'no conectada' });
  }
});
```

**CON esto:**
```typescript
// DESPUÉS:
app.get('/health', async (req, res) => {
  const checks: Record<string, string> = {};

  // DB check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (e) {
    checks.database = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    checks,
  });
});
```

---

# ✅ Checklist Final antes de ir a producción

```
FASE 1 — CRÍTICOS
[ ] Stripe singleton creado en lib/stripe.ts
[ ] Helmet instalado y configurado
[ ] CORS con dominio de producción en ALLOWED_ORIGINS
[ ] JWT expira en 7d (cookie y token consistentes)
[ ] JWT_PRIVATE_KEY tiene valor real (no fallback)
[ ] Idempotency key en stripe.paymentIntents.create
[ ] .env NO está en git (git ls-files server/.env = vacío)
[ ] node_modules NO está en git

FASE 2 — ESTABILIDAD
[ ] Migration de índices ejecutada (prisma migrate dev)
[ ] node-cron reemplaza setInterval
[ ] Cron ejecuta al arrancar (no solo en el intervalo)
[ ] Rutas de admin extraídas a routes/admin.ts
[ ] Paginación en GET /api/orders/my
[ ] Rate limiting en POST /orders y POST /checkout

FASE 3 — ESCALABILIDAD
[ ] Middleware de validación con Zod creado
[ ] Schemas Zod para createOrder y disputeOrder
[ ] compression middleware instalado
[ ] pino logger instalado y reemplazando console.log críticos
[ ] Global error handler como último middleware
[ ] Notificación al profesional cuando se crea orden

FASE 4 — MONITORING
[ ] Sentry configurado con DSN real
[ ] Healthcheck devuelve 503 si DB está caída
[ ] Variables de producción en .env verificadas
```

---

# 📋 Variables de entorno requeridas en producción

Crear este `.env` en el servidor de producción (NUNCA en git):

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/intecnia_prod

# Auth — generar con: openssl rand -base64 64
JWT_PRIVATE_KEY=tu_clave_secreta_larga_aqui

# CORS
ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com
APP_URL=https://tudominio.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=no-reply@tudominio.com

# OpenAI
OPENAI_API_KEY=sk-...

# Monitoring (opcional pero recomendado)
SENTRY_DSN=https://...@sentry.io/...
```

---

*Documento generado el $(date). Basado en análisis de código real de Intecnia v1.0.*

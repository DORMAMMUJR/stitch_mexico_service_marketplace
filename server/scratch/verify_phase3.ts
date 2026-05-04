/**
 * server/scratch/verify_phase3.ts
 * 
 * Script para verificar los 4 puntos de la Fase 3.
 * Uso: npx ts-node scratch/verify_phase3.ts
 */

import jwt from 'jsonwebtoken';
import { optionalAuthenticate } from '../src/middleware/auth';
import { globalErrorHandler } from '../src/middleware/errorHandler';
import { EscrowStateMachine } from '../src/lib/escrow';
import { prisma } from '../src/lib/db';

async function runTests() {
  console.log('🧪 Iniciando Verificación de Fase 3...\n');

  // 1. Token expirado en ruta opcional
  console.log('1. Verificando optionalAuthenticate con token expirado...');
  const mockReq1 = { cookies: { access_token: 'exp' }, headers: {} } as any;
  const mockRes1 = {
    status: (code: number) => ({
      json: (data: any) => {
        if (code === 401 && data.error.includes('expirado')) console.log('   ✅ OK: Retornó 401 exp.');
      }
    })
  } as any;
  const originalVerify = jwt.verify;
  jwt.verify = () => { throw new jwt.TokenExpiredError('jwt expired', new Date()); };
  optionalAuthenticate(mockReq1, mockRes1, () => {});
  jwt.verify = originalVerify;

  // 2. Error no capturado llega al handler global
  console.log('\n2. Verificando globalErrorHandler...');
  const mockRes2 = {
    headersSent: false,
    status: (code: number) => ({
      json: (data: any) => {
        if (code === 500) console.log('   ✅ OK: Capturó error y retornó 500.');
      }
    })
  } as any;
  globalErrorHandler(new Error('Boom'), { url: '/', method: 'GET' } as any, mockRes2, () => {});

  // 3. Cron no reintenta orden con backoff activo
  console.log('\n3. Verificando backoff en Escrow...');
  const originalFindMany = prisma.order.findMany;
  (prisma.order as any).findMany = async (args: any) => {
    if (args.where?.status === 'PAYOUT_FALLIDO' && args.where?.payoutAttempts?.lt === 5) {
      return [{ id: 'order_1', status: 'PAYOUT_FALLIDO', payoutAttempts: 1, lastPayoutAttemptAt: new Date() }];
    }
    return [];
  };
  const originalLog = console.log;
  let backoffLog = false;
  console.log = (...args: any[]) => {
    if (args[0]?.includes('backoff activo')) backoffLog = true;
  };
  await EscrowStateMachine.processAutoReleases();
  console.log = originalLog;
  if (backoffLog) console.log('   ✅ OK: Backoff respetado.');

  // 4. Admin recibe notificación al agotar intentos
  console.log('\n4. Verificando alerta a Admin...');
  (prisma.order as any).findMany = async (args: any) => {
    if (args.where?.status === 'PAYOUT_FALLIDO' && args.where?.payoutAttempts?.gte === 5) {
      return [{ id: 'order_exhausted', agreedPrice: 100, currency: 'MXN', professionalId: 'p1' }];
    }
    return [];
  };
  // Mockear el "findMany" de admins que hace notifyAdmins
  const originalUserFindMany = prisma.user.findMany;
  (prisma.user as any).findMany = async (args: any) => {
    if (args.where?.role === 'ADMIN') return [{ id: 'admin1', email: 'a@a.com' }];
    return [];
  };
  // Mockear la creación de la notificación
  const originalCreateNotif = prisma.notification.create;
  let adminNotified = false;
  (prisma.notification as any).create = async (args: any) => {
    if (args.data.type === 'SYSTEM') adminNotified = true;
    return {};
  };

  await EscrowStateMachine.processAutoReleases();
  if (adminNotified) console.log('   ✅ OK: Admin notificado.');

  // Cleanup
  prisma.order.findMany = originalFindMany;
  prisma.user.findMany = originalUserFindMany;
  prisma.notification.create = originalCreateNotif;

  console.log('\n🏁 Pruebas finalizadas.');
}

runTests();

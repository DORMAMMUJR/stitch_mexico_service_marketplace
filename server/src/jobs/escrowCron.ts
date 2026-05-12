import cron from 'node-cron';
import { EscrowStateMachine } from '../lib/escrow';
import { logger } from '../lib/logger';

export function startEscrowCron() {
  logger.info('Iniciando cron job de Escrow');

  // Ejecutar inmediatamente al arrancar (para no perder órdenes si el server estuvo caído)
  runEscrowRelease();

  // Luego ejecutar cada hora
  cron.schedule('0 * * * *', () => {
    runEscrowRelease();
  });
}

async function runEscrowRelease() {
  logger.info('Ejecutando revisión de Escrow automático');
  try {
    await EscrowStateMachine.processAutoReleases();
    logger.info('Revisión de Escrow completada');
  } catch (err) {
    logger.error({ err }, 'Error en cron de Escrow');
  }
}

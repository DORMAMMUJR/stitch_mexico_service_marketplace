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

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⏳ Iniciando backfill de perfiles médicos...');

  const result = await prisma.professional.updateMany({
    data: {
      slotIntervalMinutes: 30, // 30 minutos por defecto
      consultationModes: ['PRESENCIAL', 'TELEMEDICINA'], // Modalidades base
      acceptedInsurers: [], // Seguro vacío por ahora
    },
  });

  console.log(`✅ ¡Backfill completado con éxito!`);
  console.log(`📊 Perfiles actualizados: ${result.count}`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante el backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
/**
 * server/scratch/setup_final_verification.ts
 * 
 * Prepara datos reales en la BD para la verificación final.
 */

import { prisma } from '../src/lib/db';
import bcrypt from 'bcrypt';

async function setup() {
  console.log('🏗️ Configurando datos para verificación final...');

  // 1. Crear/Actualizar Profesional de prueba
  const email = 'test_pro@intecnia.com';
  const pass = await bcrypt.hash('password123', 10);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: pass,
        name: 'Profesional Verificación',
        role: 'PROFESSIONAL'
      }
    });
  }

  let professional = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!professional) {
    professional = await prisma.professional.create({
      data: {
        userId: user.id,
        title: 'Experto en Pruebas',
        category: 'IT_SECURITY',
        isVerified: true
      }
    });
  }

  // 2. Configurar disponibilidad: Lunes (1) y Miércoles (3) de 09:00 a 11:00
  console.log('📅 Configurando disponibilidad: Lunes y Miércoles 09:00 - 11:00');
  await prisma.availability.deleteMany({ where: { professionalId: professional.id } });
  await prisma.availability.createMany({
    data: [
      { professionalId: professional.id, dayOfWeek: 1, startTime: '09:00', endTime: '11:00' },
      { professionalId: professional.id, dayOfWeek: 3, startTime: '09:00', endTime: '11:00' },
    ]
  });

  // 3. Crear un cliente de prueba
  const clientEmail = 'test_client@intecnia.com';
  let clientUser = await prisma.user.findUnique({ where: { email: clientEmail } });
  if (!clientUser) {
    clientUser = await prisma.user.create({
      data: {
        email: clientEmail,
        passwordHash: pass,
        name: 'Cliente Verificación',
        role: 'CLIENT'
      }
    });
  }

  console.log('\n✅ Datos preparados.');
  console.log(`Profesional ID: ${professional.id}`);
  console.log(`URL sugerida: http://localhost:5173/professional/${professional.id}`);
}

setup().catch(console.error);

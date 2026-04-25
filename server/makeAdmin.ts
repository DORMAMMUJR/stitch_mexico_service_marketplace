import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('❌ Error: Debes proporcionar el correo electrónico del usuario.');
    console.log('💡 Uso: npx ts-node makeAdmin.ts tu_correo@ejemplo.com');
    process.exit(1);
  }

  try {
    const user = await prisma.user.updateMany({
      where: { email },
      data: { role: 'ADMIN' },
    });

    if (user.count === 0) {
      console.log(`⚠️ No se encontró ningún usuario con el correo: ${email}`);
    } else {
      console.log(`✅ ¡Éxito! El usuario ${email} ahora tiene rol de ADMIN.`);
      console.log(`🔒 Ya puedes entrar a localhost:5173/admin`);
    }
  } catch (error) {
    console.error('Error al promover usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

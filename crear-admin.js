const bcrypt = require('bcrypt');
const { prisma } = require('./server/dist/lib/db.js');

async function main() {
  // 1) Cambia estos valores
  const passwordPlana = 'TuContrasenaSegura123';
  const emailAdmin = 'admin@intecnia.com';
  const nameAdmin = 'Super Admin';

  const emailNormalizado = String(emailAdmin).trim().toLowerCase();

  // 2) Validaciones basicas
  if (!emailNormalizado || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
    throw new Error('Correo invalido');
  }
  if (!passwordPlana || passwordPlana.length < 8) {
    throw new Error('La contrasena debe tener al menos 8 caracteres');
  }
  if (!nameAdmin.trim()) {
    throw new Error('El nombre es obligatorio');
  }

  // 3) Evitar duplicados
  const existente = await prisma.user.findUnique({ where: { email: emailNormalizado } });
  if (existente) {
    console.log(`⚠️ Ya existe un usuario con ese correo: ${emailNormalizado}`);
    return;
  }

  // 4) Hash + creacion
  const passwordHash = await bcrypt.hash(passwordPlana, 10);

  const adminUser = await prisma.user.create({
    data: {
      email: emailNormalizado,
      passwordHash,
      role: 'ADMIN',
      name: nameAdmin,
    },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      createdAt: true,
    },
  });

  console.log('✅ Usuario administrador creado con éxito:');
  console.log(adminUser);
}

main()
  .catch((e) => {
    console.error('❌ Error al crear el usuario:', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

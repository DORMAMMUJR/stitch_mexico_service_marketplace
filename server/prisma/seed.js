const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'IntecniaDemo2026!';
const SUPER_ADMIN_EMAIL = 'superadmin@intecnia.mx';
const SUPER_ADMIN_PASSWORD = 'SuperAdmin2026!';

async function upsertSpecialist(email, name, title, category, city) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role: 'PROFESSIONAL', phone: '+525500000000' },
    create: {
      email,
      passwordHash,
      name,
      phone: '+525500000000',
      role: 'PROFESSIONAL',
      termsConsentedAt: new Date(),
      privacyConsentedAt: new Date(),
    },
  });

  await prisma.professional.upsert({
    where: { userId: user.id },
    update: {
      title,
      category,
      city,
      isVerified: true,
      verificationStatus: 'APPROVED',
      bio: `${title} con experiencia comprobada en ${city}.`,
      hourlyRate: 900,
    },
    create: {
      userId: user.id,
      title,
      category,
      city,
      currency: 'MXN',
      isVerified: true,
      verificationStatus: 'APPROVED',
      bio: `${title} con experiencia comprobada en ${city}.`,
      hourlyRate: 900,
    },
  });
}

async function upsertSuperAdmin() {
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      role: 'ADMIN',
      name: 'Super Admin Intecnia',
      phone: '+525500000001',
      passwordHash,
      termsConsentedAt: new Date(),
      privacyConsentedAt: new Date(),
    },
    create: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      name: 'Super Admin Intecnia',
      phone: '+525500000001',
      termsConsentedAt: new Date(),
      privacyConsentedAt: new Date(),
    },
  });

  console.log('Super admin ready:', SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
}

async function main() {
  await upsertSpecialist('demo.psicologia@intecnia.mx', 'Pamela Ortega', 'Psicologa Clinica', 'PSYCHOLOGY', 'Ciudad de Mexico');
  await upsertSpecialist('demo.medicina@intecnia.mx', 'Carlos Mendoza', 'Medico General', 'MEDICINE', 'Ciudad de Mexico');
  await upsertSpecialist('demo.bienestar@intecnia.mx', 'Elena Torres', 'Nutriologa Clinica', 'WELLNESS', 'Ciudad de Mexico');
  await upsertSuperAdmin();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function upsertSpecialist(email, name, title, category, city) {
  const passwordHash = await bcrypt.hash('IntecniaDemo2026!', 10);
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

async function main() {
  await upsertSpecialist('demo.psicologia@intecnia.mx', 'Pamela Ortega', 'Psicóloga Clínica', 'HEALTH_WELLNESS', 'Ciudad de México');
  await upsertSpecialist('demo.legal@intecnia.mx', 'Andrés Salinas', 'Abogado Corporativo', 'LEGAL', 'Ciudad de México');
}

main().finally(async () => prisma.$disconnect());

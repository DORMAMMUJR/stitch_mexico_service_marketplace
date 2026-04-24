/**
 * Seed Script — KonectIA / Intecnia
 * Inserta el profesional de prueba: Pamela Osnaya
 * 
 * Uso: node server/seed.js
 */

const pg = require('pg');
const path = require('path');
const fs = require('fs');

// Cargar .env del servidor
require('dotenv').config({ path: path.join(__dirname, 'server/.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  console.log('🌱 Iniciando seed...');
  console.log('   DB:', process.env.DATABASE_URL?.substring(0, 40) + '...');

  try {
    // ─── 1. Crear tablas si no existen ─────────────────────────────────────
    console.log('\n📋 Verificando tablas...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL DEFAULT 'seed_no_password',
        role TEXT NOT NULL DEFAULT 'PROFESSIONAL',
        name TEXT NOT NULL,
        phone TEXT,
        "avatarUrl" TEXT,
        "emailVerified" BOOLEAN DEFAULT false,
        "privacyConsentedAt" TIMESTAMP,
        "biometricConsentAt" TIMESTAMP,
        "deletionRequestedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Professional" (
        id TEXT PRIMARY KEY,
        "userId" TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        bio TEXT,
        category TEXT NOT NULL DEFAULT 'HEALTH_WELLNESS',
        subcategories TEXT[] DEFAULT '{}',
        "hourlyRate" DECIMAL(10,2),
        currency TEXT DEFAULT 'MXN',
        latitude FLOAT,
        longitude FLOAT,
        city TEXT,
        state TEXT,
        "isVerified" BOOLEAN DEFAULT true,
        "verificationStatus" TEXT DEFAULT 'APPROVED',
        "satConstancia" TEXT,
        "satVerifiedAt" TIMESTAMP,
        "biometricDone" BOOLEAN DEFAULT true,
        "conocerCerts" TEXT[] DEFAULT '{}',
        "stripeAccountId" TEXT,
        "payoutEnabled" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('   ✅ Tablas listas');

    // ─── 2. Insertar o actualizar el usuario de Pamela ──────────────────────
    const userId = 'user_pamela_osnaya_001';
    const professionalId = 'prof_pamela_osnaya_001';

    console.log('\n👤 Insertando usuario: Pamela Osnaya...');
    await pool.query(`
      INSERT INTO "User" (id, email, "passwordHash", role, name, "avatarUrl", "emailVerified", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        "avatarUrl" = EXCLUDED."avatarUrl",
        "updatedAt" = NOW();
    `, [
      userId,
      'pamela.osnaya@intecnia.mx',
      'seed_placeholder',
      'PROFESSIONAL',
      'Pamela Osnaya',
      '/pamela.jpg',
      true,
    ]);

    console.log('   ✅ Usuario creado: id =', userId);

    // ─── 3. Insertar o actualizar el perfil profesional ─────────────────────
    console.log('\n🏆 Insertando profesional...');
    await pool.query(`
      INSERT INTO "Professional" (
        id, "userId", title, bio, category, subcategories,
        "hourlyRate", currency, city, state,
        "isVerified", "verificationStatus", "biometricDone",
        "satVerifiedAt", "createdAt", "updatedAt"
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        bio = EXCLUDED.bio,
        "isVerified" = EXCLUDED."isVerified",
        "updatedAt" = NOW();
    `, [
      professionalId,
      userId,
      'Psicóloga Clínica',
      'Especialista en terapia de pareja, adolescentes y procesos post-separación. Con más de 10 años de experiencia acompañando a personas y familias en momentos de cambio y crecimiento personal.',
      'HEALTH_WELLNESS',
      ['Terapia de pareja', 'Adolescentes', 'Terapia post-separación'],
      350.00,
      'MXN',
      'Ciudad de México',
      'CDMX',
      true,
      'APPROVED',
      true,
      new Date(),
    ]);

    console.log('   ✅ Profesional creado: id =', professionalId);

    // ─── 4. Confirmar ────────────────────────────────────────────────────────
    const check = await pool.query('SELECT p.id, u.name, p.title FROM "Professional" p JOIN "User" u ON p."userId" = u.id');
    console.log('\n✅ Profesionales en la BD:');
    check.rows.forEach(r => console.log(`   → [${r.id}] ${r.name} — ${r.title}`));

    console.log('\n🎉 Seed completado!');
    console.log('\n📎 URL del perfil:');
    console.log(`   /profile/${professionalId}`);
    console.log(`   /intecnia-profile/${professionalId}`);

  } catch (err) {
    console.error('\n❌ Error en seed:', err.message);
    console.error(err);
  } finally {
    await pool.end();
  }
}

seed();

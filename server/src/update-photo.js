const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

async function main() {
  console.log('🚀 Actualizando foto de Pamela en la base de datos...');
  const client = await pool.connect();
  try {
    // 1. Actualizar avatar del usuario
    await client.query(`
      UPDATE "User" 
      SET "avatarUrl" = '/pamela.jpg' 
      WHERE name = 'Pamela Osnaya' OR email = 'pamela@intecnia.mx' OR email = 'pamela.osnaya@example.com'
    `);
    
    console.log('✅ Foto actualizada en la tabla User.');
  } catch (e) {
    console.error('❌ Error fatal:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

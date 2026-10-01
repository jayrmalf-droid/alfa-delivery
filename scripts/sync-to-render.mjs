#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';

const dbUrl = process.argv[2] || process.env.DATABASE_URL;
const sqlitePath = process.env.ALFA_DATABASE || './data/alfa.sqlite';

if (!dbUrl) {
  console.error('\nErro: Forneça a URL de conexão do banco do Render (External Database URL).');
  console.log('Exemplo:');
  console.log('  node scripts/sync-to-render.mjs "postgresql://usuario:senha@dpg-...oregon-postgres.render.com/banco"\n');
  process.exit(1);
}

if (!fs.existsSync(sqlitePath)) {
  console.error(`\nErro: Banco SQLite local não encontrado em ${sqlitePath}\n`);
  process.exit(1);
}

console.log('\n======================================================');
console.log('  SINCRONIZAÇÃO: LOCAL (SQLite) -> NUVEM (Render Postgres)');
console.log('======================================================\n');

const sqlite = new DatabaseSync(sqlitePath);
const records = sqlite.prepare('SELECT key, value, version FROM records').all();

console.log(`Lendo ${records.length} coleções de dados do seu computador...`);

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

try {
  const client = await pool.connect();
  console.log('Conectado com sucesso ao PostgreSQL na nuvem!');

  await client.query('BEGIN');

  for (const r of records) {
    await client.query(
      `INSERT INTO records (key, value, version) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, version = EXCLUDED.version`,
      [r.key, r.value, r.version]
    );
    console.log(`  ✓ ${r.key} sincronizado (versão ${r.version})`);
  }

  await client.query('COMMIT');
  client.release();
  console.log('\n🎉 Sincronização concluída com sucesso!');
  console.log('Acesse https://alfa-salgados.onrender.com e recarregue a página.');
} catch (err) {
  console.error('\n❌ Erro durante a sincronização:', err.message);
} finally {
  await pool.end().catch(() => {});
}

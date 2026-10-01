#!/usr/bin/env node
/**
 * Script de Migração: SQLite Local -> Supabase PostgreSQL
 * 
 * Uso:
 *   node scripts/migrate-to-supabase.mjs --dry-run
 *   node scripts/migrate-to-supabase.mjs --execute
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';

const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');
const sqlitePath = process.env.ALFA_DATABASE || './data/alfa.sqlite';
const pgUrl = process.env.DATABASE_URL;

console.log('='.repeat(70));
console.log(' ALFA SALGADOS DELIVERY — MIGRAÇÃO SQLITE -> SUPABASE POSTGRESQL');
console.log('='.repeat(70));
console.log(`Modo: ${isDryRun ? 'SIMULAÇÃO (--dry-run) - Nenhuma alteração no destino' : 'EXECUÇÃO REAL (--execute)'}`);
console.log(`Origem SQLite: ${sqlitePath}`);
console.log(`Destino Postgres: ${pgUrl ? pgUrl.replace(/:[^:@]+@/, ':****@') : 'NÃO CONFIGURADO'}`);
console.log('-'.repeat(70));

if (!fs.existsSync(sqlitePath)) {
  console.error(`Erro: Arquivo SQLite de origem "${sqlitePath}" não encontrado.`);
  process.exit(1);
}

if (!isDryRun && !pgUrl) {
  console.error('Erro: Variável DATABASE_URL é obrigatória para execução real.');
  process.exit(1);
}

// 1. Abrir banco SQLite de origem
const sqlite = new DatabaseSync(sqlitePath);

// 2. Extrair dados atuais
const records = sqlite.prepare('SELECT key, value, version FROM records').all();
const orders = sqlite.prepare('SELECT id, number, token_hash, idem_hash, data FROM orders').all();
const sessions = sqlite.prepare('SELECT hash, expires FROM sessions').all();
const auditLogs = sqlite.prepare('SELECT id, at, action, resource FROM audit').all();

const recordMap = new Map();
for (const r of records) {
  recordMap.set(r.key, JSON.parse(r.value));
}

const products = recordMap.get('alfa_products') || [];
const categories = recordMap.get('alfa_categories') || [];
const groups = recordMap.get('alfa_option_groups') || [];
const options = recordMap.get('alfa_product_options') || [];
const flavors = recordMap.get('alfa_flavors') || [];
const banners = recordMap.get('alfa_banners') || [];
const neighborhoods = recordMap.get('alfa_neighborhoods') || [];
const coupons = recordMap.get('alfa_coupons') || [];
const settings = recordMap.get('alfa_settings') || {};

// 3. Auditoria e Validação de Integridade
console.log('\n[1/4] AUDITORIA DE DADOS DE ORIGEM:');
console.log(`• Configurações: ${settings.business_name || 'ALFA SALGADOS'}`);
console.log(`• Categorias: ${categories.length}`);
console.log(`• Produtos totais: ${products.length} (Normal: ${products.filter(p => p.product_mode !== 'combo').length}, Combos: ${products.filter(p => p.product_mode === 'combo').length})`);
console.log(`• Grupos de opções: ${groups.length} (Ativos: ${groups.filter(g => g.is_active !== false).length}, Inativos preservados: ${groups.filter(g => g.is_active === false).length})`);
console.log(`• Opções totais: ${options.length} (Disponíveis: ${options.filter(o => o.is_available !== false).length}, Pausadas: ${options.filter(o => o.is_available === false).length})`);
console.log(`• Sabores legados: ${flavors.length}`);
console.log(`• Banners: ${banners.length}`);
console.log(`• Bairros atendidos: ${neighborhoods.length}`);
console.log(`• Cupons cadastrados: ${coupons.length}`);
console.log(`• Pedidos históricos: ${orders.length}`);
console.log(`• Sessões ativas: ${sessions.length}`);
console.log(`• Registros de auditoria: ${auditLogs.length}`);

// 4. Verificação de Integridade Referencial
console.log('\n[2/4] VERIFICAÇÃO DE INTEGRIDADE REFERENCIAL:');
const productIds = new Set(products.map(p => p.id));
const categoryIds = new Set(categories.map(c => c.id));
const groupIds = new Set(groups.map(g => g.id));

// Produtos sem categoria
const orphanProducts = products.filter(p => !categoryIds.has(p.category_id));
if (orphanProducts.length > 0) {
  console.warn(`  ⚠️ Alerta: ${orphanProducts.length} produto(s) sem categoria correspondente:`, orphanProducts.map(p => p.name));
} else {
  console.log('  ✓ Todos os produtos possuem categoria válida.');
}

// Grupos órfãos (sem produto correspondente)
const orphanGroups = groups.filter(g => !productIds.has(g.product_id));
if (orphanGroups.length > 0) {
  console.warn(`  ⚠️ Alerta: ${orphanGroups.length} grupo(s) sem produto vinculado preservados:`);
  orphanGroups.forEach(g => console.warn(`     - ID: ${g.id} | Nome: "${g.name}" | Ativo: ${g.is_active}`));
} else {
  console.log('  ✓ Todos os grupos de opções possuem produto correspondente.');
}

// Opções órfãs (sem grupo correspondente)
const orphanOptions = options.filter(o => !groupIds.has(o.group_id));
if (orphanOptions.length > 0) {
  console.warn(`  ⚠️ Alerta: ${orphanOptions.length} opção(ões) sem grupo correspondente.`);
} else {
  console.log('  ✓ Todas as opções possuem grupo válido.');
}

// Total de estoque e valor histórico
const totalStock = products.reduce((acc, p) => acc + (p.has_stock_control ? (p.stock_quantity || 0) : 0), 0);
const parsedOrders = orders.map(o => JSON.parse(o.data));
const totalOrdersRevenue = parsedOrders.reduce((acc, o) => acc + (o.total || 0), 0);

console.log('\n[3/4] TOTAIS DE CONCILIAÇÃO:');
console.log(`• Saldo total de estoque (produtos controlados): ${totalStock} unidades`);
console.log(`• Montante total histórico de pedidos: R$ ${totalOrdersRevenue.toFixed(2)}`);

if (isDryRun) {
  console.log('\n[4/4] CONCLUSÃO DA SIMULAÇÃO:');
  console.log('✓ Simulação concluída com sucesso!');
  console.log('Para executar a migração real para o Supabase PostgreSQL:');
  console.log('  1. Configure DATABASE_URL no seu arquivo .env com a string de conexão do Supabase.');
  console.log('  2. Execute: node scripts/migrate-to-supabase.mjs --execute');
  process.exit(0);
}

// 5. Execução Real no PostgreSQL
console.log('\n[4/4] EXECUTANDO GRAVAÇÃO NO DESTINO POSTGRESQL...');
const poolConfig = {
  connectionString: pgUrl,
  max: 5,
  connectionTimeoutMillis: 10000
};
if (process.env.NODE_ENV === 'production' || /supabase\.co|\.cloud|sslmode=require/i.test(pgUrl)) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new pg.Pool(poolConfig);
const client = await pool.connect();

try {
  await client.query('BEGIN');

  // Executar criação das tabelas base
  const schemaSqlPath = path.resolve('server/migrations/001_initial_schema.sql');
  if (fs.existsSync(schemaSqlPath)) {
    const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
    await client.query(schemaSql);
    console.log('  ✓ Esquema de tabelas e políticas RLS aplicado com sucesso.');
  }

  // Migrar records com controle de versão
  for (const r of records) {
    await client.query(
      `INSERT INTO records (key, value, version) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = $2, version = $3`,
      [r.key, r.value, r.version]
    );
  }
  console.log(`  ✓ ${records.length} coleções de records migradas.`);

  // Migrar pedidos
  let ordersCount = 0;
  for (const o of orders) {
    await client.query(
      `INSERT INTO orders (id, number, token_hash, idem_hash, data) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET data = $5`,
      [o.id, o.number, o.token_hash, o.idem_hash, o.data]
    );
    ordersCount++;
  }
  console.log(`  ✓ ${ordersCount} pedidos históricos migrados.`);

  // Migrar auditoria
  for (const a of auditLogs) {
    await client.query(
      `INSERT INTO audit (id, at, action, resource) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.at, a.action, a.resource]
    );
  }
  console.log(`  ✓ ${auditLogs.length} logs de auditoria migrados.`);

  await client.query('COMMIT');
  console.log('\n======================================================================');
  console.log(' MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('======================================================================');
  console.log('Orientações pós-migração:');
  console.log('1. Defina DATABASE_TYPE=postgres no servidor de produção.');
  console.log('2. O banco antigo SQLite permanece intacto como cópia de segurança.');
  console.log('3. Crie os administradores no painel ou via Supabase Auth.');
} catch (err) {
  await client.query('ROLLBACK');
  console.error('\n❌ ERRO NA MIGRAÇÃO — TRANSAÇÃO REVERTIDA (ROLLBACK):', err.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}

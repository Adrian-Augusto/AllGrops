#!/usr/bin/env node
/**
 * safe-migrate.js
 * 1. Tenta resolver qualquer migration com falha na tabela _prisma_migrations
 * 2. Depois roda prisma migrate deploy normalmente
 */

const { execSync } = require('child_process');

function run(cmd, opts = {}) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function tryRun(cmd) {
  console.log(`\n▶ ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

async function resolveFailed() {
  // Tenta conectar ao banco via DATABASE_URL usando o driver pg
  // para buscar todas as migrations com falha dinamicamente
  let failedNames = [];

  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL not set');

    // pg é dependência transitiva do @prisma/client
    const { Client } = require('pg');
    const client = new Client({ connectionString });
    await client.connect();

    const result = await client.query(`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL
        AND rolled_back_at IS NULL
        AND started_at IS NOT NULL
    `);
    failedNames = result.rows.map(r => r.migration_name);
    await client.end();
  } catch (e) {
    console.log(`⚠️  Could not query migrations table: ${e.message}`);
    console.log('    Falling back to resolving known failed migration by name...');
    // Fallback: tenta resolver as migrations que sabemos que falharam
    failedNames = [
      '20260604000000_sync_full_schema',
      '20260605000000_add_missing_columns',
    ];
  }

  if (failedNames.length === 0) {
    console.log('✅ No failed migrations found.');
    return;
  }

  for (const name of failedNames) {
    console.log(`⚠️  Resolving failed migration: ${name}`);
    const ok = tryRun(`npx prisma migrate resolve --rolled-back ${name}`);
    if (ok) {
      console.log(`✅ Resolved: ${name}`);
    } else {
      console.log(`ℹ️  Could not resolve ${name} (may already be resolved)`);
    }
  }
}

async function main() {
  await resolveFailed();

  console.log('\n▶ Running prisma migrate deploy...');
  run('npx prisma migrate deploy');
  console.log('\n✅ Migrations applied successfully.');
}

main().catch((e) => {
  console.error('❌ Migration error:', e.message);
  process.exit(1);
});

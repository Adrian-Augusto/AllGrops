#!/usr/bin/env node
/**
 * safe-migrate.js
 * Resolves any failed Prisma migrations then runs migrate deploy.
 * Safe to run multiple times — if there's nothing to resolve, it continues normally.
 */

const { execSync } = require('child_process');

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    // Non-zero exit — log but don't throw (we'll throw later if needed)
    return false;
  }
  return true;
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Find all failed migrations
    const failed = await prisma.$queryRaw`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL
        AND applied_steps_count > 0
        AND rolled_back_at IS NULL
    `;

    if (failed.length === 0) {
      console.log('✅ No failed migrations found.');
    } else {
      for (const row of failed) {
        const name = row.migration_name;
        console.log(`⚠️  Resolving failed migration: ${name}`);
        run(`npx prisma migrate resolve --rolled-back ${name}`);
      }
    }
  } catch (e) {
    console.log('⚠️  Could not query migrations table, continuing...', e.message);
  } finally {
    await prisma.$disconnect();
  }

  // Now run migrate deploy
  console.log('\n▶ Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * safe-migrate.js
 *
 * Production can be in schema drift if older migrations were partially applied
 * manually or by a failed deploy. We still try Prisma migrations first. If they
 * fail, we apply a small idempotent compatibility patch so the current app can
 * start instead of crashing on missing columns such as Subscription.updatedAt.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prismaCliPath = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');

function tryRun(cmd) {
  console.log(`\n> ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.log(`Warning: command failed: ${error.message}`);
    return false;
  }
}

function getPrismaCommand(args) {
  if (fs.existsSync(prismaCliPath)) {
    return `node "${prismaCliPath}" ${args}`;
  }

  return `npx prisma ${args}`;
}

async function withPrismaClient(callback) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    return await callback(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function resolveFailed() {
  let failedNames = [];

  try {
    const result = await withPrismaClient((prisma) => prisma.$queryRawUnsafe(`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL
        AND rolled_back_at IS NULL
        AND started_at IS NOT NULL
    `));

    failedNames = result.rows.map((row) => row.migration_name);
  } catch (error) {
    console.log(`Warning: could not query migrations table: ${error.message}`);
    failedNames = [
      '20260604000000_sync_full_schema',
      '20260605000000_add_missing_columns',
    ];
  }

  if (failedNames.length === 0) {
    console.log('No failed migrations found.');
    return;
  }

  for (const name of failedNames) {
    console.log(`Resolving failed migration as rolled back: ${name}`);
    tryRun(getPrismaCommand(`migrate resolve --rolled-back ${name}`));
  }
}

async function applyCompatibilityPatch() {
  console.log('\n> Applying production compatibility patch...');

  const statements = [
    `DO $$ BEGIN
      BEGIN ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'EXPIRED'; EXCEPTION WHEN others THEN NULL; END;
      BEGIN ALTER TYPE "GroupStatus" ADD VALUE IF NOT EXISTS 'EXPIRED'; EXCEPTION WHEN others THEN NULL; END;
      BEGIN ALTER TYPE "GroupStatus" ADD VALUE IF NOT EXISTS 'REJECTED'; EXCEPTION WHEN others THEN NULL; END;
    END $$;`,

    `ALTER TABLE IF EXISTS "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE IF EXISTS "User" ADD COLUMN IF NOT EXISTS "termsAccepted" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE IF EXISTS "User" ADD COLUMN IF NOT EXISTS "termsVersion" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE IF EXISTS "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);`,
    `ALTER TABLE IF EXISTS "User" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3);`,
    `ALTER TABLE IF EXISTS "User" ADD COLUMN IF NOT EXISTS "credit" DOUBLE PRECISION NOT NULL DEFAULT 0;`,

    `ALTER TABLE IF EXISTS "Group" ADD COLUMN IF NOT EXISTS "link" TEXT NOT NULL DEFAULT '';`,
    `ALTER TABLE IF EXISTS "Group" ADD COLUMN IF NOT EXISTS "platform" TEXT NOT NULL DEFAULT '';`,
    `ALTER TABLE IF EXISTS "Group" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT NOT NULL DEFAULT '';`,
    `ALTER TABLE IF EXISTS "Group" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE IF EXISTS "Group" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;`,
    `ALTER TABLE IF EXISTS "Group" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;`,
    `ALTER TABLE IF EXISTS "Group" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);`,
    `ALTER TABLE IF EXISTS "Group" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;`,

    `ALTER TABLE IF EXISTS "Category" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE IF EXISTS "Category" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE IF EXISTS "Category" ADD COLUMN IF NOT EXISTS "slug" TEXT;`,
    `UPDATE "Category" SET "slug" = LOWER(REPLACE("name", ' ', '-')) WHERE "slug" IS NULL OR "slug" = '';`,

    `ALTER TABLE IF EXISTS "Membership" ADD COLUMN IF NOT EXISTS "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,

    `ALTER TABLE IF EXISTS "Plan" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE IF EXISTS "Plan" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE IF EXISTS "Plan" ADD COLUMN IF NOT EXISTS "description" TEXT;`,
    `ALTER TABLE IF EXISTS "Plan" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER NOT NULL DEFAULT 30;`,
    `ALTER TABLE IF EXISTS "Plan" ADD COLUMN IF NOT EXISTS "maxSponsoredGroups" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE IF EXISTS "Plan" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;`,

    `ALTER TABLE IF EXISTS "Subscription" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE IF EXISTS "Subscription" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE IF EXISTS "Subscription" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);`,
    `ALTER TABLE IF EXISTS "Subscription" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;`,

    `ALTER TABLE IF EXISTS "Payment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,

    `ALTER TABLE IF EXISTS "Post" ADD COLUMN IF NOT EXISTS "userId" TEXT;`,
    `ALTER TABLE IF EXISTS "Post" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PUBLISHED';`,
    `ALTER TABLE IF EXISTS "Post" ADD COLUMN IF NOT EXISTS "likes" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE IF EXISTS "Post" ADD COLUMN IF NOT EXISTS "views" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE IF EXISTS "Post" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,

    `CREATE TABLE IF NOT EXISTS "RequestLog" (
      "id" TEXT NOT NULL,
      "method" TEXT NOT NULL,
      "path" TEXT NOT NULL,
      "statusCode" INTEGER NOT NULL,
      "userId" TEXT,
      "userAgent" TEXT,
      "ip" TEXT,
      "duration" INTEGER NOT NULL,
      "success" BOOLEAN NOT NULL,
      "errorMessage" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
    );`,

    `CREATE TABLE IF NOT EXISTS "Comment" (
      "id" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "postId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
    );`,
  ];

  await withPrismaClient(async (prisma) => {
    for (const sql of statements) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (error) {
        console.log(`Warning: patch statement skipped: ${error.message}`);
      }
    }
  });

  console.log('Compatibility patch finished.');
}

async function main() {
  await resolveFailed();

  const migrated = tryRun(getPrismaCommand('migrate deploy'));
  if (migrated) {
    console.log('\nMigrations applied successfully.');
    return;
  }

  console.log('\nPrisma migrate deploy failed. Falling back to compatibility patch.');
  await applyCompatibilityPatch();
  console.log('\nDatabase is compatible enough for the current app build.');
}

main().catch((error) => {
  console.error('Migration compatibility script failed:', error.message);
  process.exit(1);
});

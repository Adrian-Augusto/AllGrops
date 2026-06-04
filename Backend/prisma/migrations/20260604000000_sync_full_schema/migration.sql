-- ============================================================
-- Migration: add all missing columns to match current schema
-- Safe: uses IF NOT EXISTS / IF EXISTS to avoid errors
-- ============================================================

-- User: terms fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAccepted"   BOOLEAN   NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsVersion"    INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);

-- User: online tracking
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActivityAt"  TIMESTAMP(3);

-- User: credit system
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "credit"          DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Group: isFeatured
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "isFeatured"     BOOLEAN   NOT NULL DEFAULT false;

-- Group: rejectionReason
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- Group: reviewedById / reviewedAt
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "reviewedById"   TEXT;
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "reviewedAt"     TIMESTAMP(3);

-- Group: categoryId
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "categoryId"     TEXT;

-- Group: status enum (make sure EXPIRED and REJECTED exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GroupStatus') THEN
    CREATE TYPE "GroupStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
  ELSE
    BEGIN ALTER TYPE "GroupStatus" ADD VALUE IF NOT EXISTS 'EXPIRED'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE "GroupStatus" ADD VALUE IF NOT EXISTS 'REJECTED'; EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;

-- Plan: missing fields
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "description"         TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "durationDays"        INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "maxSponsoredGroups"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isActive"            BOOLEAN NOT NULL DEFAULT true;

-- Subscription: groupId already optional (handled in previous migration)
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "isActive"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "expiresAt"   TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "paymentId"   TEXT;

-- Payment table (create if it doesn't exist)
CREATE TABLE IF NOT EXISTS "Payment" (
    "id"                TEXT         NOT NULL,
    "mercadoPagoId"     TEXT,
    "subscriptionId"    TEXT         NOT NULL,
    "status"            TEXT         NOT NULL DEFAULT 'PENDING',
    "idempotencyKey"    TEXT         NOT NULL,
    "webhookProcessed"  BOOLEAN      NOT NULL DEFAULT false,
    "lastWebhookId"     TEXT,
    "externalReference" TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- Payment: unique constraints (safe)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_mercadoPagoId_key') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_mercadoPagoId_key" UNIQUE ("mercadoPagoId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_subscriptionId_key') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_key" UNIQUE ("subscriptionId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_idempotencyKey_key') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_idempotencyKey_key" UNIQUE ("idempotencyKey");
  END IF;
END $$;

-- Post table (create if it doesn't exist)
CREATE TABLE IF NOT EXISTS "Post" (
    "id"          TEXT         NOT NULL,
    "title"       TEXT         NOT NULL,
    "description" TEXT         NOT NULL,
    "link"        TEXT,
    "platform"    TEXT,
    "photo"       TEXT,
    "groupId"     TEXT         NOT NULL,
    "userId"      TEXT         NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- Category table (create if it doesn't exist)
CREATE TABLE IF NOT EXISTS "Category" (
    "id"   TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Category_slug_key') THEN
    ALTER TABLE "Category" ADD CONSTRAINT "Category_slug_key" UNIQUE ("slug");
  END IF;
END $$;

-- Foreign keys (safe: only add if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Group_reviewedById_fkey') THEN
    ALTER TABLE "Group" ADD CONSTRAINT "Group_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Group_categoryId_fkey') THEN
    ALTER TABLE "Group" ADD CONSTRAINT "Group_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_subscriptionId_fkey') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey"
      FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Post_groupId_fkey') THEN
    ALTER TABLE "Post" ADD CONSTRAINT "Post_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Post_userId_fkey') THEN
    ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes (safe)
CREATE INDEX IF NOT EXISTS "Group_status_idx" ON "Group"("status");
CREATE INDEX IF NOT EXISTS "Group_categoryId_idx" ON "Group"("categoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");

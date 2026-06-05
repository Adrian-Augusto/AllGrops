-- ============================================================
-- Migration: add_missing_columns
-- Adds ALL missing columns to match current Prisma schema
-- Safe: uses IF NOT EXISTS to avoid errors on re-run
-- ============================================================

-- ============================================================
-- User: add missing columns
-- ============================================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- Group: add missing columns
-- ============================================================
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "link"        TEXT NOT NULL DEFAULT '';
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "platform"    TEXT NOT NULL DEFAULT '';
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "photoUrl"    TEXT NOT NULL DEFAULT '';

-- ============================================================
-- Category: add missing columns
-- ============================================================
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "slug"      TEXT;

-- Populate NULL slugs (use name lowercased as slug fallback)
UPDATE "Category" SET "slug" = LOWER(REPLACE("name", ' ', '-')) WHERE "slug" IS NULL OR "slug" = '';

-- Make slug NOT NULL and UNIQUE after populating
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Category_slug_key') THEN
    ALTER TABLE "Category" ADD CONSTRAINT "Category_slug_key" UNIQUE ("slug");
  END IF;
END $$;

-- ============================================================
-- Membership: add missing columns
-- ============================================================
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- Plan: add missing columns
-- ============================================================
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- Subscription: add missing columns
-- ============================================================
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- Post: add missing columns
-- ============================================================
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "status"    TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "likes"     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "views"     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- PostStatus enum (safe)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PostStatus') THEN
    CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED');
  END IF;
END $$;

-- ============================================================
-- PaymentStatus enum (safe)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED');
  END IF;
END $$;

-- ============================================================
-- SubscriptionStatus: add EXPIRED value (safe)
-- ============================================================
DO $$ BEGIN
  BEGIN ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'EXPIRED'; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- ============================================================
-- PlanType enum (safe)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanType') THEN
    CREATE TYPE "PlanType" AS ENUM ('SPONSORED_3_DAYS', 'SPONSORED_7_DAYS', 'PREMIUM_15_DAYS', 'PREMIUM_30_DAYS');
  END IF;
END $$;

-- Add PlanType column to Plan if missing (after enum is created)
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'PREMIUM_30_DAYS';

-- ============================================================
-- RequestLog table (create if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS "RequestLog" (
    "id"           TEXT         NOT NULL,
    "method"       TEXT         NOT NULL,
    "path"         TEXT         NOT NULL,
    "statusCode"   INTEGER      NOT NULL,
    "userId"       TEXT,
    "userAgent"    TEXT,
    "ip"           TEXT,
    "duration"     INTEGER      NOT NULL,
    "success"      BOOLEAN      NOT NULL,
    "errorMessage" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- Comment table (create if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Comment" (
    "id"        TEXT         NOT NULL,
    "content"   TEXT         NOT NULL,
    "postId"    TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- Comment foreign keys (safe)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Comment_postId_fkey') THEN
    ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Comment_userId_fkey') THEN
    ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- Indexes (safe)
-- ============================================================
CREATE INDEX IF NOT EXISTS "User_email_idx"           ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_googleId_idx"        ON "User"("googleId");
CREATE INDEX IF NOT EXISTS "User_role_idx"            ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_lastActivityAt_idx"  ON "User"("lastActivityAt");
CREATE INDEX IF NOT EXISTS "Group_status_idx"         ON "Group"("status");
CREATE INDEX IF NOT EXISTS "Group_categoryId_idx"     ON "Group"("categoryId");
CREATE INDEX IF NOT EXISTS "Group_createdById_idx"    ON "Group"("createdById");
CREATE INDEX IF NOT EXISTS "Group_isFeatured_idx"     ON "Group"("isFeatured");
CREATE INDEX IF NOT EXISTS "Membership_userId_idx"    ON "Membership"("userId");
CREATE INDEX IF NOT EXISTS "Membership_groupId_idx"   ON "Membership"("groupId");
CREATE INDEX IF NOT EXISTS "Category_slug_idx"        ON "Category"("slug");
CREATE INDEX IF NOT EXISTS "Plan_type_idx"            ON "Plan"("type");
CREATE INDEX IF NOT EXISTS "Plan_isActive_idx"        ON "Plan"("isActive");
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx"  ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS "Subscription_groupId_idx" ON "Subscription"("groupId");
CREATE INDEX IF NOT EXISTS "Subscription_planId_idx"  ON "Subscription"("planId");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx"  ON "Subscription"("status");
CREATE INDEX IF NOT EXISTS "Subscription_expiresAt_idx" ON "Subscription"("expiresAt");
CREATE INDEX IF NOT EXISTS "Payment_status_idx"       ON "Payment"("status");
CREATE INDEX IF NOT EXISTS "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");
CREATE INDEX IF NOT EXISTS "Post_groupId_idx"         ON "Post"("groupId");
CREATE INDEX IF NOT EXISTS "Post_userId_idx"          ON "Post"("userId");
CREATE INDEX IF NOT EXISTS "Post_status_idx"          ON "Post"("status");
CREATE INDEX IF NOT EXISTS "Post_createdAt_idx"       ON "Post"("createdAt");
CREATE INDEX IF NOT EXISTS "Comment_postId_idx"       ON "Comment"("postId");
CREATE INDEX IF NOT EXISTS "Comment_userId_idx"       ON "Comment"("userId");
CREATE INDEX IF NOT EXISTS "Comment_createdAt_idx"    ON "Comment"("createdAt");
CREATE INDEX IF NOT EXISTS "RequestLog_userId_idx"    ON "RequestLog"("userId");
CREATE INDEX IF NOT EXISTS "RequestLog_path_idx"      ON "RequestLog"("path");
CREATE INDEX IF NOT EXISTS "RequestLog_createdAt_idx" ON "RequestLog"("createdAt");
CREATE INDEX IF NOT EXISTS "RequestLog_success_idx"   ON "RequestLog"("success");

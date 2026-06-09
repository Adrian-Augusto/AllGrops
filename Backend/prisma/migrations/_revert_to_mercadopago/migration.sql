-- Migration: Revert from Stripe to Mercado Pago
-- Remove Stripe columns and add Mercado Pago columns

-- Drop the unique constraint on stripePaymentId
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_stripePaymentId_key";

-- Drop the index on stripePaymentId
DROP INDEX IF EXISTS "Payment_stripePaymentId_idx";

-- Drop Stripe columns
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "stripePaymentId";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "stripeCustomerId";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "customerEmail";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "amount";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "currency";

-- Add Mercado Pago column
ALTER TABLE "Payment" ADD COLUMN "mercadoPagoId" TEXT;

-- Add unique constraint on mercadoPagoId
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_mercadoPagoId_key" UNIQUE ("mercadoPagoId");

-- Migration: Migrate from Mercado Pago to Stripe
-- Remove Mercado Pago columns and add Stripe columns

-- Drop the unique constraint on mercadoPagoId
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_mercadoPagoId_key";

-- Drop the mercadoPagoId column
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "mercadoPagoId";

-- Add Stripe columns
ALTER TABLE "Payment" ADD COLUMN "stripePaymentId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "customerEmail" TEXT;
ALTER TABLE "Payment" ADD COLUMN "amount" DOUBLE PRECISION;
ALTER TABLE "Payment" ADD COLUMN "currency" TEXT DEFAULT 'BRL';

-- Add unique constraint on stripePaymentId
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_stripePaymentId_key" UNIQUE ("stripePaymentId");

-- Create index on stripePaymentId
CREATE INDEX IF NOT EXISTS "Payment_stripePaymentId_idx" ON "Payment"("stripePaymentId");

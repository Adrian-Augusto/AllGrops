-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_groupId_fkey";

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "groupId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

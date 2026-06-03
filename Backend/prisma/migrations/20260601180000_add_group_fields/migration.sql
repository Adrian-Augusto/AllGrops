-- AlterTable
ALTER TABLE "Group" ADD COLUMN "link" TEXT NOT NULL DEFAULT '',
ADD COLUMN "platform" TEXT NOT NULL DEFAULT '',
ADD COLUMN "photoUrl" TEXT NOT NULL DEFAULT '';

-- Update migration to set defaults for existing rows, then remove them
ALTER TABLE "Group" DROP COLUMN "link",
ADD COLUMN "link" TEXT NOT NULL;

ALTER TABLE "Group" DROP COLUMN "platform",
ADD COLUMN "platform" TEXT NOT NULL;

ALTER TABLE "Group" DROP COLUMN "photoUrl",
ADD COLUMN "photoUrl" TEXT NOT NULL;

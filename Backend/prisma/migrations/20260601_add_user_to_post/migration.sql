-- AddForeignKeyConstraint
ALTER TABLE "Post" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'unknown';

-- CreateIndex
CREATE INDEX "Post_userId_idx" ON "Post"("userId");

-- AddForeignKeyConstraint
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

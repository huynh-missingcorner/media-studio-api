/*
  Warnings:

  - You are about to drop the column `resultUrl` on the `MediaGeneration` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrl` on the `MediaGeneration` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Project_googleProjectId_idx";

-- AlterTable
ALTER TABLE "MediaGeneration" DROP COLUMN "resultUrl",
DROP COLUMN "thumbnailUrl";

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "googleProjectId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MediaResult" (
    "id" TEXT NOT NULL,
    "mediaGenerationId" TEXT NOT NULL,
    "resultUrl" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaResult_mediaGenerationId_idx" ON "MediaResult"("mediaGenerationId");

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "Project"("name");

-- AddForeignKey
ALTER TABLE "MediaResult" ADD CONSTRAINT "MediaResult_mediaGenerationId_fkey" FOREIGN KEY ("mediaGenerationId") REFERENCES "MediaGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

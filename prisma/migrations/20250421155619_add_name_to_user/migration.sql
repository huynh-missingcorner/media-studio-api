/*
  Warnings:

  - The `status` column on the `MediaGeneration` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `vertexProjectId` on the `Project` table. All the data in the column will be lost.
  - Added the required column `googleProjectId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- DropIndex
DROP INDEX "Project_vertexProjectId_idx";

-- AlterTable
ALTER TABLE "MediaGeneration" DROP COLUMN "status",
ADD COLUMN     "status" "RequestStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "vertexProjectId",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "googleProjectId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;

-- DropEnum
DROP TYPE "GenerationStatus";

-- CreateIndex
CREATE INDEX "Project_googleProjectId_idx" ON "Project"("googleProjectId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'AUDIO', 'MUSIC', 'VIDEO');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('SUCCESS', 'ERROR', 'IN_PROGRESS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "vertexProjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaGeneration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "resultUrl" TEXT,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_vertexProjectId_idx" ON "Project"("vertexProjectId");

-- CreateIndex
CREATE INDEX "MediaGeneration_userId_idx" ON "MediaGeneration"("userId");

-- CreateIndex
CREATE INDEX "MediaGeneration_projectId_idx" ON "MediaGeneration"("projectId");

-- CreateIndex
CREATE INDEX "MediaGeneration_mediaType_idx" ON "MediaGeneration"("mediaType");

-- CreateIndex
CREATE INDEX "MediaGeneration_createdAt_idx" ON "MediaGeneration"("createdAt");

-- AddForeignKey
ALTER TABLE "MediaGeneration" ADD CONSTRAINT "MediaGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaGeneration" ADD CONSTRAINT "MediaGeneration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

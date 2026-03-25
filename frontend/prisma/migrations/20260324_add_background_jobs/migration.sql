-- CreateTable
CREATE TABLE "background_jobs" (
    "id" TEXT NOT NULL,
    "triggerId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "result" JSONB,
    "log" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "background_jobs_userId_idx" ON "background_jobs"("userId");
CREATE INDEX "background_jobs_triggerId_idx" ON "background_jobs"("triggerId");
CREATE INDEX "background_jobs_instanceId_idx" ON "background_jobs"("instanceId");
CREATE INDEX "background_jobs_status_idx" ON "background_jobs"("status");

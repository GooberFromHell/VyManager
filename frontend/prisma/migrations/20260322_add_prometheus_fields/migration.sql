-- AlterTable
ALTER TABLE "instances" ADD COLUMN "prometheusAuth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "prometheusEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "prometheusPassword" TEXT,
ADD COLUMN "prometheusPort" INTEGER NOT NULL DEFAULT 9273,
ADD COLUMN "prometheusUsername" TEXT;

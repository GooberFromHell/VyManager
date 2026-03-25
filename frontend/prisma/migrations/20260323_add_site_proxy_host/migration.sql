-- AlterTable
ALTER TABLE "sites" ADD COLUMN "proxyHostId" TEXT;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_proxyHostId_fkey" FOREIGN KEY ("proxyHostId") REFERENCES "instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

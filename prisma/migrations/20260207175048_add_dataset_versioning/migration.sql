-- AlterTable
ALTER TABLE "amazon_profiles" ADD COLUMN     "activeDatasetVersionId" TEXT;

-- CreateTable
CREATE TABLE "dataset_versions" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "uploadId" TEXT,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dataset_versions_uploadId_key" ON "dataset_versions"("uploadId");

-- CreateIndex
CREATE INDEX "dataset_versions_profileId_isActive_idx" ON "dataset_versions"("profileId", "isActive");

-- AddForeignKey
ALTER TABLE "dataset_versions" ADD CONSTRAINT "dataset_versions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "amazon_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_versions" ADD CONSTRAINT "dataset_versions_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "report_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

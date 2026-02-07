-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "biddingStrategy" TEXT,
ADD COLUMN     "portfolio" TEXT;

-- CreateTable
CREATE TABLE "report_uploads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "reportMonth" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "campaignCount" INTEGER NOT NULL DEFAULT 0,
    "keywordCount" INTEGER NOT NULL DEFAULT 0,
    "searchTermCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_uploads_userId_idx" ON "report_uploads"("userId");

-- AddForeignKey
ALTER TABLE "report_uploads" ADD CONSTRAINT "report_uploads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

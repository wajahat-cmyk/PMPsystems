/*
  Warnings:

  - You are about to drop the `bulk_action_drafts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bulk_action_items` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bulk_action_drafts" DROP CONSTRAINT "bulk_action_drafts_userId_fkey";

-- DropForeignKey
ALTER TABLE "bulk_action_items" DROP CONSTRAINT "bulk_action_items_draftId_fkey";

-- DropTable
DROP TABLE "bulk_action_drafts";

-- DropTable
DROP TABLE "bulk_action_items";

-- CreateTable
CREATE TABLE "change_sets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "exportedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "change_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_set_items" (
    "id" TEXT NOT NULL,
    "changeSetId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "campaignName" TEXT,
    "adGroupName" TEXT,
    "amazonCampaignId" TEXT,
    "amazonAdGroupId" TEXT,
    "amazonKeywordId" TEXT,
    "matchType" TEXT,
    "changes" JSONB NOT NULL,
    "previousValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_set_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "change_sets_userId_idx" ON "change_sets"("userId");

-- CreateIndex
CREATE INDEX "change_set_items_changeSetId_idx" ON "change_set_items"("changeSetId");

-- AddForeignKey
ALTER TABLE "change_sets" ADD CONSTRAINT "change_sets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_set_items" ADD CONSTRAINT "change_set_items_changeSetId_fkey" FOREIGN KEY ("changeSetId") REFERENCES "change_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

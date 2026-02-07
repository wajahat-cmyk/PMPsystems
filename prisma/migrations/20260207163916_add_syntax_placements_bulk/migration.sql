-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "pdpModifier" DECIMAL(5,2),
ADD COLUMN     "rosModifier" DECIMAL(5,2),
ADD COLUMN     "tosModifier" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "keywords" ADD COLUMN     "syntaxGroup" TEXT;

-- AlterTable
ALTER TABLE "search_terms" ADD COLUMN     "adGroupId" TEXT,
ADD COLUMN     "campaignId" TEXT;

-- CreateTable
CREATE TABLE "placement_metrics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(10,2) NOT NULL,
    "sales" DECIMAL(10,2) NOT NULL,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "ctr" DECIMAL(5,2) NOT NULL,
    "cpc" DECIMAL(10,2) NOT NULL,
    "acos" DECIMAL(5,2) NOT NULL,
    "roas" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_action_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "exportedAt" TIMESTAMP(3),

    CONSTRAINT "bulk_action_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_action_items" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "campaignName" TEXT,
    "changes" JSONB NOT NULL,
    "previousValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_action_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "placement_metrics_date_idx" ON "placement_metrics"("date");

-- CreateIndex
CREATE INDEX "placement_metrics_campaignId_date_idx" ON "placement_metrics"("campaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "placement_metrics_campaignId_placement_date_key" ON "placement_metrics"("campaignId", "placement", "date");

-- CreateIndex
CREATE INDEX "bulk_action_drafts_userId_idx" ON "bulk_action_drafts"("userId");

-- CreateIndex
CREATE INDEX "bulk_action_items_draftId_idx" ON "bulk_action_items"("draftId");

-- CreateIndex
CREATE INDEX "keywords_syntaxGroup_idx" ON "keywords"("syntaxGroup");

-- CreateIndex
CREATE INDEX "search_terms_campaignId_idx" ON "search_terms"("campaignId");

-- CreateIndex
CREATE INDEX "search_terms_adGroupId_idx" ON "search_terms"("adGroupId");

-- AddForeignKey
ALTER TABLE "search_terms" ADD CONSTRAINT "search_terms_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_terms" ADD CONSTRAINT "search_terms_adGroupId_fkey" FOREIGN KEY ("adGroupId") REFERENCES "ad_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_metrics" ADD CONSTRAINT "placement_metrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_action_drafts" ADD CONSTRAINT "bulk_action_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_action_items" ADD CONSTRAINT "bulk_action_items_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "bulk_action_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "dataSource" TEXT NOT NULL DEFAULT 'BULK';

-- AlterTable
ALTER TABLE "amazon_profiles" ADD COLUMN "clientId" TEXT;
ALTER TABLE "amazon_profiles" ADD COLUMN "clientSecret" TEXT;
ALTER TABLE "amazon_profiles" ADD COLUMN "region" TEXT NOT NULL DEFAULT 'NA';

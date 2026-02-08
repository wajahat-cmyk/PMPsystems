-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dataSource" TEXT NOT NULL DEFAULT 'BULK';

-- AlterTable amazon_profiles
ALTER TABLE "amazon_profiles" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "amazon_profiles" ADD COLUMN IF NOT EXISTS "clientSecret" TEXT;
ALTER TABLE "amazon_profiles" ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'NA';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Use DATABASE_URL when available (Railway/production); fall back to local PGlite
  const isLocalDev = !process.env.DATABASE_URL;
  const databaseUrl = process.env.DATABASE_URL
    || 'postgres://postgres:postgres@localhost:51214/template1?sslmode=disable';

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: isLocalDev ? 1 : 10,
    idleTimeoutMillis: isLocalDev ? 1 : 30000,
    connectionTimeoutMillis: isLocalDev ? 0 : 5000,
    ssl: !isLocalDev ? { rejectUnauthorized: false } : undefined,
  });

  pool.on('error', (err) => {
    console.error('pg pool error:', err.message);
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    log: isLocalDev ? ['error', 'warn'] : ['error'],
    adapter,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

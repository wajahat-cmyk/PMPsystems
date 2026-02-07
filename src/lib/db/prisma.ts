import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const isDev = process.env.NODE_ENV !== 'production';
  const databaseUrl = isDev
    ? 'postgres://postgres:postgres@localhost:51214/template1?sslmode=disable'
    : process.env.DATABASE_URL!;

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: isDev ? 1 : 10,                // PGlite needs 1; real PG can handle more
    idleTimeoutMillis: isDev ? 1 : 30000,
    connectionTimeoutMillis: isDev ? 0 : 5000,
    ssl: !isDev ? { rejectUnauthorized: false } : undefined,
  });

  pool.on('error', (err) => {
    console.error('pg pool error:', err.message);
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    log: isDev ? ['error', 'warn'] : ['error'],
    adapter,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

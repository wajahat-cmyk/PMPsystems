import "dotenv/config";
import { defineConfig } from "prisma/config";

// In production (Railway), DATABASE_URL is a standard postgres:// URL.
// In dev, it's the prisma+postgres:// proxy URL from `prisma dev`.
const url = process.env["DATABASE_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});

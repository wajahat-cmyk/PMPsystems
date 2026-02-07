import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env["DATABASE_URL"];

// Debug: show ALL env var names to find where Railway puts DB connection
console.error("[prisma.config] ALL ENV VARS:", Object.keys(process.env).sort().join(", "));
console.error("[prisma.config] DATABASE_URL value:", url ? `SET (length ${url.length})` : "NOT SET");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: url ?? "",
  },
});

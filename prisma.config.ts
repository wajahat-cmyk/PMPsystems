import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env["DATABASE_URL"];

// Debug: help diagnose Railway deployment issues
if (!url) {
  const dbVars = Object.keys(process.env).filter(k => /database|postgres|pg|railway/i.test(k));
  console.error("[prisma.config] DATABASE_URL is NOT SET");
  console.error("[prisma.config] Related env vars:", dbVars.join(", ") || "NONE");
} else {
  console.log("[prisma.config] DATABASE_URL is set (length:", url.length, ")");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: url ?? "",
  },
});

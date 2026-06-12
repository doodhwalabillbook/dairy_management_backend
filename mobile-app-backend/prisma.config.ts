import dotenv from "dotenv";
import path from "path";

// Load the default .env file first (if it exists)
dotenv.config();

// Load correct environment configuration
const nodeEnv = process.env.NODE_ENV || 'local';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`), override: true });

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

import dotenv from "dotenv";
import path from "path";

// 1. Determine NODE_ENV first from the process environment (defaulting to 'local')
const nodeEnv = process.env.NODE_ENV || 'local';

// 2. Load the environment-specific file (e.g. .env.local or .env.development) with override: true
dotenv.config({ path: path.resolve(__dirname, `.env.${nodeEnv}`), override: true });

// 3. Load the default .env file next, but do NOT override already defined process environment variables
dotenv.config({ path: path.resolve(__dirname, '.env'), override: false });

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

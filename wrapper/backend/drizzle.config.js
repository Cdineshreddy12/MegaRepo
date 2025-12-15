import { defineConfig } from 'drizzle-kit';
import * as schema from './src/db/schema/index.js';
import 'dotenv/config';

export default defineConfig({
  schema: './src/db/schema/index.js',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
    search_path: 'public',
  },
  verbose: true,
  strict: true,
});
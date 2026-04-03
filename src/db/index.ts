import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

/**
 * Drizzle ORM client connected to Supabase Postgres via DATABASE_URL.
 * Server-side only — never import from client code.
 *
 * SSL is configured to accept the Supabase certificate chain.
 * In production (Vercel), SSL works natively. Locally, we need
 * rejectUnauthorized: false to handle the pooler's cert chain.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

export const db = drizzle(pool)

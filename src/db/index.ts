import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

/**
 * Drizzle ORM client connected to Supabase Postgres via DATABASE_URL.
 * Server-side only — never import from client code.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(pool)

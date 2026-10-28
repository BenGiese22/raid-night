import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

/**
 * Removes `sslmode` from a Postgres connection string.
 * pg treats `sslmode=require` as `verify-full`, which overrides the `ssl` pool option
 * and rejects the Supabase pooler's certificate chain.
 */
function withoutSslMode(connectionString: string | undefined): string | undefined {
  if (!connectionString) return connectionString
  const url = new URL(connectionString)
  const kept = new URLSearchParams()
  url.searchParams.forEach((value, key) => {
    if (key !== 'sslmode') kept.append(key, value)
  })
  url.search = kept.toString()
  return url.toString()
}

/**
 * Drizzle ORM client connected to Supabase Postgres via DATABASE_URL.
 * Server-side only — never import from client code.
 *
 * The connection is still encrypted, but the Supabase pooler's certificate chain
 * is not verified (rejectUnauthorized: false). This applies locally and on Vercel.
 */
const pool = new Pool({
  connectionString: withoutSslMode(process.env.DATABASE_URL ?? process.env.POSTGRES_URL),
  ssl: {
    rejectUnauthorized: false,
  },
})

export const db = drizzle(pool)

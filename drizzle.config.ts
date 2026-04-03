import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL or POSTGRES_URL')
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
})

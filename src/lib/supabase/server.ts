import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * Server-side Supabase client with service role key.
 * Use in API routes and server components only — never import from client code.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

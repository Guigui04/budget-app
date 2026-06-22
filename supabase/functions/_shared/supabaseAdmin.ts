import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Service-role client — bypasses RLS. Use ONLY in trusted server code. */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}

/** Client scoped to the caller's JWT — respects RLS. */
export function userClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  )
}

/** Resolve the household of the authenticated caller (RLS-safe). */
export async function callerHousehold(authHeader: string): Promise<{ userId: string; householdId: string } | null> {
  const client = userClient(authHeader)
  const { data: auth } = await client.auth.getUser()
  if (!auth.user) return null
  const { data } = await client.from('users').select('household_id').eq('id', auth.user.id).single()
  if (!data?.household_id) return null
  return { userId: auth.user.id, householdId: data.household_id }
}

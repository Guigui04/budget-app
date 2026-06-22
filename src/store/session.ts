import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { demoHousehold, demoUsers } from '@/data/demo'
import type { Household, UserProfile } from '@/types'

type SessionStatus = 'loading' | 'authenticated' | 'anonymous' | 'onboarding'

interface UserRow {
  id: string
  household_id: string | null
  display_name: string | null
  avatar_color: string | null
  push_subscription: unknown | null
}

interface HouseholdRow {
  id: string
  name: string
  created_at: string
}

interface SessionState {
  status: SessionStatus
  user: UserProfile | null
  household: Household | null
  error: string | null
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  signInDemo: () => void
  signOut: () => Promise<void>
  createHousehold: (name: string) => Promise<string>
  joinHousehold: (code: string) => Promise<void>
}

function asMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur est survenue.'
}

function mapUser(row: UserRow, fallbackEmail?: string): UserProfile {
  return {
    id: row.id,
    householdId: row.household_id,
    displayName: row.display_name || fallbackEmail || 'Membre',
    avatarColor: row.avatar_color || '#10b981',
    hasPushSubscription: Boolean(row.push_subscription),
  }
}

function mapHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }
}

async function loadLiveSession(): Promise<Pick<SessionState, 'status' | 'user' | 'household'>> {
  if (!supabase) return { status: 'anonymous', user: null, household: null }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(sessionError.message)
  const authUser = sessionData.session?.user
  if (!authUser) return { status: 'anonymous', user: null, household: null }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, household_id, display_name, avatar_color, push_subscription')
    .eq('id', authUser.id)
    .maybeSingle<UserRow>()

  if (profileError) throw new Error(profileError.message)

  const user = profile
    ? mapUser(profile, authUser.email)
    : {
        id: authUser.id,
        householdId: null,
        displayName: authUser.email ?? 'Membre',
        avatarColor: '#10b981',
        hasPushSubscription: false,
      }

  if (!user.householdId) return { status: 'onboarding', user, household: null }

  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('id, name, created_at')
    .eq('id', user.householdId)
    .single<HouseholdRow>()

  if (householdError) throw new Error(householdError.message)

  return {
    status: 'authenticated',
    user,
    household: mapHousehold(household),
  }
}

export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  user: null,
  household: null,
  error: null,

  initialize: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ status: 'anonymous', user: null, household: null })
      return
    }

    try {
      const next = await loadLiveSession()
      set({ ...next, error: null })
    } catch (error) {
      set({ status: 'anonymous', user: null, household: null, error: asMessage(error) })
    }
  },

  signIn: async (email, password) => {
    set({ error: null })
    if (!isSupabaseConfigured || !supabase) {
      set({ status: 'authenticated', user: demoUsers[0], household: demoHousehold })
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: error.message })
      return
    }

    await useSession.getState().initialize()
  },

  signUp: async (email, password) => {
    set({ error: null })
    if (!isSupabaseConfigured || !supabase) {
      set({ status: 'authenticated', user: demoUsers[0], household: demoHousehold })
      return { needsConfirmation: false }
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      set({ error: error.message })
      throw new Error(error.message)
    }

    // Si la confirmation e-mail est exigée, aucune session n'est ouverte.
    if (!data.session) return { needsConfirmation: true }

    await useSession.getState().initialize()
    return { needsConfirmation: false }
  },

  signInDemo: () => {
    set({ status: 'authenticated', user: demoUsers[0], household: demoHousehold, error: null })
  },

  signOut: async () => {
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut()
    set({ status: 'anonymous', user: null, household: null, error: null })
  },

  createHousehold: async (name) => {
    const cleanName = name.trim()
    if (!cleanName) throw new Error('Choisissez un nom de foyer.')

    if (!isSupabaseConfigured || !supabase) {
      set({ status: 'authenticated', user: demoUsers[0], household: demoHousehold, error: null })
      return demoHousehold.id
    }

    const { data, error } = await supabase.rpc('create_household', { p_name: cleanName })
    if (error) throw new Error(error.message)
    return String(data ?? '')
  },

  joinHousehold: async (code) => {
    const cleanCode = code.trim()
    if (!cleanCode) throw new Error('Saisissez le code reçu.')

    if (!isSupabaseConfigured || !supabase) {
      set({ status: 'authenticated', user: demoUsers[0], household: demoHousehold, error: null })
      return
    }

    const { error } = await supabase.rpc('join_household', { p_code: cleanCode })
    if (error) throw new Error(error.message)
    await useSession.getState().initialize()
  },
}))

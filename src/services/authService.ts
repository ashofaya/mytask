import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

function getSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.',
    )
  }

  return supabase
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<{ user: User | null; session: Session | null }> {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${window.location.origin}/`,
    },
  })

  if (error) {
    throw error
  }

  return { user: data.user, session: data.session }
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: User; session: Session }> {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  if (!data.user || !data.session) {
    throw new Error('Supabase tidak mengembalikan sesi pengguna.')
  }

  return { user: data.user, session: data.session }
}

export async function signOutFromSupabase(): Promise<void> {
  const { error } = await getSupabase().auth.signOut()

  if (error) {
    throw error
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) {
    throw error
  }
}

export async function setNewPassword(password: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({ password })

  if (error) {
    throw error
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await getSupabase().auth.getSession()

  if (error) {
    throw error
  }

  return data.session
}

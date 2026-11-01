import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { ProfileUpdate } from '../types/database'

export interface UserProfile {
  id: string
  display_name: string
  timezone: string
  notifications_enabled: boolean
}

export async function getUserProfile(user: User): Promise<UserProfile> {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, timezone, notifications_enabled')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Profil pengguna belum tersedia. Coba masuk kembali.')
  }

  return data
}

export async function updateUserProfile(
  user: User,
  input: ProfileUpdate,
): Promise<UserProfile> {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', user.id)
    .select('id, display_name, timezone, notifications_enabled')
    .maybeSingle()

  if (error) {
    throw error
  }
  if (!data) {
    throw new Error('Profil tidak ditemukan atau tidak dapat diakses.')
  }

  return data
}

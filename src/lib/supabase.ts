import {
  createClient,
  type SupabaseClient,
  type SupportedStorage,
} from '@supabase/supabase-js'
import { getEnvConfig, type EnvironmentValidation } from './env'

const REMEMBER_SESSION_KEY = 'mytask:remember-session'

export function getRememberSession(): boolean {
  return localStorage.getItem(REMEMBER_SESSION_KEY) !== 'false'
}

export function setRememberSession(remember: boolean): void {
  localStorage.setItem(REMEMBER_SESSION_KEY, String(remember))

  const config = getEnvConfig()
  if (!config.success) {
    return
  }

  const projectReference = new URL(config.data.VITE_SUPABASE_URL).hostname.split('.')[0]
  const authStorageKey = `sb-${projectReference}-auth-token`
  const inactiveStorage = remember ? sessionStorage : localStorage
  inactiveStorage.removeItem(authStorageKey)
}

const authStorage: SupportedStorage = {
  getItem(key) {
    return (getRememberSession() ? localStorage : sessionStorage).getItem(key)
  },
  setItem(key, value) {
    ;(getRememberSession() ? localStorage : sessionStorage).setItem(key, value)
  },
  removeItem(key) {
    ;(getRememberSession() ? localStorage : sessionStorage).removeItem(key)
  },
}

export function createSupabaseClient(
  config: EnvironmentValidation = getEnvConfig(),
): SupabaseClient | null {
  if (!config.success) {
    return null
  }

  return createClient(
    config.data.VITE_SUPABASE_URL,
    config.data.VITE_SUPABASE_ANON_KEY,
    { auth: { storage: authStorage } },
  )
}

export const supabase = createSupabaseClient()

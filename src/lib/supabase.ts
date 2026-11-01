import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getEnvConfig, type EnvironmentValidation } from './env'

export function createSupabaseClient(
  config: EnvironmentValidation = getEnvConfig(),
): SupabaseClient | null {
  if (!config.success) {
    return null
  }

  return createClient(
    config.data.VITE_SUPABASE_URL,
    config.data.VITE_SUPABASE_ANON_KEY,
  )
}

export const supabase = createSupabaseClient()

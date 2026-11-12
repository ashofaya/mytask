import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateEnvironment } from './env'
import {
  createSupabaseClient,
  getRememberSession,
  setRememberSession,
} from './supabase'

describe('createSupabaseClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    localStorage.clear()
  })

  it('creates a client using valid public Supabase configuration', () => {
    const config = validateEnvironment({
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_unit_test_only',
    })

    const client = createSupabaseClient(config)

    expect(client).not.toBeNull()
    expect(client?.auth).toBeDefined()
    expect(client?.from('profiles')).toBeDefined()
  })

  it('does not create a client when configuration is invalid', () => {
    const config = validateEnvironment({})

    expect(createSupabaseClient(config)).toBeNull()
  })

  it('uses the environment getter when no configuration is passed', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    expect(createSupabaseClient()).toBeNull()
  })

  it('stores the remember-session choice without storing credentials there', () => {
    localStorage.clear()

    expect(getRememberSession()).toBe(true)
    setRememberSession(false)
    expect(getRememberSession()).toBe(false)
    setRememberSession(true)
    expect(getRememberSession()).toBe(true)
    expect(localStorage.getItem('mytask:remember-session')).toBe('true')
  })
})

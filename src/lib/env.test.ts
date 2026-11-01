import { describe, expect, it } from 'vitest'
import { validateEnvironment } from './env'

const validEnvironment = {
  VITE_SUPABASE_URL: 'http://localhost:54321',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_unit_test_only',
}

describe('validateEnvironment', () => {
  it('accepts a valid Supabase URL and publishable key', () => {
    const result = validateEnvironment(validEnvironment)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validEnvironment)
    }
  })

  it('rejects empty configuration values with readable errors', () => {
    const result = validateEnvironment({
      VITE_SUPABASE_URL: ' ',
      VITE_SUPABASE_ANON_KEY: '',
    })

    expect(result.success).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'VITE_SUPABASE_URL: belum diisi.',
        'VITE_SUPABASE_ANON_KEY: belum diisi.',
      ]),
    )
  })

  it('rejects missing configuration values', () => {
    const result = validateEnvironment({})

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(2)
  })

  it('rejects malformed or unsupported Supabase URLs', () => {
    const result = validateEnvironment({
      ...validEnvironment,
      VITE_SUPABASE_URL: 'not-a-url',
    })

    expect(result.success).toBe(false)
    expect(result.errors).toContain(
      'VITE_SUPABASE_URL: harus berupa URL HTTP atau HTTPS yang valid.',
    )
  })

  it('rejects a service role key', () => {
    const result = validateEnvironment({
      ...validEnvironment,
      VITE_SUPABASE_ANON_KEY: 'sb_secret_do_not_use',
    })

    expect(result.success).toBe(false)
    expect(result.errors).toContain(
      'VITE_SUPABASE_ANON_KEY: harus berupa publishable key atau anon key Supabase. Jangan gunakan service_role atau secret key.',
    )
  })
})

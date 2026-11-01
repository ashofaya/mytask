import { z } from 'zod'

const isSafePublicKey = (value: string): boolean => {
  if (value.startsWith('sb_secret_')) {
    return false
  }

  if (value.startsWith('sb_publishable_')) {
    return /^sb_publishable_[A-Za-z0-9_-]+$/.test(value)
  }

  const [header, payload, signature, ...rest] = value.split('.')

  if (!header || !payload || !signature || rest.length > 0) {
    return false
  }

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    const claims: unknown = JSON.parse(decodedPayload)

    return (
      typeof claims === 'object' &&
      claims !== null &&
      'role' in claims &&
      claims.role === 'anon'
    )
  } catch {
    return false
  }
}

const environmentSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .trim()
    .min(1, 'belum diisi.')
    .refine(
      (value) => {
        if (!value) {
          return true
        }

        try {
          const url = new URL(value)
          return url.protocol === 'https:' || url.protocol === 'http:'
        } catch {
          return false
        }
      },
      'harus berupa URL HTTP atau HTTPS yang valid.',
    ),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .trim()
    .min(1, 'belum diisi.')
    .refine(
      (value) => !value || isSafePublicKey(value),
      'harus berupa publishable key atau anon key Supabase. Jangan gunakan service_role atau secret key.',
    ),
})

export type SupabaseEnvironment = z.infer<typeof environmentSchema>

export type EnvironmentValidation =
  | { success: true; data: SupabaseEnvironment; errors: [] }
  | { success: false; data: null; errors: string[] }

export function validateEnvironment(
  input: Record<string, unknown>,
): EnvironmentValidation {
  const result = environmentSchema.safeParse(input)

  if (result.success) {
    return { success: true, data: result.data, errors: [] }
  }

  const errors = result.error.issues.map((issue) => {
    const field = issue.path[0]
    const label =
      field === 'VITE_SUPABASE_URL'
        ? 'VITE_SUPABASE_URL'
        : field === 'VITE_SUPABASE_ANON_KEY'
          ? 'VITE_SUPABASE_ANON_KEY'
          : 'Konfigurasi environment'

    return `${label}: ${issue.message}`
  })

  return { success: false, data: null, errors }
}

export function getEnvConfig(): EnvironmentValidation {
  return validateEnvironment({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  })
}

export const environment = getEnvConfig()

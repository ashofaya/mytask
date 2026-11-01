import { describe, expect, it } from 'vitest'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './authValidation'

describe('authentication form validation', () => {
  it('normalizes valid email addresses', () => {
    expect(
      loginSchema.parse({ email: '  USER@example.com ', password: 'pass' }),
    ).toEqual({ email: 'user@example.com', password: 'pass' })
  })

  it('rejects invalid email and missing login password', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '' })

    expect(result.success).toBe(false)
  })

  it('requires a display name and an eight-character password for registration', () => {
    const result = registerSchema.safeParse({
      displayName: '  ',
      email: 'user@example.com',
      password: 'short',
      confirmPassword: 'short',
    })

    expect(result.success).toBe(false)
  })

  it('requires matching passwords for registration and password reset', () => {
    const registration = registerSchema.safeParse({
      displayName: 'User',
      email: 'user@example.com',
      password: 'password-123',
      confirmPassword: 'password-456',
    })
    const reset = resetPasswordSchema.safeParse({
      password: 'password-123',
      confirmPassword: 'password-456',
    })

    expect(registration.success).toBe(false)
    expect(reset.success).toBe(false)
  })

  it('validates the email used for a recovery request', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'bad-email' }).success).toBe(false)
    expect(forgotPasswordSchema.safeParse({ email: 'user@example.com' }).success).toBe(
      true,
    )
  })
})

import { describe, expect, it } from 'vitest'
import {
  decryptVaultPassword,
  encryptVaultPassword,
  generateStrongPassword,
  hashMasterPin,
  isValidMasterPin,
  verifyMasterPin,
} from './vaultCrypto'

describe('vaultCrypto', () => {
  it('validates 6-digit Master PIN strictly', () => {
    expect(isValidMasterPin('123456')).toBe(true)
    expect(isValidMasterPin('12345')).toBe(false)
    expect(isValidMasterPin('12345a')).toBe(false)
  })

  it('hashes and verifies a 6-digit Master PIN via SHA-256', async () => {
    const hash = await hashMasterPin('654321')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).not.toBe('654321')

    await expect(verifyMasterPin('654321', hash)).resolves.toBe(true)
    await expect(verifyMasterPin('111111', hash)).resolves.toBe(false)
  })

  it('encrypts and decrypts password with AES-GCM client-side', async () => {
    const pin = '246810'
    const userId = '00000000-0000-4000-8000-000000000001'
    const secret = 'Sup3rS3cr3t!Pass#2026'

    const encrypted = await encryptVaultPassword(secret, pin, userId)
    expect(encrypted).not.toContain(secret)
    expect(encrypted.split(':')).toHaveLength(2)

    const decrypted = await decryptVaultPassword(encrypted, pin, userId)
    expect(decrypted).toBe(secret)

    await expect(
      decryptVaultPassword(encrypted, '999999', userId),
    ).rejects.toThrow()
  })

  it('generates a strong 16-character password with upper, lower, digit, and symbol', () => {
    const password = generateStrongPassword(16)
    expect(password).toHaveLength(16)
    expect(password).toMatch(/[A-Z]/)
    expect(password).toMatch(/[a-z]/)
    expect(password).toMatch(/[0-9]/)
    expect(password).toMatch(/[^A-Za-z0-9]/)
  })
})

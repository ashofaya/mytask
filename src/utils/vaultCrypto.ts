const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function isValidMasterPin(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

/**
 * Menghasilkan hash SHA-256 (hex) dari 6-digit Master PIN menggunakan Web Crypto API.
 */
export async function hashMasterPin(pin: string): Promise<string> {
  if (!isValidMasterPin(pin)) {
    throw new Error('Master PIN harus terdiri dari 6 digit angka.')
  }
  const data = encoder.encode(pin)
  const digestBuffer = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digestBuffer))
}

export async function verifyMasterPin(
  inputPin: string,
  expectedHash: string,
): Promise<boolean> {
  if (!isValidMasterPin(inputPin) || !expectedHash) {
    return false
  }
  const inputHash = await hashMasterPin(inputPin)
  return inputHash === expectedHash
}

/**
 * Menurunkan kunci AES-GCM 256-bit dari Master PIN dan ID pengguna di memori.
 */
export async function deriveVaultKey(
  pin: string,
  userId: string,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  const salt = encoder.encode(`mytask-vault-salt:${userId}`)

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Mengenkripsi password plain-text menggunakan AES-GCM (Web Crypto API).
 * Format output: `<base64(iv)>:<base64(ciphertext)>`
 */
export async function encryptVaultPassword(
  plainText: string,
  pin: string,
  userId: string,
): Promise<string> {
  if (!plainText) {
    throw new Error('Password tidak boleh kosong.')
  }
  const key = await deriveVaultKey(pin, userId)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText),
  )

  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encryptedBuffer))}`
}

/**
 * Mendekripsi `encrypted_password` menggunakan AES-GCM di memori browser.
 */
export async function decryptVaultPassword(
  encryptedPayload: string,
  pin: string,
  userId: string,
): Promise<string> {
  const parts = encryptedPayload.split(':')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Format data terenkripsi tidak valid.')
  }

  const [ivBase64, cipherBase64] = parts
  const iv = base64ToBytes(ivBase64)
  const cipherBytes = base64ToBytes(cipherBase64)
  const key = await deriveVaultKey(pin, userId)

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    cipherBytes as BufferSource,
  )

  return decoder.decode(decryptedBuffer)
}

/**
 * Menghasilkan password kuat acak sepanjang 16 karakter (huruf besar, kecil, angka, simbol).
 */
export function generateStrongPassword(length = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%^&*()-_=+[]{}?'
  const allChars = upper + lower + digits + symbols

  const randomValues = crypto.getRandomValues(new Uint32Array(length))
  const chars: string[] = [
    upper[randomValues[0] % upper.length],
    lower[randomValues[1] % lower.length],
    digits[randomValues[2] % digits.length],
    symbols[randomValues[3] % symbols.length],
  ]

  for (let i = 4; i < length; i += 1) {
    chars.push(allChars[randomValues[i] % allChars.length])
  }

  // Fisher-Yates shuffle dengan nilai acak kriptografis
  const shuffleRandom = crypto.getRandomValues(new Uint32Array(chars.length))
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = shuffleRandom[i] % (i + 1)
    const temp = chars[i]
    chars[i] = chars[j]
    chars[j] = temp
  }

  return chars.join('')
}

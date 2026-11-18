import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotesPage } from './NotesPage'
import { encryptVaultPassword, hashMasterPin } from '../utils/vaultCrypto'

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  updateProfile: vi.fn(),
  listVaultNotes: vi.fn(),
  createVaultNote: vi.fn(),
  updateVaultNote: vi.fn(),
  deleteVaultNote: vi.fn(),
}))

vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.useAuth }))
vi.mock('../services/vaultService', () => ({
  listVaultNotes: mocks.listVaultNotes,
  createVaultNote: mocks.createVaultNote,
  updateVaultNote: mocks.updateVaultNote,
  deleteVaultNote: mocks.deleteVaultNote,
}))

describe('NotesPage', () => {
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.updateProfile.mockResolvedValue(undefined)
    mocks.listVaultNotes.mockResolvedValue([])
  })

  it('prompts a new user without vault_pin_hash to set up a 6-digit Master PIN', async () => {
    const user = userEvent.setup()
    mocks.useAuth.mockReturnValue({
      user: { id: userId, email: 'user@example.com' },
      profile: {
        id: userId,
        display_name: 'Nadia',
        timezone: 'Asia/Jakarta',
        notifications_enabled: true,
        vault_pin_hash: null,
      },
      updateProfile: mocks.updateProfile,
    })

    render(
      <MemoryRouter initialEntries={['/notes']}>
        <NotesPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Buat Master PIN' }),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Master PIN Baru (6 Digit)'), '123456')
    await user.type(screen.getByLabelText('Konfirmasi Master PIN'), '123456')
    await user.click(
      screen.getByRole('button', { name: /Simpan Master PIN & Buka/i }),
    )

    const expectedHash = await hashMasterPin('123456')
    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        vault_pin_hash: expectedHash,
      })
    })

    expect(
      await screen.findByRole('heading', { name: 'Catatan & Akun' }),
    ).toBeInTheDocument()
  })

  it('requires PIN verification before unlocking and decrypts password on demand', async () => {
    const user = userEvent.setup()
    const pin = '654321'
    const pinHash = await hashMasterPin(pin)
    const encryptedPassword = await encryptVaultPassword(
      'MyCloudSecret#99',
      pin,
      userId,
    )

    mocks.useAuth.mockReturnValue({
      user: { id: userId, email: 'user@example.com' },
      profile: {
        id: userId,
        display_name: 'Nadia',
        timezone: 'Asia/Jakarta',
        notifications_enabled: true,
        vault_pin_hash: pinHash,
      },
      updateProfile: mocks.updateProfile,
    })

    mocks.listVaultNotes.mockResolvedValue([
      {
        id: 'note-1',
        user_id: userId,
        service_name: 'AWS Console',
        category: 'Dev/Cloud',
        email_or_username: 'devops@example.com',
        encrypted_password: encryptedPassword,
        extra_notes: 'Backup code: 1122-3344',
        created_at: '2026-11-18T00:00:00Z',
        updated_at: '2026-11-18T00:00:00Z',
      },
    ])

    render(
      <MemoryRouter initialEntries={['/notes']}>
        <NotesPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Brankas Catatan Terkunci' }),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Master PIN (6 Digit)'), pin)
    await user.click(screen.getByRole('button', { name: /Buka Catatan/i }))

    expect(await screen.findByText('AWS Console')).toBeInTheDocument()
    expect(screen.getByText('••••••••')).toBeInTheDocument()

    // Lihat password (dekripsi di memori)
    await user.click(
      screen.getByRole('button', { name: 'Lihat password AWS Console' }),
    )
    expect(await screen.findByText('MyCloudSecret#99')).toBeInTheDocument()

    // Kunci Sekarang
    await user.click(screen.getByRole('button', { name: /Kunci Sekarang/i }))
    expect(
      await screen.findByRole('heading', { name: 'Brankas Catatan Terkunci' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('MyCloudSecret#99')).not.toBeInTheDocument()
  })
})

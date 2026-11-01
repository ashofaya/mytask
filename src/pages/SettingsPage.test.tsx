import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsPage } from './SettingsPage'

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  updateProfile: vi.fn(),
  updatePassword: vi.fn(),
  requestPermission: vi.fn(),
}))
vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.useAuth }))

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.updateProfile.mockResolvedValue(undefined)
    mocks.updatePassword.mockResolvedValue(undefined)
    mocks.requestPermission.mockResolvedValue('granted')
    mocks.useAuth.mockReturnValue({
      user: { email: 'person@example.com' },
      profile: {
        id: 'user-1',
        display_name: 'Nadia',
        timezone: 'Asia/Jakarta',
        notifications_enabled: true,
      },
      profileError: null,
      updateProfile: mocks.updateProfile,
      updatePassword: mocks.updatePassword,
    })
  })

  function renderSettings() {
    return render(
      <MemoryRouter>
        <Routes>
          <Route element={<Outlet context={{
            permission: 'default',
            error: null,
            requestPermission: mocks.requestPermission,
          }} />}>
            <Route path="/" element={<SettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
  }

  it('saves profile and notification preferences through the profile service boundary', async () => {
    const user = userEvent.setup()
    renderSettings()
    await user.clear(screen.getByLabelText('Nama tampilan'))
    await user.type(screen.getByLabelText('Nama tampilan'), 'New Name')
    await user.click(screen.getByLabelText(/Aktifkan preferensi notifikasi/))
    await user.click(screen.getByRole('button', { name: 'Simpan profil' }))

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        display_name: 'New Name',
        notifications_enabled: false,
      })
    })
    expect(await screen.findByText('Profil dan preferensi berhasil disimpan.')).toBeInTheDocument()
  })

  it('requests browser permission only from the explicit settings action', async () => {
    renderSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Minta izin notifikasi' }))
    await waitFor(() => expect(mocks.requestPermission).toHaveBeenCalledOnce())
    expect(await screen.findByText(/Izin notifikasi diberikan/)).toBeInTheDocument()
    expect(screen.getByText(/tidak dijadwalkan saat browser ditutup/)).toBeInTheDocument()
  })
})

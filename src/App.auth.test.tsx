import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import App from './App'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  from: vi.fn(),
  setRememberSession: vi.fn(),
}))
const taskMocks = vi.hoisted(() => ({
  useTaskData: vi.fn(),
}))

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: authMocks,
    from: authMocks.from,
  },
  getRememberSession: () => true,
  setRememberSession: authMocks.setRememberSession,
}))
vi.mock('./hooks/useTaskData', () => taskMocks)

const testUser: User = {
  id: '00000000-0000-4000-8000-000000000001',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { display_name: 'Test User' },
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00.000Z',
  email: 'user@example.com',
  role: 'authenticated',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_anonymous: false,
}

const testSession: Session = {
  access_token: 'unit-test-access-token',
  refresh_token: 'unit-test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: testUser,
}

let authListener:
  | ((event: AuthChangeEvent, session: Session | null) => void)
  | undefined

function setSession(session: Session | null) {
  authMocks.getSession.mockResolvedValue({
    data: { session },
    error: null,
  })
}

function setupProfileQuery() {
  const profileQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  }
  profileQuery.select.mockReturnValue(profileQuery)
  profileQuery.eq.mockReturnValue(profileQuery)
  profileQuery.maybeSingle.mockResolvedValue({
    data: {
      id: testUser.id,
      display_name: 'Test User',
      timezone: 'Asia/Jakarta',
      notifications_enabled: true,
    },
    error: null,
  })
  const recurringQuery = {
    select: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
  }
  recurringQuery.select.mockReturnValue(recurringQuery)
  recurringQuery.is.mockReturnValue(recurringQuery)
  recurringQuery.order.mockResolvedValue({ data: [], error: null })
  authMocks.from.mockImplementation((table: string) =>
    table === 'profiles' ? profileQuery : recurringQuery,
  )
}

describe('authentication routes and session state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    taskMocks.useTaskData.mockReturnValue({
      tasks: [],
      categories: [],
      loading: false,
      error: null,
      reload: vi.fn(),
      addTask: vi.fn(),
      editTask: vi.fn(),
      changeStatus: vi.fn(),
      removeTask: vi.fn(),
    })
    window.history.replaceState({}, '', '/')
    authListener = undefined
    setSession(null)
    setupProfileQuery()
    authMocks.onAuthStateChange.mockImplementation(
      (
        callback: (event: AuthChangeEvent, session: Session | null) => void,
      ) => {
        authListener = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
    )
    authMocks.signUp.mockResolvedValue({
      data: { user: testUser, session: null },
      error: null,
    })
    authMocks.signInWithPassword.mockResolvedValue({
      data: { user: testUser, session: testSession },
      error: null,
    })
    authMocks.signOut.mockResolvedValue({ error: null })
    authMocks.resetPasswordForEmail.mockResolvedValue({ error: null })
    authMocks.updateUser.mockResolvedValue({ error: null })
  })

  it('redirects unauthenticated users away from the protected home route', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Halo, Selamat Datang Kembali!' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/akun terhubung/i)).not.toBeInTheDocument()
  })

  it('restores a persisted session before rendering private content', async () => {
    setSession(testSession)
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Halo, selamat datang di My Task' })).toBeInTheDocument()
    expect(screen.getAllByText('Test User').length).toBeGreaterThan(0)
    expect(authMocks.from).toHaveBeenCalledWith('profiles')
  })

  it('opens the task form at the new-task route', async () => {
    setSession(testSession)
    window.history.replaceState({}, '', '/tasks/new')
    render(<App />)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Buat tugas' })).toBeInTheDocument()
  })

  it('signs in and shows only a generic credential error on failure', async () => {
    const user = userEvent.setup()
    authMocks.signInWithPassword.mockImplementation(async () => {
      authListener?.('SIGNED_IN', testSession)
      return {
        data: { user: testUser, session: testSession },
        error: null,
      }
    })
    render(<App />)

    const email = await screen.findByLabelText('Email')
    await user.type(email, 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'password-123')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))

    await waitFor(() => {
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password-123',
      })
    })
    expect(
      await screen.findByRole('heading', { name: 'Halo, selamat datang di My Task' }),
    ).toBeInTheDocument()
  })

  it('uses the remember-me choice to select session persistence', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/login')
    render(<App />)

    await user.type(await screen.findByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'password-123')
    await user.click(screen.getByRole('checkbox', { name: 'Ingat saya' }))
    await user.click(screen.getByRole('button', { name: 'Masuk' }))

    await waitFor(() => {
      expect(authMocks.setRememberSession).toHaveBeenCalledWith(false)
    })
    expect(authMocks.signInWithPassword).toHaveBeenCalledOnce()
  })

  it('shows a generic login failure for unknown emails or incorrect passwords', async () => {
    const user = userEvent.setup()
    authMocks.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('specific server detail'),
    })
    window.history.replaceState({}, '', '/login')
    render(<App />)

    await user.type(await screen.findByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))

    expect(
      await screen.findByText(
        'Email atau password tidak sesuai. Periksa kembali lalu coba lagi.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('specific server detail')).not.toBeInTheDocument()
  })

  it('validates registration confirmation before calling Supabase', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/register')
    render(<App />)

    await user.type(await screen.findByLabelText('Nama'), 'Test User')
    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'password-123')
    await user.type(screen.getByLabelText('Ulangi password'), 'different-123')
    await user.click(screen.getByRole('button', { name: 'Daftar' }))

    expect(await screen.findByText('Konfirmasi password tidak sama.')).toBeInTheDocument()
    expect(authMocks.signUp).not.toHaveBeenCalled()
  })

  it('registers through Supabase and explains email confirmation', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/register')
    render(<App />)

    await user.type(await screen.findByLabelText('Nama'), 'Test User')
    await user.type(screen.getByLabelText('Email'), 'USER@example.com')
    await user.type(screen.getByLabelText('Password'), 'password-123')
    await user.type(screen.getByLabelText('Ulangi password'), 'password-123')
    await user.click(screen.getByRole('button', { name: 'Daftar' }))

    expect(
      await screen.findByText(/akun berhasil dibuat\. periksa email/i),
    ).toBeInTheDocument()
    expect(authMocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        password: 'password-123',
        options: expect.objectContaining({
          data: { display_name: 'Test User' },
        }),
      }),
    )
  })

  it('requests recovery without revealing whether the email exists', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/forgot-password')
    render(<App />)

    await user.type(await screen.findByLabelText('Email'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: 'Kirim tautan pemulihan' }))

    expect(
      await screen.findByText(/jika email tersebut terdaftar/i),
    ).toBeInTheDocument()
    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    )
  })

  it('updates the password only within a recovery session', async () => {
    const user = userEvent.setup()
    setSession(testSession)
    window.history.replaceState({}, '', '/reset-password#type=recovery')
    render(<App />)

    await user.type(await screen.findByLabelText('Password baru'), 'updated-password')
    await user.type(screen.getByLabelText('Ulangi password baru'), 'updated-password')
    await user.click(screen.getByRole('button', { name: 'Simpan password baru' }))

    await waitFor(() => {
      expect(authMocks.updateUser).toHaveBeenCalledWith({
        password: 'updated-password',
      })
    })
    expect(
      await screen.findByRole('heading', { name: 'Halo, selamat datang di My Task' }),
    ).toBeInTheDocument()
  })

  it('does not update a password when the recovery link is no longer valid', async () => {
    const user = userEvent.setup()
    setSession(testSession)
    window.history.replaceState({}, '', '/reset-password#type=recovery')
    authMocks.updateUser.mockResolvedValue({
      error: new Error('specific recovery token detail'),
    })
    render(<App />)

    await user.type(await screen.findByLabelText('Password baru'), 'updated-password')
    await user.type(screen.getByLabelText('Ulangi password baru'), 'updated-password')
    await user.click(screen.getByRole('button', { name: 'Simpan password baru' }))

    expect(
      await screen.findByText(/tautan pemulihan tidak valid atau kedaluwarsa/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('specific recovery token detail')).not.toBeInTheDocument()
  })

  it('signs out and returns the user to the login page', async () => {
    const user = userEvent.setup()
    setSession(testSession)
    authMocks.signOut.mockImplementation(async () => {
      authListener?.('SIGNED_OUT', null)
      return { error: null }
    })
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Keluar' }))

    expect(await screen.findByRole('heading', { name: 'Halo, Selamat Datang Kembali!' })).toBeInTheDocument()
    expect(authMocks.signOut).toHaveBeenCalledOnce()
  })
})

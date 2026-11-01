import { useState } from 'react'
import {
  CheckCircle2,
  ClipboardCheck,
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Repeat2,
  Settings,
  TriangleAlert,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { useAuth } from '../../hooks/useAuth'
import { useReminderScheduler } from '../../hooks/useReminderScheduler'
import { useRecurringBootstrap } from '../../hooks/useRecurringBootstrap'
import { LoadingState } from '../common/DataState'

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'Semua task', icon: ListTodo },
  { to: '/overdue', label: 'Overdue', icon: TriangleAlert },
  { to: '/completed', label: 'Completed', icon: CheckCircle2 },
  { to: '/calendar', label: 'Kalender', icon: CalendarDays },
  { to: '/categories', label: 'Kategori', icon: ClipboardCheck },
  { to: '/recurring', label: 'Task berulang', icon: Repeat2 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Navigasi utama" className="space-y-1">
      {navigation.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`
          }
        >
          <Icon aria-hidden="true" className="size-[18px]" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const reminder = useReminderScheduler()
  const recurring = useRecurringBootstrap()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  async function handleSignOut() {
    setSignOutError(null)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      setSignOutError('Tidak dapat keluar saat ini. Periksa koneksi lalu coba lagi.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white px-4 py-6 lg:block">
        <Brand />
        <div className="mt-10">
          <NavigationLinks />
        </div>
        <div className="absolute inset-x-4 bottom-5 rounded-xl bg-slate-50 p-3">
          <p className="truncate text-sm font-medium text-slate-800">
            {profile?.display_name || user?.email}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Akun pribadi</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <span className="hidden text-sm text-slate-500 lg:inline">
              Selamat datang, {profile?.display_name || user?.email}
            </span>
          </div>
          <Button
            variant="ghost"
            className="gap-2 text-slate-600"
            onClick={() => void handleSignOut()}
          >
            <LogOut aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </header>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden">
            <div className="h-full w-[min(19rem,85vw)] bg-white p-4 shadow-xl">
              <div className="mb-8 flex items-center justify-between">
                <Brand />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Tutup navigasi"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <NavigationLinks onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-7 sm:py-9">
          {recurring.error && (
            <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {recurring.error}
            </div>
          )}
          {reminder.error && (
            <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {reminder.error}
            </div>
          )}
          {signOutError && (
            <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              {signOutError}
            </div>
          )}
          {recurring.loading ? (
            <LoadingState label="Memeriksa task berulang…" />
          ) : (
            <Outlet context={reminder} />
          )}
        </main>
      </div>
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
        <ClipboardCheck aria-hidden="true" className="size-5" />
      </span>
      {!compact && (
        <span>
          <span className="block font-semibold tracking-tight">MyTask</span>
          <span className="block text-xs text-slate-500">Personal Task Manager</span>
        </span>
      )}
    </div>
  )
}

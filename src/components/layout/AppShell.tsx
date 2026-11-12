import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ClipboardCheck,
  CalendarDays,
  FolderKanban,
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
import { countOverdueTasks } from '../../services/taskService'
import { useReminderScheduler } from '../../hooks/useReminderScheduler'
import { useRecurringBootstrap } from '../../hooks/useRecurringBootstrap'
import { LoadingState } from '../common/DataState'
import { ThemeToggleButton } from '../theme/ThemeToggleButton'

const navigation = [
  { to: '/', label: 'Ringkasan', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'Semua tugas', icon: ListTodo },
  { to: '/overdue', label: 'Terlambat', icon: TriangleAlert },
  { to: '/completed', label: 'Selesai', icon: CheckCircle2 },
  { to: '/calendar', label: 'Kalender', icon: CalendarDays },
  { to: '/categories', label: 'Kategori', icon: FolderKanban },
  { to: '/recurring', label: 'Tugas berulang', icon: Repeat2 },
  { to: '/settings', label: 'Pengaturan', icon: Settings },
]

function NavigationLinks({
  onNavigate,
  overdueCount,
}: {
  onNavigate?: () => void
  overdueCount: number
}) {
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
          <span className="flex-1">{label}</span>
          {to === '/overdue' && overdueCount > 0 && (
            <span className="min-w-5 rounded-full bg-rose-100 px-1.5 py-0.5 text-center text-xs font-semibold text-rose-800 dark:bg-rose-900/60 dark:text-rose-100">
              {overdueCount}
            </span>
          )}
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
  const [overdueCount, setOverdueCount] = useState(0)
  const [overdueCountError, setOverdueCountError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const refreshOverdueCount = () => {
      void countOverdueTasks()
        .then((count) => {
          if (active) {
            setOverdueCount(count)
            setOverdueCountError(null)
          }
        })
        .catch(() => {
          if (active) {
            setOverdueCountError('Jumlah tugas terlambat belum dapat dimuat.')
          }
        })
    }

    refreshOverdueCount()
    window.addEventListener('mytask:tasks-updated', refreshOverdueCount)
    return () => {
      active = false
      window.removeEventListener('mytask:tasks-updated', refreshOverdueCount)
    }
  }, [])

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
    <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white px-4 py-6 lg:block">
        <Brand />
        <div className="mt-10">
          <NavigationLinks overdueCount={overdueCount} />
        </div>
        <div className="absolute inset-x-4 bottom-5 rounded-xl bg-slate-50 p-3">
          <p className="truncate text-sm font-medium text-slate-800">
            {profile?.display_name || user?.email}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">Akun pribadi</p>
          <button
            type="button"
            aria-label="Keluar dari akun"
            className="mt-3 inline-flex items-center gap-2 rounded-md text-sm font-medium text-slate-700 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            onClick={() => void handleSignOut()}
          >
            <LogOut aria-hidden="true" className="size-4" />
            Keluar
          </button>
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
              Halo, {profile?.display_name || user?.email}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggleButton />
            <Button
              variant="ghost"
              className="gap-2 text-slate-600 lg:hidden"
              onClick={() => void handleSignOut()}
            >
              <LogOut aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
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
              <NavigationLinks
                onNavigate={() => setMobileMenuOpen(false)}
                overdueCount={overdueCount}
              />
            </div>
          </div>
        )}

        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-7 sm:py-9">
          {overdueCountError && (
            <p role="status" className="mb-4 text-sm text-amber-800 dark:text-amber-200">
              {overdueCountError}
            </p>
          )}
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
          <span className="block font-semibold tracking-tight">My Task</span>
          <span className="block text-xs text-slate-500">Pengelola tugas pribadi</span>
        </span>
      )}
    </div>
  )
}

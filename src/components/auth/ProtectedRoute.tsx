import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { AuthFeedback } from './AuthFeedback'
import { Button } from '../ui/button'
import { supabase } from '../../lib/supabase'

export function AuthLoadingScreen() {
  return (
    <main
      aria-label="Memeriksa sesi"
      className="grid min-h-screen place-items-center bg-slate-50 px-4"
    >
      <div role="status" className="flex items-center gap-3 text-sm text-slate-600">
        <span className="size-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        Memeriksa sesi Anda…
      </div>
    </main>
  )
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, error, refreshSession } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (error && !user && supabase) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Sesi belum dapat dipulihkan</h1>
          <div className="mt-4">
            <AuthFeedback>{error}</AuthFeedback>
          </div>
          <Button className="mt-5 w-full" onClick={() => void refreshSession()}>
            Coba lagi
          </Button>
        </section>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <AuthLoadingScreen />
  }

  return user ? <Navigate to="/" replace /> : children
}

import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthProvider'
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/ProtectedRoute'
import { LoadingState } from './components/common/DataState'

const AppShell = lazy(() =>
  import('./components/layout/AppShell').then((module) => ({
    default: module.AppShell,
  })),
)
const CategoriesPage = lazy(() =>
  import('./pages/CategoriesPage').then((module) => ({
    default: module.CategoriesPage,
  })),
)
const CalendarPage = lazy(() =>
  import('./pages/CalendarPage').then((module) => ({
    default: module.CalendarPage,
  })),
)
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
)
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  })),
)
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((module) => ({
    default: module.ResetPasswordPage,
  })),
)
const RecurringPage = lazy(() =>
  import('./pages/RecurringPage').then((module) => ({
    default: module.RecurringPage,
  })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)
const TasksPage = lazy(() =>
  import('./pages/TasksPage').then((module) => ({ default: module.TasksPage })),
)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingState label="Memuat MyTask…" />}>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={<ForgotPasswordPage />}
            />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="tasks/new" element={<TasksPage />} />
              <Route path="tasks/:taskId" element={<TasksPage />} />
              <Route path="overdue" element={<TasksPage mode="overdue" />} />
              <Route path="completed" element={<TasksPage mode="completed" />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="recurring" element={<RecurringPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

function NotFoundPage() {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <p className="text-sm font-medium text-blue-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-sm text-slate-600">
        Halaman yang Anda cari tidak tersedia.
      </p>
      <Link className="mt-5 inline-block text-sm font-medium text-blue-700" to="/">
        Kembali ke dashboard
      </Link>
    </section>
  )
}

export default App

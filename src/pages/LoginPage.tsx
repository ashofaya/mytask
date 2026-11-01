import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthField } from '../components/auth/AuthField'
import { AuthFeedback } from '../components/auth/AuthFeedback'
import { AuthPageLayout } from '../components/auth/AuthPageLayout'
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton'
import { useAuth } from '../hooks/useAuth'
import { loginSchema } from '../lib/authValidation'
import { signInWithEmail } from '../services/authService'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const navigate = useNavigate()
  const { error: sessionError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    const result = loginSchema.safeParse({ email, password })

    if (!result.success) {
      setFieldErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      )
      return
    }

    setFieldErrors({})
    setSubmitting(true)
    try {
      await signInWithEmail(result.data.email, result.data.password)
      navigate('/', { replace: true })
    } catch {
      setSubmitError('Email atau password tidak sesuai. Periksa kembali lalu coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageLayout
      eyebrow="Selamat datang kembali"
      title="Masuk ke MyTask"
      description="Gunakan akun Anda untuk melanjutkan mengelola pekerjaan."
    >
      <div className="space-y-4">
        {!supabase && (
          <AuthFeedback>
            Supabase belum dikonfigurasi. Lengkapi environment variables untuk mengaktifkan
            autentikasi.
          </AuthFeedback>
        )}
        {sessionError && supabase && <AuthFeedback>{sessionError}</AuthFeedback>}
        {submitError && <AuthFeedback>{submitError}</AuthFeedback>}
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <AuthField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            error={fieldErrors.email}
            onChange={setEmail}
          />
          <AuthField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            error={fieldErrors.password}
            onChange={setPassword}
          />
          <div className="flex justify-end">
            <Link
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
              to="/forgot-password"
            >
              Lupa password?
            </Link>
          </div>
          <AuthSubmitButton loading={submitting} disabled={!supabase}>
            Masuk
          </AuthSubmitButton>
        </form>
        <p className="text-center text-sm text-slate-600">
          Belum punya akun?{' '}
          <Link className="font-medium text-blue-700 hover:text-blue-800" to="/register">
            Daftar
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  )
}

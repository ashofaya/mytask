import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthField } from '../components/auth/AuthField'
import { AuthFeedback } from '../components/auth/AuthFeedback'
import { AuthPageLayout } from '../components/auth/AuthPageLayout'
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton'
import { useAuth } from '../hooks/useAuth'
import { registerSchema } from '../lib/authValidation'
import { supabase } from '../lib/supabase'
import { registerWithEmail } from '../services/authService'

export function RegisterPage() {
  const navigate = useNavigate()
  const { error: sessionError } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmationRequired, setConfirmationRequired] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    const result = registerSchema.safeParse({
      displayName,
      email,
      password,
      confirmPassword,
    })

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
      const { session } = await registerWithEmail(
        result.data.email,
        result.data.password,
        result.data.displayName,
      )
      if (session) {
        navigate('/', { replace: true })
      } else {
        setConfirmationRequired(true)
      }
    } catch {
      setSubmitError('Pendaftaran belum berhasil. Periksa data Anda lalu coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageLayout
      eyebrow="Mulai lebih teratur"
      title="Buat akun MyTask"
      description="Akun pribadi untuk menyimpan pekerjaan dan deadline Anda."
    >
      <div className="space-y-4">
        {!supabase && (
          <AuthFeedback>
            Supabase belum dikonfigurasi. Lengkapi environment variables untuk mengaktifkan
            autentikasi.
          </AuthFeedback>
        )}
        {sessionError && supabase && <AuthFeedback>{sessionError}</AuthFeedback>}
        {confirmationRequired && (
          <AuthFeedback variant="success">
            Akun berhasil dibuat. Periksa email Anda untuk konfirmasi sebelum masuk.
          </AuthFeedback>
        )}
        {submitError && <AuthFeedback>{submitError}</AuthFeedback>}
        {!confirmationRequired && (
          <form
            className="space-y-4"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            <AuthField
              label="Nama"
              name="displayName"
              autoComplete="name"
              value={displayName}
              error={fieldErrors.displayName}
              onChange={setDisplayName}
            />
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
              autoComplete="new-password"
              value={password}
              error={fieldErrors.password}
              onChange={setPassword}
            />
            <AuthField
              label="Ulangi password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              error={fieldErrors.confirmPassword}
              onChange={setConfirmPassword}
            />
            <p className="text-xs leading-5 text-slate-500">
              Gunakan minimal 8 karakter. Password dikelola langsung oleh Supabase Auth.
            </p>
            <AuthSubmitButton loading={submitting} disabled={!supabase}>
              Daftar
            </AuthSubmitButton>
          </form>
        )}
        <p className="text-center text-sm text-slate-600">
          Sudah punya akun?{' '}
          <Link className="font-medium text-blue-700 hover:text-blue-800" to="/login">
            Masuk
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  )
}

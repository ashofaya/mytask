import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthField } from '../components/auth/AuthField'
import { AuthFeedback } from '../components/auth/AuthFeedback'
import { AuthPageLayout } from '../components/auth/AuthPageLayout'
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton'
import { useAuth } from '../hooks/useAuth'
import { resetPasswordSchema } from '../lib/authValidation'
import { supabase } from '../lib/supabase'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { recoveryPending, updatePassword, finishRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    const result = resetPasswordSchema.safeParse({ password, confirmPassword })

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
      await updatePassword(result.data.password)
      finishRecovery()
      navigate('/', { replace: true })
    } catch {
      setSubmitError(
        'Tautan pemulihan tidak valid atau kedaluwarsa. Minta tautan baru untuk mencoba lagi.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageLayout
      eyebrow="Kata sandi baru"
      title="Atur ulang password"
      description="Buat kata sandi baru untuk melindungi akun My Task Anda."
    >
      <div className="space-y-4">
        {!supabase && (
          <AuthFeedback>
            Supabase belum dikonfigurasi. Lengkapi environment variables untuk mengatur
            ulang password.
          </AuthFeedback>
        )}
        {!recoveryPending && (
          <AuthFeedback>
            Sesi pemulihan tidak tersedia atau sudah kedaluwarsa. Minta tautan pemulihan
            baru untuk melanjutkan.
          </AuthFeedback>
        )}
        {submitError && <AuthFeedback>{submitError}</AuthFeedback>}
        {recoveryPending && (
          <form
            className="space-y-4"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            <AuthField
              label="Password baru"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              error={fieldErrors.password}
              onChange={setPassword}
            />
            <AuthField
              label="Ulangi password baru"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              error={fieldErrors.confirmPassword}
              onChange={setConfirmPassword}
            />
            <p className="text-xs text-slate-500">Minimal 8 karakter.</p>
            <AuthSubmitButton
              loading={submitting}
              disabled={!supabase || !recoveryPending}
            >
              Simpan password baru
            </AuthSubmitButton>
          </form>
        )}
        <p className="text-center text-sm text-slate-600">
          <Link
            className="font-medium text-blue-700 hover:text-blue-800"
            to="/forgot-password"
          >
            Minta tautan pemulihan baru
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  )
}

import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthField } from '../components/auth/AuthField'
import { AuthFeedback } from '../components/auth/AuthFeedback'
import { AuthPageLayout } from '../components/auth/AuthPageLayout'
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton'
import { forgotPasswordSchema } from '../lib/authValidation'
import { supabase } from '../lib/supabase'
import { requestPasswordReset } from '../services/authService'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setSent(false)
    const result = forgotPasswordSchema.safeParse({ email })

    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? 'Email tidak valid.')
      return
    }

    setFieldError(null)
    setSubmitting(true)
    try {
      await requestPasswordReset(result.data.email)
      setSent(true)
    } catch {
      setSubmitError('Permintaan belum dapat diproses. Periksa koneksi lalu coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageLayout
      eyebrow="Pemulihan akun"
      title="Lupa password?"
      description="Masukkan email akun Anda. Kami akan mengirim tautan pemulihan jika alamat tersebut terdaftar."
    >
      <div className="space-y-4">
        {!supabase && (
          <AuthFeedback>
            Supabase belum dikonfigurasi. Lengkapi environment variables untuk mengaktifkan
            pemulihan akun.
          </AuthFeedback>
        )}
        {sent && (
          <AuthFeedback variant="success">
            Jika email tersebut terdaftar, tautan pemulihan akan dikirim. Periksa kotak
            masuk Anda.
          </AuthFeedback>
        )}
        {submitError && <AuthFeedback>{submitError}</AuthFeedback>}
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <AuthField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            error={fieldError ?? undefined}
            onChange={setEmail}
          />
          <AuthSubmitButton loading={submitting} disabled={!supabase}>
            Kirim tautan pemulihan
          </AuthSubmitButton>
        </form>
        <p className="text-center text-sm text-slate-600">
          Ingat password?{' '}
          <Link className="font-medium text-blue-700 hover:text-blue-800" to="/login">
            Kembali masuk
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  )
}

import { AlertCircle, CheckCircle2 } from 'lucide-react'

export function AuthFeedback({
  children,
  variant = 'error',
}: {
  children: string
  variant?: 'error' | 'success' | 'info'
}) {
  const isSuccess = variant === 'success'
  const isInfo = variant === 'info'
  const Icon = isSuccess ? CheckCircle2 : AlertCircle
  const classes = isSuccess
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : isInfo
      ? 'border-blue-200 bg-blue-50 text-blue-900'
      : 'border-rose-200 bg-rose-50 text-rose-900'

  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm leading-5 ${classes}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  )
}

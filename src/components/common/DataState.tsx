import type { ReactNode } from 'react'
import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'
import { Button } from '../ui/button'

export function LoadingState({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      {label}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-500">
        <Inbox aria-hidden="true" className="size-5" />
      </span>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
      <div className="flex items-start gap-3">
        <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div>
          <h3 className="font-semibold">Data tidak dapat dimuat</h3>
          <p className="mt-1 text-sm leading-6">{message}</p>
          <Button variant="outline" className="mt-4 bg-white" onClick={onRetry}>
            Coba lagi
          </Button>
        </div>
      </div>
    </div>
  )
}

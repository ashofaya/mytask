import type { ReactNode } from 'react'
import { ClipboardCheck, ShieldCheck } from 'lucide-react'
import { ThemeToggleButton } from '../theme/ThemeToggleButton'

export function AuthPageLayout({
  eyebrow,
  title,
  description,
  children,
  showThemeToggle = true,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  showThemeToggle?: boolean
}) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 transition-colors">
      {showThemeToggle && (
        <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          <ThemeToggleButton />
        </div>
      )}
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-6 px-4 py-6 sm:px-8 lg:items-stretch lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)] lg:gap-10 lg:px-12 lg:py-10">
        <section className="order-2 mx-auto flex w-full max-w-md flex-col justify-center lg:order-1 lg:min-h-[560px]">
          <div className="flex min-h-[360px] flex-col justify-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/[0.03] sm:p-8 lg:min-h-[560px]">
            <div className="mb-7 grid size-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
              <ClipboardCheck aria-hidden="true" className="size-6" />
            </div>
            <p className="text-sm font-medium text-blue-700">{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
        </section>

        <aside className="order-1 min-h-[190px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-5 text-white shadow-xl shadow-blue-900/10 sm:min-h-[220px] sm:p-6 lg:order-2 lg:flex lg:min-h-[560px] lg:flex-col lg:p-10">
          <div className="flex min-h-[190px] flex-col justify-between sm:min-h-[220px] lg:min-h-[480px] lg:flex-1">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-blue-50">
              <ShieldCheck aria-hidden="true" className="size-4" />
              Ruang kerja pribadi
            </div>
            <div className="py-5 lg:py-8">
              <div className="max-w-md">
                <h2 className="text-3xl font-bold leading-tight tracking-tight">
                  My Task
                </h2>
                <p className="mt-2 text-lg font-medium text-blue-50">
                  Pengingat biar nggak lupa
                </p>
                <p className="mt-3 max-w-sm text-sm leading-6 text-blue-50/90">
                  Biar semua tugas dan deadline terkontrol di satu tempat. Simple, aman,
                  dan pastinya gak gampang kelupaan.
                </p>
              </div>
            </div>
            <p className="text-sm font-medium text-blue-50/90">Created by @ashofaya</p>
          </div>
        </aside>
      </div>
    </main>
  )
}

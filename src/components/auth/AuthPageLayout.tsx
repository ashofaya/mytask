import type { ReactNode } from 'react'
import { ClipboardCheck, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AuthPageLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:gap-16 lg:px-12 lg:py-12">
        <section className="order-2 mx-auto flex w-full max-w-md flex-col justify-center lg:order-1">
          <Link className="mb-10 inline-flex items-center gap-3" to="/login">
            <span className="grid size-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
              <ClipboardCheck aria-hidden="true" className="size-6" />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">My Task</span>
              <span className="block text-xs text-slate-500">Personal Task Manager</span>
            </span>
          </Link>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/[0.03] sm:p-8">
            <p className="text-sm font-medium text-blue-700">{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            <div className="mt-7">{children}</div>
          </div>

        </section>

        <aside className="order-1 min-h-[240px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-900/10 lg:order-2 lg:min-h-[480px] lg:p-10">
          <div className="flex min-h-[240px] flex-col justify-between lg:min-h-[480px]">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-blue-100">
              <ShieldCheck aria-hidden="true" className="size-4" />
              Ruang kerja pribadi
            </div>
            <div className="py-6 lg:py-10">
              <div className="mb-6 grid size-14 place-items-center rounded-2xl border border-white/20 bg-white/10 shadow-inner shadow-white/10 lg:mb-9 lg:size-[4.5rem]">
                <ClipboardCheck aria-hidden="true" className="size-7 lg:size-9" />
              </div>
              <h2 className="text-3xl font-bold leading-tight tracking-tight">
                My Task
              </h2>
              <p className="mt-3 text-lg font-medium text-blue-100">
                Pengingat biar Ga lupa
              </p>
              <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100/80">
                Biar semua tugas dan deadline terkontrol di satu tempat. Simple, aman,
                dan pastinya gak gampang kelupaan.
              </p>
            </div>
            <p className="text-xs text-blue-100/70">Created by @ashofaya</p>
          </div>
        </aside>
      </div>
    </main>
  )
}

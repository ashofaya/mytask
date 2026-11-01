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
        <section className="mx-auto w-full max-w-md">
          <Link className="mb-10 inline-flex items-center gap-3" to="/login">
            <span className="grid size-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
              <ClipboardCheck aria-hidden="true" className="size-6" />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">MyTask</span>
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

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Akun dan data task Anda hanya dapat diakses melalui sesi Supabase pribadi.
          </p>
        </section>

        <aside className="hidden overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-10 text-white shadow-xl shadow-blue-900/10 lg:block">
          <div className="flex min-h-[480px] flex-col justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-100">
              <ShieldCheck aria-hidden="true" className="size-5" />
              Ruang kerja pribadi
            </div>
            <div>
              <div className="mb-8 grid size-16 place-items-center rounded-2xl border border-white/20 bg-white/10">
                <ClipboardCheck aria-hidden="true" className="size-8" />
              </div>
              <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight">
                Fokus pada pekerjaan yang paling penting.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">
                Kelola tugas dan tenggat dalam satu tempat yang aman, sederhana, dan
                selalu mengikuti akun Anda.
              </p>
            </div>
            <p className="text-xs text-blue-100/80">MyTask · produktivitas, lebih teratur</p>
          </div>
        </aside>
      </div>
    </main>
  )
}

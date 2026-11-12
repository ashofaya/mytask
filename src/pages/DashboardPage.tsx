import {
  ArrowDownRight,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  ListTodo,
  Plus,
  TriangleAlert,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../components/common/DataState'
import { TaskList } from '../components/task/TaskList'
import { useTaskData } from '../hooks/useTaskData'
import type { TaskRecord } from '../types/database'
import { getDashboardSummary } from '../utils/taskLogic'

export function DashboardPage() {
  const data = useTaskData()
  const summary = getDashboardSummary(data.tasks)

  if (data.loading) {
    return <LoadingState label="Memuat dashboard…" />
  }
  if (data.error) {
    return <ErrorState message={data.error} onRetry={() => void data.reload()} />
  }

  const stats = [
    { label: 'Semua tugas', value: summary.total, icon: ListTodo, color: 'bg-blue-50 text-blue-700', to: '/tasks' },
    { label: 'Belum dimulai', value: summary.todo, icon: Circle, color: 'bg-slate-100 text-slate-600', to: '/tasks?status=To%20Do' },
    { label: 'Sedang dikerjakan', value: summary.inProgress, icon: Clock3, color: 'bg-amber-50 text-amber-700', to: '/tasks?status=In%20Progress' },
    { label: 'Selesai', value: summary.completed, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700', to: '/completed' },
    { label: 'Terlambat', value: summary.overdue, icon: TriangleAlert, color: 'bg-rose-50 text-rose-700', to: '/overdue' },
  ]

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-blue-700">Ringkasan pekerjaan</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Halo, selamat datang di My Task
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Atur prioritas dan tenggat untuk hari ini.
          </p>
        </div>
        <Link
          to="/tasks/new"
          className="hidden h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:inline-flex"
        >
          <Plus aria-hidden="true" className="size-4" />
          Buat tugas
        </Link>
      </header>

      <section aria-label="Statistik tugas" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, color, to }) => (
          <Link
            key={label}
            to={to}
            className={`rounded-2xl border bg-white p-4 shadow-sm shadow-slate-900/[0.02] transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${
              label === 'Terlambat' && value > 0
                ? 'border-rose-200 bg-rose-50/40'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-600">{label}</span>
              <span className={`grid size-9 place-items-center rounded-xl ${color}`}>
                <Icon aria-hidden="true" className="size-[18px]" />
              </span>
            </div>
            <p className={`mt-4 text-3xl font-semibold tracking-tight ${
              label === 'Terlambat' && value > 0 ? 'text-rose-700' : ''
            }`}>{value}</p>
          </Link>
        ))}
      </section>

      <TaskSection
        title="Hari ini"
        description="Tugas yang tenggatnya jatuh hari ini."
        icon={Clock3}
        tasks={summary.today}
        emptyTitle="Hari ini masih lengang"
        emptyDescription="Belum ada tugas yang jatuh tempo hari ini."
        emptyAction={
          <Link
            to="/tasks/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus aria-hidden="true" className="size-4" />
            Buat tugas
          </Link>
        }
        categories={data.categories}
        onStatusChange={data.changeStatus}
        onDelete={(task) => data.removeTask(task.id)}
      />
      <TaskSection
        title="Mendatang"
        description="Tugas dengan tenggat dalam tujuh hari ke depan."
        icon={ArrowDownRight}
        tasks={summary.upcoming}
        emptyTitle="Belum ada tugas mendatang"
        emptyDescription="Tugas dengan tenggat H+1 sampai H+7 akan muncul di sini."
        categories={data.categories}
        onStatusChange={data.changeStatus}
        onDelete={(task) => data.removeTask(task.id)}
      />
      <div className="flex justify-end">
        <Link
          to="/tasks"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          Lihat semua tugas <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <Link
        aria-label="Buat tugas cepat"
        to="/tasks/new"
        className="fixed bottom-5 right-5 z-10 inline-flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:hidden"
      >
        <Plus aria-hidden="true" className="size-6" />
      </Link>
    </div>
  )
}

function TaskSection({
  title,
  description,
  icon: Icon,
  tasks,
  emptyTitle,
  emptyDescription,
  emptyAction,
  categories,
  onStatusChange,
  onDelete,
}: {
  title: string
  description: string
  icon: typeof Clock3
  tasks: ReturnType<typeof getDashboardSummary>['today']
  emptyTitle: string
  emptyDescription: string
  emptyAction?: ReactNode
  categories: ReturnType<typeof useTaskData>['categories']
  onStatusChange: ReturnType<typeof useTaskData>['changeStatus']
  onDelete: (task: TaskRecord) => Promise<void>
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
          <Icon aria-hidden="true" className="size-[18px]" />
        </span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {tasks.length ? (
        <TaskList
          tasks={tasks}
          categories={categories}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      ) : (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      )}
    </section>
  )
}

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../components/common/DataState'
import { TaskEditor } from '../components/task/TaskEditor'
import { TaskFilters } from '../components/task/TaskFilters'
import { filterTasks, type TaskFilterValues } from '../components/task/taskFilterLogic'
import { TaskList } from '../components/task/TaskList'
import { Button } from '../components/ui/button'
import { useTaskData } from '../hooks/useTaskData'
import { TASK_STATUSES } from '../types/database'
import { isOverdue } from '../utils/taskLogic'
import { TaskReminderSaveError } from '../services/taskService'
import { todayJakarta } from '../utils/dateTime'

export function TasksPage({
  mode = 'all',
}: {
  mode?: 'all' | 'overdue' | 'completed'
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { taskId } = useParams()
  const data = useTaskData()
  const [filters, setFilters] = useState<TaskFilterValues>(() => {
    const status = searchParams.get('status')
    return {
      query: '',
      status: TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])
        ? (status as TaskFilterValues['status'])
        : 'all',
      categoryId: '',
      priority: 'all',
    }
  })
  const [mutationError, setMutationError] = useState<string | null>(null)
  const isNew = taskId === 'new'
  const task = data.tasks.find((candidate) => candidate.id === taskId)
  const editorOpen = isNew || Boolean(taskId && task)
  const missingTask =
    !data.loading && Boolean(taskId && !isNew && !task && !data.error)
  const visibleMutationError =
    mutationError ??
    (missingTask ? 'Task tidak ditemukan atau tidak dapat diakses.' : null)

  const visibleTasks = useMemo(() => {
    const today = todayJakarta()
    const byMode =
      mode === 'overdue'
        ? data.tasks.filter((item) => isOverdue(item, today))
        : mode === 'completed'
          ? data.tasks.filter((item) => item.status === 'Completed')
          : data.tasks
    const filtered = filterTasks(byMode, filters)
    if (mode === 'overdue') {
      return filtered.sort((left, right) =>
        (left.deadline ?? '').localeCompare(right.deadline ?? ''),
      )
    }
    if (mode === 'completed') {
      return filtered.sort((left, right) =>
        (right.completed_at ?? '').localeCompare(left.completed_at ?? ''),
      )
    }
    return filtered
  }, [data.tasks, filters, mode])

  const title =
    mode === 'overdue' ? 'Tugas terlambat' : mode === 'completed' ? 'Riwayat selesai' : 'Semua tugas'

  async function saveTask(values: Parameters<typeof data.addTask>[0]) {
    setMutationError(null)
    try {
      if (task) {
        await data.editTask(task.id, values)
      } else {
        await data.addTask(values)
      }
      navigate(mode === 'all' ? '/tasks' : `/${mode}`, {
        replace: true,
        state: { success: task ? 'Tugas berhasil diperbarui.' : 'Tugas berhasil dibuat.' },
      })
    } catch (error) {
      if (error instanceof TaskReminderSaveError) {
        await data.reload()
      }
      setMutationError(
        error instanceof Error ? error.message : 'Tugas gagal disimpan. Coba lagi.',
      )
      throw error
    }
  }

  if (data.loading) {
    return <LoadingState label="Memuat tugas…" />
  }
  if (data.error) {
    return <ErrorState message={data.error} onRetry={() => void data.reload()} />
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-blue-700">Kelola pekerjaan</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === 'overdue'
              ? 'Tugas yang belum selesai dengan tenggat sebelum hari ini di Asia/Jakarta.'
              : mode === 'completed'
                      ? 'Riwayat tugas yang sudah diselesaikan.'
                      : `${visibleTasks.length} tugas ditampilkan.`}
          </p>
        </div>
        {mode === 'all' && (
          <Link
            to="/tasks/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus aria-hidden="true" className="size-4" />
            Buat tugas
          </Link>
        )}
      </header>

      {visibleMutationError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {visibleMutationError}
        </div>
      )}
      {typeof location.state?.success === 'string' && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {location.state.success}
        </div>
      )}
      {mode === 'all' && (
        <TaskFilters
          value={filters}
          categories={data.categories}
          onChange={setFilters}
        />
      )}
      {visibleTasks.length ? (
        <TaskList
          tasks={visibleTasks}
          categories={data.categories}
          onStatusChange={data.changeStatus}
          onDelete={(item) => data.removeTask(item.id)}
        />
      ) : (
        <EmptyState
          title={
            mode === 'overdue'
              ? 'Tidak ada tugas terlambat'
              : mode === 'completed'
                ? 'Belum ada tugas selesai'
                : 'Belum ada tugas'
          }
          description={
            mode === 'overdue'
              ? 'Tugas yang tenggatnya sudah lewat akan muncul di sini.'
              : mode === 'completed'
                ? 'Tugas yang Anda tandai selesai akan tersimpan di sini.'
                : 'Tambahkan tugas pertama Anda untuk mulai mengatur pekerjaan.'
          }
          action={
            mode === 'all' ? (
              <Link
                to="/tasks/new"
                className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus aria-hidden="true" className="size-4" />
                Buat tugas
              </Link>
            ) : undefined
          }
        />
      )}

      {editorOpen && (
        <TaskEditor
          key={task?.id ?? 'new'}
          task={task}
          categories={data.categories}
          onSave={saveTask}
          onCancel={() => navigate(mode === 'all' ? '/tasks' : `/${mode}`)}
        />
      )}
      {!isNew && taskId && !task && !data.error && (
        <Button variant="outline" onClick={() => navigate('/tasks')}>
          Kembali ke daftar tugas
        </Button>
      )}
    </div>
  )
}

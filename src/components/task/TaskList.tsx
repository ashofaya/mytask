import { useState } from 'react'
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateJakarta } from '../../utils/dateTime'
import { buildGoogleCalendarEventUrl, parseReminderToUtcDate } from '../../utils/googleCalendar'
import { TASK_STATUSES, type Category, type TaskRecord, type TaskStatus } from '../../types/database'
import { Button } from '../ui/button'
import { getTaskPriorityLabel, getTaskStatusLabel } from '../../utils/taskLabels'

export function TaskList({
  tasks,
  categories,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  tasks: TaskRecord[]
  categories: Category[]
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>
  onDelete: (task: TaskRecord) => Promise<void>
  onEdit?: (task: TaskRecord) => void
}) {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const [pendingDelete, setPendingDelete] = useState<TaskRecord | null>(null)
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function confirmDelete() {
    if (!pendingDelete) {
      return
    }
    setActionError(null)
    setBusyTaskId(pendingDelete.id)
    try {
      await onDelete(pendingDelete)
      setPendingDelete(null)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Task gagal dihapus. Coba lagi.',
      )
    } finally {
      setBusyTaskId(null)
    }
  }

  async function handleStatusChange(task: TaskRecord, status: TaskStatus) {
    setActionError(null)
    setBusyTaskId(task.id)
    try {
      await onStatusChange(task.id, status)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Status task gagal diperbarui.',
      )
    } finally {
      setBusyTaskId(null)
    }
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {actionError}
        </div>
      )}
      {!tasks.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Belum ada tugas pada bagian ini.
        </div>
      ) : (
        tasks.map((task) => (
          <article
            key={task.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`font-semibold ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {task.title}
                  </h3>
                  <PriorityBadge priority={task.priority} />
                </div>
                {task.description && (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {task.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {task.deadline && (
                    <span>Tenggat {formatDateJakarta(task.deadline)}</span>
                  )}
                  {(() => {
                    const reminderDate = parseReminderToUtcDate(task.remind_at)
                    return reminderDate ? (
                      <span>
                        Pengingat{' '}
                        {formatDateJakarta(reminderDate.toISOString(), {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        WIB
                      </span>
                    ) : null
                  })()}
                  {task.category_id && (
                    <span>Kategori: {categoryNames.get(task.category_id) ?? 'Kategori'}</span>
                  )}
                  {task.status === 'Completed' && task.completed_at && (
                    <span>Selesai {formatDateJakarta(task.completed_at, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`status-${task.id}`}>
                  Status {task.title}
                </label>
                <select
                  id={`status-${task.id}`}
                  aria-label={`Status ${task.title}`}
                  value={task.status}
                  disabled={busyTaskId === task.id}
                  onChange={(event) =>
                    void handleStatusChange(task, event.currentTarget.value as TaskStatus)
                  }
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {TASK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {getTaskStatusLabel(status)}
                    </option>
                  ))}
                </select>
                <a
                  href={buildGoogleCalendarEventUrl(
                    task,
                    task.category_id ? categoryNames.get(task.category_id) : undefined,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Tambah ${task.title} ke Google Calendar`}
                  title="Tambah ke Google Calendar"
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <CalendarPlus aria-hidden="true" className="size-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Google Calendar</span>
                </a>
                {onEdit ? (
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Edit ${task.title}`}
                    onClick={() => onEdit(task)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                ) : (
                  <Link
                    to={`/tasks/${task.id}`}
                    aria-label={`Edit ${task.title}`}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    <Pencil aria-hidden="true" />
                  </Link>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Hapus ${task.title}`}
                  onClick={() => setPendingDelete(task)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
          </article>
        ))
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-task-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 id="delete-task-title" className="text-lg font-semibold">
              Hapus task?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              “{pendingDelete.title}” dan reminder terkait akan dihapus. Tindakan ini tidak
              dapat dibatalkan.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingDelete(null)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                disabled={busyTaskId === pendingDelete.id}
                onClick={() => void confirmDelete()}
              >
                <Trash2 aria-hidden="true" className="mr-2 size-4" />
                Hapus
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function PriorityBadge({ priority }: { priority: TaskRecord['priority'] }) {
  const style =
    priority === 'High'
      ? 'bg-rose-50 text-rose-700'
      : priority === 'Low'
        ? 'bg-slate-100 text-slate-600'
        : 'bg-amber-50 text-amber-700'

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${style}`}>
      {getTaskPriorityLabel(priority)}
    </span>
  )
}

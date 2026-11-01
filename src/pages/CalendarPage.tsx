import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, CalendarRange } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../components/common/DataState'
import { Button } from '../components/ui/button'
import { useTaskData } from '../hooks/useTaskData'
import { formatDateJakarta, todayJakarta } from '../utils/dateTime'
import { getMonthDates, getWeekDates, shiftCalendarPeriod } from '../utils/calendar'
import { isOverdue } from '../utils/taskLogic'
import type { TaskRecord } from '../types/database'

type CalendarView = 'month' | 'week'

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function monthLabel(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 7)}-15T12:00:00Z`))
}

function taskState(task: Pick<TaskRecord, 'deadline' | 'status'>, today: string) {
  if (task.status === 'Completed') return 'Selesai'
  return isOverdue(task, today) ? 'Overdue' : task.status
}

export function CalendarPage() {
  const data = useTaskData()
  const today = todayJakarta()
  const [view, setView] = useState<CalendarView>('month')
  const [selectedDate, setSelectedDate] = useState(today)
  const periodDates = useMemo(
    () => (view === 'month' ? getMonthDates(selectedDate) : getWeekDates(selectedDate)),
    [selectedDate, view],
  )
  const tasksByDeadline = useMemo(() => {
    const grouped = new Map<string, typeof data.tasks>()
    for (const task of data.tasks) {
      if (!task.deadline) continue
      const current = grouped.get(task.deadline) ?? []
      current.push(task)
      grouped.set(task.deadline, current)
    }
    return grouped
  }, [data.tasks])
  const selectedTasks = (tasksByDeadline.get(selectedDate) ?? []).slice().sort((left, right) => {
    if (left.status === 'Completed' && right.status !== 'Completed') return 1
    if (right.status === 'Completed' && left.status !== 'Completed') return -1
    return left.title.localeCompare(right.title)
  })

  if (data.loading) return <LoadingState label="Memuat kalender…" />
  if (data.error) return <ErrorState message={data.error} onRetry={() => void data.reload()} />

  function navigatePeriod(direction: -1 | 1) {
    setSelectedDate((current) => shiftCalendarPeriod(current, direction, view))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-blue-700">Rencanakan pekerjaan</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Kalender</h1>
          <p className="mt-2 text-sm text-slate-600">
            Deadline ditampilkan menurut tanggal kalender Asia/Jakarta.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setSelectedDate(today)}>Hari ini</Button>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            <Button
              variant={view === 'month' ? 'default' : 'ghost'}
              aria-pressed={view === 'month'}
              onClick={() => setView('month')}
              className={view === 'month' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
            >
              <CalendarDays aria-hidden="true" className="mr-2 size-4" />
              Bulan
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'ghost'}
              aria-pressed={view === 'week'}
              onClick={() => setView('week')}
              className={view === 'week' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
            >
              <CalendarRange aria-hidden="true" className="mr-2 size-4" />
              Minggu
            </Button>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-3 sm:px-5">
          <Button variant="outline" size="icon" aria-label="Periode sebelumnya" onClick={() => navigatePeriod(-1)}>
            <ArrowLeft aria-hidden="true" />
          </Button>
          <h2 className="text-base font-semibold capitalize sm:text-lg">{monthLabel(selectedDate)}</h2>
          <Button variant="outline" size="icon" aria-label="Periode berikutnya" onClick={() => navigatePeriod(1)}>
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-1 py-2 text-center text-[11px] font-medium text-slate-500 sm:py-3 sm:text-xs">
              {day}
            </div>
          ))}
        </div>
        <div className={`grid grid-cols-7 ${view === 'month' ? '' : 'sm:auto-rows-fr'}`}>
          {periodDates.map((date) => {
            const dateTasks = tasksByDeadline.get(date) ?? []
            const isCurrentMonth = date.slice(0, 7) === selectedDate.slice(0, 7)
            const isSelected = date === selectedDate
            return (
              <div
                key={date}
                className={`min-h-[82px] border-b border-r border-slate-100 p-1 sm:min-h-[120px] sm:p-2 ${
                  view === 'month' && !isCurrentMonth ? 'bg-slate-50/70' : 'bg-white'
                }`}
              >
                <button
                  type="button"
                  aria-label={`Pilih ${formatDateJakarta(date)}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedDate(date)}
                  className={`grid size-7 place-items-center rounded-full text-xs font-medium sm:size-8 sm:text-sm ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : date === today
                        ? 'bg-blue-50 text-blue-700'
                        : isCurrentMonth || view === 'week'
                          ? 'text-slate-800 hover:bg-slate-100'
                          : 'text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {Number(date.slice(-2))}
                </button>
                <div className="mt-1 space-y-1">
                  {dateTasks.slice(0, view === 'week' ? 5 : 2).map((task) => {
                    const state = taskState(task, today)
                    return (
                      <Link
                        key={task.id}
                        to={`/tasks/${task.id}`}
                        title={`${task.title} — ${state}`}
                        className={`block truncate rounded px-1 py-0.5 text-left text-[10px] leading-4 sm:px-1.5 sm:text-xs ${
                          state === 'Selesai'
                            ? 'bg-emerald-50 text-emerald-800 line-through'
                            : state === 'Overdue'
                              ? 'bg-rose-50 text-rose-800'
                              : 'bg-blue-50 text-blue-800'
                        }`}
                      >
                        <span className="sr-only">{state}: </span>
                        {task.title}
                      </Link>
                    )
                  })}
                  {dateTasks.length > (view === 'week' ? 5 : 2) && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className="px-1 text-[10px] font-medium text-blue-700"
                    >
                      +{dateTasks.length - (view === 'week' ? 5 : 2)} lainnya
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">{formatDateJakarta(selectedDate)}</h2>
          <p className="text-sm text-slate-500">
            {selectedTasks.length} task dengan deadline pada tanggal ini
          </p>
        </div>
        {selectedTasks.length ? (
          <ul className="space-y-2">
            {selectedTasks.map((task) => {
              const state = taskState(task, today)
              return (
                <li key={task.id}>
                  <Link
                    to={`/tasks/${task.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    <span className={`min-w-0 truncate text-sm font-medium ${state === 'Selesai' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                      {task.title}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                      state === 'Selesai'
                        ? 'bg-emerald-50 text-emerald-700'
                        : state === 'Overdue'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-blue-50 text-blue-700'
                    }`}>
                      {state}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            title="Tidak ada task pada tanggal ini"
            description="Task yang memiliki deadline pada tanggal ini akan muncul di sini."
            action={<Link className="text-sm font-medium text-blue-700" to="/tasks/new">Buat task</Link>}
          />
        )}
      </section>
    </div>
  )
}

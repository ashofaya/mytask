import { useState, type FormEvent } from 'react'
import { AuthFeedback } from '../auth/AuthFeedback'
import { AuthField } from '../auth/AuthField'
import { Button } from '../ui/button'
import { TASK_PRIORITIES, TASK_STATUSES, type Category, type TaskRecord } from '../../types/database'
import { taskSchema, type TaskFormInput } from '../../lib/taskValidation'
import { formatJakartaDateTimeLocal, isPastJakartaDateTime } from '../../utils/dateTime'
import { AuthSubmitButton } from '../auth/AuthSubmitButton'
import { TaskReminderSaveError } from '../../services/taskService'
import { getTaskPriorityLabel, getTaskStatusLabel } from '../../utils/taskLabels'

const emptyValues: TaskFormInput = {
  title: '',
  description: '',
  category_id: '',
  priority: 'Medium',
  status: 'To Do',
  start_date: '',
  deadline: '',
  remind_at: '',
}

export function TaskEditor({
  task,
  categories,
  onSave,
  onCancel,
}: {
  task?: TaskRecord
  categories: Category[]
  onSave: (values: ReturnType<typeof taskSchema.parse>) => Promise<void>
  onCancel: () => void
}) {
  const [values, setValues] = useState<TaskFormInput>(
    task
      ? {
          title: task.title,
          description: task.description ?? '',
          category_id: task.category_id ?? '',
          priority: task.priority,
          status: task.status,
          start_date: task.start_date ?? '',
          deadline: task.deadline ?? '',
          remind_at: formatJakartaDateTimeLocal(task.remind_at),
        }
      : emptyValues,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [reminderWarning, setReminderWarning] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function setField<K extends keyof TaskFormInput>(
    key: K,
    value: TaskFormInput[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
    setSubmitError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    const result = taskSchema.safeParse(values)
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      )
      return
    }

    setErrors({})
    const reminderIsPast =
      result.data.remind_at !== null &&
      isPastJakartaDateTime(result.data.remind_at)
    setReminderWarning(reminderIsPast)
    setSubmitting(true)
    try {
      await onSave({
        ...result.data,
        remind_at: reminderIsPast ? null : result.data.remind_at,
      })
    } catch (saveError) {
      setSubmitError(
        saveError instanceof TaskReminderSaveError
          ? saveError.message
          : saveError instanceof Error
            ? saveError.message
            : 'Task gagal disimpan. Periksa koneksi lalu coba lagi.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/40 px-3 py-5 sm:grid sm:place-items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-editor-title"
        className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700">
              {task ? 'Perbarui pekerjaan' : 'Task baru'}
            </p>
            <h2 id="task-editor-title" className="mt-1 text-xl font-semibold tracking-tight">
              {task ? 'Edit tugas' : 'Buat tugas'}
            </h2>
          </div>
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
          {submitError && <AuthFeedback>{submitError}</AuthFeedback>}
          {reminderWarning && (
            <AuthFeedback variant="info">
              Waktu reminder sudah lewat. Task tetap disimpan tanpa membuat pengingat
              retroaktif.
            </AuthFeedback>
          )}
          <AuthField
            label="Judul"
            name="title"
            value={values.title}
            error={errors.title}
            onChange={(value) => setField('title', value)}
          />
          <div className="space-y-1.5">
            <label htmlFor="task-description" className="text-sm font-medium text-slate-800">
              Deskripsi <span className="font-normal text-slate-500">(opsional)</span>
            </label>
            <textarea
              id="task-description"
              maxLength={1000}
              rows={3}
              value={values.description ?? ''}
              onChange={(event) => setField('description', event.currentTarget.value)}
              aria-invalid={Boolean(errors.description)}
              className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 aria-[invalid=true]:border-rose-400"
            />
            {errors.description && <FieldError message={errors.description} />}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="task-category"
              label="Kategori"
              value={values.category_id ?? ''}
              onChange={(value) => setField('category_id', value)}
              options={[
                { value: '', label: 'Tanpa kategori' },
                ...categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
              error={errors.category_id}
            />
            <SelectField
              id="task-priority"
              label="Prioritas"
              value={values.priority}
              onChange={(value) => setField('priority', value as TaskFormInput['priority'])}
              options={TASK_PRIORITIES.map((priority) => ({
                value: priority,
                label: getTaskPriorityLabel(priority),
              }))}
            />
            <SelectField
              id="task-status"
              label="Status"
              value={values.status}
              onChange={(value) => setField('status', value as TaskFormInput['status'])}
              options={TASK_STATUSES.map((status) => ({
                value: status,
                label: getTaskStatusLabel(status),
              }))}
            />
            <DateField
              id="task-start"
              label="Tanggal mulai"
              value={values.start_date ?? ''}
              error={errors.start_date}
              onChange={(value) => setField('start_date', value)}
            />
            <DateField
              id="task-deadline"
              label="Tenggat"
              value={values.deadline ?? ''}
              error={errors.deadline}
              onChange={(value) => setField('deadline', value)}
            />
            <DateField
              id="task-reminder"
              label="Waktu pengingat (WIB)"
              type="datetime-local"
              value={values.remind_at ?? ''}
              error={errors.remind_at}
              onChange={(value) => setField('remind_at', value)}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
            <AuthSubmitButton loading={submitting}>
              {task ? 'Simpan perubahan' : 'Simpan tugas'}
            </AuthSubmitButton>
          </div>
        </form>
      </section>
    </div>
  )
}

function FieldError({ message }: { message: string }) {
  return <p className="text-xs text-rose-700">{message}</p>
}

function DateField({
  id,
  label,
  value,
  error,
  type = 'date',
  onChange,
}: {
  id: string
  label: string
  value: string
  error?: string
  type?: 'date' | 'datetime-local'
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        aria-invalid={Boolean(error)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 aria-[invalid=true]:border-rose-400"
      />
      {error && <FieldError message={error} />}
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  options,
  error,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        aria-invalid={Boolean(error)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 aria-[invalid=true]:border-rose-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <FieldError message={error} />}
    </div>
  )
}

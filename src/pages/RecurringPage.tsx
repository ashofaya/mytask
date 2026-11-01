import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AuthFeedback } from '../components/auth/AuthFeedback'
import { EmptyState, ErrorState, LoadingState } from '../components/common/DataState'
import { Button } from '../components/ui/button'
import { useTaskData } from '../hooks/useTaskData'
import { recurringRuleSchema, type RecurringRuleFormInput } from '../lib/taskValidation'
import {
  createRecurringRule,
  generateNextOccurrence,
  listRecurringRules,
  setRecurringRuleActive,
  softDeleteRecurringRule,
  updateRecurringRule,
} from '../services/recurringService'
import {
  RECURRING_FREQUENCIES,
  TASK_PRIORITIES,
  type RecurringRule,
  type RecurringRuleUpdate,
} from '../types/database'
import { formatDateJakarta, todayJakarta } from '../utils/dateTime'
import { getNextOccurrenceDate } from '../utils/recurringLogic'

const blankRule = (): RecurringRuleFormInput => ({
  title: '',
  description: '',
  category_id: '',
  priority: 'Medium',
  frequency: 'daily',
  start_date: todayJakarta(),
  end_date: '',
  reminder_offset_minutes: '',
  is_active: true,
})

export function RecurringPage() {
  const taskData = useTaskData()
  const [rules, setRules] = useState<RecurringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [editing, setEditing] = useState<RecurringRule | null>(null)
  const [values, setValues] = useState<RecurringRuleFormInput>(blankRule)
  const [submitting, setSubmitting] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setRules(await listRecurringRules())
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Aturan berulang gagal dimuat.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void listRecurringRules()
      .then((loadedRules) => {
        if (active) setRules(loadedRules)
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : 'Aturan berulang gagal dimuat.',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  function editRule(rule: RecurringRule) {
    setEditing(rule)
    setValues({
      title: rule.title,
      description: rule.description ?? '',
      category_id: rule.category_id ?? '',
      priority: rule.priority,
      frequency: rule.frequency,
      start_date: rule.start_date,
      end_date: rule.end_date ?? '',
      reminder_offset_minutes:
        rule.reminder_offset_minutes === null
          ? ''
          : String(rule.reminder_offset_minutes),
      is_active: rule.is_active,
    })
    setMutationError(null)
    setFeedback(null)
    document.getElementById('recurring-rule-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  function resetForm() {
    setEditing(null)
    setValues(blankRule())
    setMutationError(null)
    setFeedback(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMutationError(null)
    setFeedback(null)
    const parsed = recurringRuleSchema.safeParse(values)
    if (!parsed.success) {
      setMutationError(parsed.error.issues[0]?.message ?? 'Data aturan tidak valid.')
      return
    }

    setSubmitting(true)
    let savedRule: RecurringRule | null = null
    try {
      if (editing) {
        const update: RecurringRuleUpdate = {
          title: parsed.data.title,
          description: parsed.data.description,
          category_id: parsed.data.category_id,
          priority: parsed.data.priority,
          frequency: parsed.data.frequency,
          start_date: parsed.data.start_date,
          end_date: parsed.data.end_date,
          reminder_offset_minutes: parsed.data.reminder_offset_minutes,
          is_active: parsed.data.is_active,
        }
        savedRule = await updateRecurringRule(editing.id, update)
      } else {
        savedRule = await createRecurringRule(parsed.data)
      }

      if (savedRule.is_active) {
        try {
          await generateNextOccurrence(savedRule.id)
          await taskData.reload()
        } catch (error) {
          setMutationError(
            `Aturan tersimpan, tetapi occurrence belum dapat dibuat: ${
              error instanceof Error ? error.message : 'Kesalahan tidak diketahui.'
            }`,
          )
          await reload()
          return
        }
      }
      const successMessage = editing
        ? 'Aturan berulang berhasil diperbarui.'
        : 'Aturan berulang berhasil dibuat.'
      resetForm()
      setFeedback(successMessage)
      await reload()
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : 'Aturan berulang gagal disimpan.',
      )
      if (savedRule) await reload()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleActiveChange(rule: RecurringRule) {
    setMutationError(null)
    setFeedback(null)
    try {
      await setRecurringRuleActive(rule.id, !rule.is_active)
      if (!rule.is_active) {
        try {
          await generateNextOccurrence(rule.id)
          await taskData.reload()
        } catch (error) {
          setMutationError(
            `Aturan berhasil diaktifkan, tetapi occurrence gagal dibuat: ${
              error instanceof Error ? error.message : 'Kesalahan tidak diketahui.'
            }`,
          )
          await reload()
          return
        }
      }
      setFeedback(
        rule.is_active ? 'Aturan dinonaktifkan.' : 'Aturan diaktifkan kembali.',
      )
      await reload()
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : 'Status aturan gagal diperbarui.',
      )
      await reload()
    }
  }

  async function handleDelete(rule: RecurringRule) {
    if (
      !window.confirm(
        `Hapus aturan “${rule.title}”? Task occurrence yang sudah dibuat tetap disimpan.`,
      )
    ) {
      return
    }
    setMutationError(null)
    try {
      await softDeleteRecurringRule(rule.id)
      if (editing?.id === rule.id) resetForm()
      setFeedback('Aturan dihapus. Task yang sudah dibuat tetap tersimpan.')
      await reload()
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : 'Aturan gagal dihapus.',
      )
    }
  }

  if (loading || taskData.loading) {
    return <LoadingState label="Memuat aturan berulang…" />
  }
  if (loadError) {
    return <ErrorState message={loadError} onRetry={() => void reload()} />
  }
  if (taskData.error) {
    return <ErrorState message={taskData.error} onRetry={() => void taskData.reload()} />
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-sm font-medium text-blue-700">Otomatisasi rutinitas</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Task berulang</h1>
        <p className="mt-2 text-sm text-slate-600">
          Occurrence berikutnya dibuat secara transaksional saat aplikasi aktif. Task overdue tetap disimpan dan tidak menghentikan jadwal.
        </p>
      </header>

      <section id="recurring-rule-form" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold">{editing ? 'Edit aturan' : 'Aturan baru'}</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium">Judul task</span>
            <input
              value={values.title}
              maxLength={255}
              onChange={(event) => {
                const title = event.currentTarget.value
                setValues((current) => ({ ...current, title }))
              }}
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium">Deskripsi <span className="font-normal text-slate-500">(opsional)</span></span>
            <textarea
              rows={2}
              maxLength={1000}
              value={values.description ?? ''}
              onChange={(event) => {
                const description = event.currentTarget.value
                setValues((current) => ({ ...current, description }))
              }}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
          </label>
          <SelectField
            label="Frekuensi"
            value={values.frequency}
            disabled={Boolean(editing && editing.next_occurrence_index > 0)}
            onChange={(value) => setValues((current) => ({ ...current, frequency: value as RecurringRuleFormInput['frequency'] }))}
            options={RECURRING_FREQUENCIES.map((value) => ({ value, label: frequencyLabel(value) }))}
          />
          <SelectField
            label="Prioritas"
            value={values.priority}
            onChange={(value) => setValues((current) => ({ ...current, priority: value as RecurringRuleFormInput['priority'] }))}
            options={TASK_PRIORITIES.map((value) => ({ value, label: value }))}
          />
          <DateField
            label="Tanggal mulai"
            value={values.start_date}
            disabled={Boolean(editing && editing.next_occurrence_index > 0)}
            onChange={(value) => setValues((current) => ({ ...current, start_date: value }))}
          />
          <DateField
            label="Tanggal akhir (inklusif)"
            value={values.end_date ?? ''}
            onChange={(value) => setValues((current) => ({ ...current, end_date: value }))}
          />
          <SelectField
            label="Kategori"
            value={values.category_id ?? ''}
            onChange={(value) => setValues((current) => ({ ...current, category_id: value }))}
            options={[
              { value: '', label: 'Tanpa kategori' },
              ...taskData.categories.map((category) => ({ value: category.id, label: category.name })),
            ]}
          />
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Reminder sebelum akhir deadline (menit)</span>
            <input
              type="number"
              min={0}
              max={525600}
              value={values.reminder_offset_minutes ?? ''}
              onChange={(event) => {
                const reminder_offset_minutes = event.currentTarget.value
                setValues((current) => ({ ...current, reminder_offset_minutes }))
              }}
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(event) => {
                const is_active = event.currentTarget.checked
                setValues((current) => ({ ...current, is_active }))
              }}
              className="size-4 accent-blue-600"
            />
            Aturan aktif
          </label>
          {editing && editing.next_occurrence_index > 0 && (
            <p className="text-xs text-slate-500 sm:col-span-2">
              Frekuensi dan tanggal mulai dikunci setelah occurrence pertama. Perubahan template hanya berlaku untuk occurrence berikutnya.
            </p>
          )}
          {mutationError && <div className="sm:col-span-2"><AuthFeedback>{mutationError}</AuthFeedback></div>}
          {feedback && <div className="sm:col-span-2"><AuthFeedback variant="success">{feedback}</AuthFeedback></div>}
          <div className="flex gap-2 sm:col-span-2 sm:justify-end">
            {editing && <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>}
            <Button type="submit" disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700">
              {submitting ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Buat aturan'}
            </Button>
          </div>
        </form>
      </section>

      {rules.length ? (
        <ul className="space-y-3">
          {rules.map((rule) => {
            const nextDate = getNextOccurrenceDate(rule, rule.next_occurrence_index)
            const nextTask = rule.next_occurrence_index > 0
              ? taskData.tasks.find((task) => task.recurring_rule_id === rule.id && task.status !== 'Completed')
              : undefined
            return (
              <li key={rule.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{rule.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rule.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {rule.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {frequencyLabel(rule.frequency)} · mulai {formatDateJakarta(rule.start_date)}
                      {rule.end_date ? ` · berakhir ${formatDateJakarta(rule.end_date)}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {nextTask
                        ? <>Occurrence terbuka: <Link className="text-blue-700 hover:underline" to={`/tasks/${nextTask.id}`}>{nextTask.title}</Link></>
                        : nextDate
                          ? `Jadwal berikutnya: ${formatDateJakarta(nextDate)}`
                          : 'Jadwal telah mencapai tanggal akhir.'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="outline" onClick={() => void handleActiveChange(rule)}>
                      {rule.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                    <Button variant="outline" size="icon" aria-label={`Edit ${rule.title}`} onClick={() => editRule(rule)}>
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button variant="outline" size="icon" aria-label={`Hapus ${rule.title}`} onClick={() => void handleDelete(rule)}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState title="Belum ada task berulang" description="Buat aturan untuk menghasilkan task rutin berikutnya secara otomatis." />
      )}
    </div>
  )
}

function frequencyLabel(value: string): string {
  return ({ daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan' })[value as 'daily' | 'weekly' | 'monthly' | 'yearly']
}

function DateField({
  label,
  value,
  disabled = false,
  onChange,
}: {
  label: string
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm disabled:bg-slate-100 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

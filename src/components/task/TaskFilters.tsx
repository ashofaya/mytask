import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Category,
} from '../../types/database'
import { getTaskStatusLabel, getTaskPriorityLabel } from '../../utils/taskLabels'
import type { TaskFilterValues } from './taskFilterLogic'

export function TaskFilters({
  value,
  categories,
  onChange,
}: {
  value: TaskFilterValues
  categories: Category[]
  onChange: (value: TaskFilterValues) => void
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
      <div>
        <label htmlFor="filter-task-search" className="sr-only">
          Cari task
        </label>
        <input
          id="filter-task-search"
          type="search"
          value={value.query}
          onChange={(event) => onChange({ ...value, query: event.currentTarget.value })}
          placeholder="Cari tugas…"
          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
      <FilterSelect
        id="filter-task-status"
        label="Semua status"
        value={value.status}
        onChange={(next) =>
          onChange({ ...value, status: next as TaskFilterValues['status'] })
        }
        options={TASK_STATUSES.map((status) => ({
          value: status,
          label: getTaskStatusLabel(status),
        }))}
      />
      <FilterSelect
        id="filter-task-category"
        label="Semua kategori"
        value={value.categoryId}
        onChange={(next) => onChange({ ...value, categoryId: next })}
        options={categories.map((category) => ({
          value: category.id,
          label: category.name,
        }))}
      />
      <FilterSelect
        id="filter-task-priority"
        label="Semua prioritas"
        value={value.priority}
        onChange={(next) =>
          onChange({ ...value, priority: next as TaskFilterValues['priority'] })
        }
        options={TASK_PRIORITIES.map((priority) => ({
          value: priority,
          label: getTaskPriorityLabel(priority),
        }))}
      />
    </div>
  )
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="all">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

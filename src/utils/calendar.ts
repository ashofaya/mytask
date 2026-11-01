import { addDaysToDateOnly, isValidDateOnly } from './dateTime'

function dateAtUtcMidnight(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  return date
}

export function startOfCalendarWeek(value: string): string {
  if (!isValidDateOnly(value)) {
    throw new Error('Tanggal kalender tidak valid.')
  }
  const day = dateAtUtcMidnight(value).getUTCDay()
  const daysSinceMonday = (day + 6) % 7
  return addDaysToDateOnly(value, -daysSinceMonday)
}

export function getWeekDates(value: string): string[] {
  const firstDay = startOfCalendarWeek(value)
  return Array.from({ length: 7 }, (_, index) =>
    addDaysToDateOnly(firstDay, index),
  )
}

export function getMonthDates(value: string): string[] {
  if (!isValidDateOnly(value)) {
    throw new Error('Tanggal kalender tidak valid.')
  }
  const [year, month] = value.split('-').map(Number)
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(0)
  lastDay.setUTCHours(0, 0, 0, 0)
  lastDay.setUTCFullYear(year, month, 0)
  const totalDays = lastDay.getUTCDate()
  const gridStart = startOfCalendarWeek(firstDay)
  const cellCount = Math.ceil(
    ((dateAtUtcMidnight(firstDay).getUTCDay() + 6) % 7 + totalDays) / 7,
  ) * 7
  return Array.from({ length: cellCount }, (_, index) =>
    addDaysToDateOnly(gridStart, index),
  )
}

export function shiftCalendarPeriod(
  value: string,
  direction: -1 | 1,
  view: 'month' | 'week',
): string {
  if (!isValidDateOnly(value)) {
    throw new Error('Tanggal kalender tidak valid.')
  }
  if (view === 'week') {
    return addDaysToDateOnly(value, direction * 7)
  }

  const [year, month, day] = value.split('-').map(Number)
  const targetMonth = month - 1 + direction
  const targetYear = year + Math.floor(targetMonth / 12)
  const normalizedMonth = ((targetMonth % 12) + 12) % 12
  const lastDay = new Date(0)
  lastDay.setUTCHours(0, 0, 0, 0)
  lastDay.setUTCFullYear(targetYear, normalizedMonth + 1, 0)
  const targetDay = Math.min(day, lastDay.getUTCDate())
  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, '0')}-${String(
    targetDay,
  ).padStart(2, '0')}`
}

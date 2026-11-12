import type { RecurringRule, TaskRecord } from '../types/database'
import {
  addDaysToDateOnly,
  BUSINESS_TIME_ZONE,
  formatDateJakarta,
  isValidDateOnly,
  todayJakarta,
} from './dateTime'
import { getTaskPriorityLabel, getTaskStatusLabel } from './taskLabels'

const GOOGLE_CALENDAR_RENDER_URL = 'https://calendar.google.com/calendar/render'
export const DEFAULT_REMINDER_EVENT_DURATION_MINUTES = 60

function toCompactDate(dateOnly: string): string {
  return dateOnly.replaceAll('-', '')
}

function formatUtcTimestampCompact(date: Date): string {
  return date.toISOString().replaceAll(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export function parseReminderToUtcDate(remindAt: string | null | undefined): Date | null {
  if (!remindAt || !remindAt.trim()) {
    return null
  }
  const trimmed = remindAt.trim()

  // Handle Jakarta datetime-local format (YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss) without offset
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const datePart = trimmed.slice(0, 10)
    if (!isValidDateOnly(datePart)) {
      return null
    }
    const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed
    const parsed = new Date(`${withSeconds}+07:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function buildTimedEventRange(
  reminderDate: Date,
  durationMinutes: number = DEFAULT_REMINDER_EVENT_DURATION_MINUTES,
): { startCompact: string; endCompact: string } {
  const endDate = new Date(reminderDate.getTime() + durationMinutes * 60 * 1000)
  return {
    startCompact: formatUtcTimestampCompact(reminderDate),
    endCompact: formatUtcTimestampCompact(endDate),
  }
}

function buildTaskDateRange(
  startDate: string | null,
  deadline: string | null,
  fallbackDate: string = todayJakarta(),
): { startCompact: string; endCompact: string } {
  const validStart = startDate && isValidDateOnly(startDate) ? startDate : null
  const validDeadline = deadline && isValidDateOnly(deadline) ? deadline : null

  const effectiveStart = validStart ?? validDeadline ?? fallbackDate
  const inclusiveEnd =
    validDeadline && validDeadline >= effectiveStart ? validDeadline : effectiveStart
  const exclusiveEnd = addDaysToDateOnly(inclusiveEnd, 1)

  return {
    startCompact: toCompactDate(effectiveStart),
    endCompact: toCompactDate(exclusiveEnd),
  }
}

function buildTaskDetails(
  task: Pick<TaskRecord, 'description' | 'priority' | 'status'> &
    Partial<Pick<TaskRecord, 'start_date' | 'deadline' | 'remind_at'>>,
  categoryName?: string,
): string {
  const lines: string[] = []
  if (task.description?.trim()) {
    lines.push(task.description.trim())
    lines.push('')
  }
  lines.push(`Prioritas: ${getTaskPriorityLabel(task.priority)}`)
  lines.push(`Status: ${getTaskStatusLabel(task.status)}`)
  if (categoryName) {
    lines.push(`Kategori: ${categoryName}`)
  }
  if (task.deadline && isValidDateOnly(task.deadline)) {
    lines.push(`Tenggat: ${formatDateJakarta(task.deadline)}`)
  }
  const reminderDate = parseReminderToUtcDate(task.remind_at)
  if (reminderDate) {
    lines.push(
      `Waktu pengingat: ${formatDateJakarta(reminderDate.toISOString(), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })} WIB`,
    )
  }
  lines.push('Dibuat dari MyTask')
  return lines.join('\n')
}

export function buildGoogleCalendarEventUrl(
  task: Pick<
    TaskRecord,
    'title' | 'description' | 'priority' | 'status' | 'start_date' | 'deadline'
  > &
    Partial<Pick<TaskRecord, 'remind_at'>>,
  categoryName?: string,
  fallbackDate: string = todayJakarta(),
  durationMinutes: number = DEFAULT_REMINDER_EVENT_DURATION_MINUTES,
): string {
  const reminderDate = parseReminderToUtcDate(task.remind_at)
  const { startCompact, endCompact } = reminderDate
    ? buildTimedEventRange(reminderDate, durationMinutes)
    : buildTaskDateRange(task.start_date, task.deadline, fallbackDate)

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: task.title,
    dates: `${startCompact}/${endCompact}`,
    details: buildTaskDetails(task, categoryName),
    ctz: BUSINESS_TIME_ZONE,
  })
  return `${GOOGLE_CALENDAR_RENDER_URL}?${params.toString()}`
}

export function buildGoogleCalendarRecurringUrl(
  rule: Pick<
    RecurringRule,
    'title' | 'description' | 'priority' | 'frequency' | 'start_date' | 'end_date'
  > &
    Partial<Pick<RecurringRule, 'reminder_offset_minutes'>>,
  categoryName?: string,
  durationMinutes: number = DEFAULT_REMINDER_EVENT_DURATION_MINUTES,
): string {
  const startDate = isValidDateOnly(rule.start_date) ? rule.start_date : todayJakarta()
  const nextDay = addDaysToDateOnly(startDate, 1)

  let startCompact: string
  let endCompact: string

  if (
    typeof rule.reminder_offset_minutes === 'number' &&
    Number.isFinite(rule.reminder_offset_minutes) &&
    rule.reminder_offset_minutes >= 0
  ) {
    const endOfStartDayJakarta = new Date(`${nextDay}T00:00:00+07:00`)
    const reminderStart = new Date(
      endOfStartDayJakarta.getTime() - rule.reminder_offset_minutes * 60 * 1000,
    )
    const timedRange = buildTimedEventRange(reminderStart, durationMinutes)
    startCompact = timedRange.startCompact
    endCompact = timedRange.endCompact
  } else {
    startCompact = toCompactDate(startDate)
    endCompact = toCompactDate(nextDay)
  }

  const freqMap: Record<RecurringRule['frequency'], string> = {
    daily: 'DAILY',
    weekly: 'WEEKLY',
    monthly: 'MONTHLY',
    yearly: 'YEARLY',
  }

  let rrule = `RRULE:FREQ=${freqMap[rule.frequency]}`
  if (rule.end_date && isValidDateOnly(rule.end_date)) {
    rrule += `;UNTIL=${toCompactDate(rule.end_date)}T235959Z`
  }

  const lines: string[] = []
  if (rule.description?.trim()) {
    lines.push(rule.description.trim())
    lines.push('')
  }
  lines.push(`Prioritas: ${getTaskPriorityLabel(rule.priority)}`)
  if (categoryName) {
    lines.push(`Kategori: ${categoryName}`)
  }
  lines.push('Aturan berulang dari MyTask')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: rule.title,
    dates: `${startCompact}/${endCompact}`,
    details: lines.join('\n'),
    ctz: BUSINESS_TIME_ZONE,
    recur: rrule,
  })

  return `${GOOGLE_CALENDAR_RENDER_URL}?${params.toString()}`
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll(/\r?\n/g, '\\n')
}

export function buildTasksIcsContent(
  tasks: Array<
    Pick<
      TaskRecord,
      | 'id'
      | 'title'
      | 'description'
      | 'priority'
      | 'status'
      | 'start_date'
      | 'deadline'
      | 'category_id'
    > &
      Partial<Pick<TaskRecord, 'remind_at'>>
  >,
  categories: Map<string, string> = new Map(),
  now: Date = new Date(),
): string {
  const dtStamp = formatUtcTimestampCompact(now)
  const fallbackDate = todayJakarta(now)
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MyTask//Google Calendar Export//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:MyTask',
    `X-WR-TIMEZONE:${BUSINESS_TIME_ZONE}`,
  ]

  for (const task of tasks) {
    const reminderDate = parseReminderToUtcDate(task.remind_at)
    if (!reminderDate && !task.deadline && !task.start_date) {
      continue
    }

    const categoryName = task.category_id ? categories.get(task.category_id) : undefined
    const description = buildTaskDetails(task, categoryName)

    lines.push('BEGIN:VEVENT', `UID:mytask-${task.id}@mytask.local`, `DTSTAMP:${dtStamp}`)

    if (reminderDate) {
      const { startCompact, endCompact } = buildTimedEventRange(reminderDate)
      lines.push(`DTSTART:${startCompact}`, `DTEND:${endCompact}`)
    } else {
      const { startCompact, endCompact } = buildTaskDateRange(
        task.start_date,
        task.deadline,
        fallbackDate,
      )
      lines.push(`DTSTART;VALUE=DATE:${startCompact}`, `DTEND;VALUE=DATE:${endCompact}`)
    }

    lines.push(
      `SUMMARY:${escapeIcsText(task.title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `STATUS:${task.status === 'Completed' ? 'CONFIRMED' : 'TENTATIVE'}`,
    )

    if (reminderDate) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeIcsText(task.title)}`,
        'TRIGGER:PT0M',
        'END:VALARM',
      )
    }

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}

export function downloadTasksIcs(
  tasks: Array<
    Pick<
      TaskRecord,
      | 'id'
      | 'title'
      | 'description'
      | 'priority'
      | 'status'
      | 'start_date'
      | 'deadline'
      | 'category_id'
    > &
      Partial<Pick<TaskRecord, 'remind_at'>>
  >,
  categories: Map<string, string> = new Map(),
  filename = 'mytask-google-calendar.ics',
): void {
  const icsContent = buildTasksIcsContent(tasks, categories)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

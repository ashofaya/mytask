import type { RecurringRule, TaskRecord } from '../types/database'
import { addDaysToDateOnly, BUSINESS_TIME_ZONE, isValidDateOnly, todayJakarta } from './dateTime'
import { getTaskPriorityLabel, getTaskStatusLabel } from './taskLabels'

const GOOGLE_CALENDAR_RENDER_URL = 'https://calendar.google.com/calendar/render'

function toCompactDate(dateOnly: string): string {
  return dateOnly.replaceAll('-', '')
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
  task: Pick<TaskRecord, 'description' | 'priority' | 'status'>,
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
  lines.push('Dibuat dari MyTask')
  return lines.join('\n')
}

export function buildGoogleCalendarEventUrl(
  task: Pick<
    TaskRecord,
    'title' | 'description' | 'priority' | 'status' | 'start_date' | 'deadline'
  >,
  categoryName?: string,
  fallbackDate: string = todayJakarta(),
): string {
  const { startCompact, endCompact } = buildTaskDateRange(
    task.start_date,
    task.deadline,
    fallbackDate,
  )
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
  >,
  categoryName?: string,
): string {
  const startDate = isValidDateOnly(rule.start_date) ? rule.start_date : todayJakarta()
  const startCompact = toCompactDate(startDate)
  const endCompact = toCompactDate(addDaysToDateOnly(startDate, 1))

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

function formatUtcTimestampIcs(date: Date): string {
  return date.toISOString().replaceAll(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
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
    >
  >,
  categories: Map<string, string> = new Map(),
  now: Date = new Date(),
): string {
  const dtStamp = formatUtcTimestampIcs(now)
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
    if (!task.deadline && !task.start_date) {
      continue
    }
    const { startCompact, endCompact } = buildTaskDateRange(
      task.start_date,
      task.deadline,
      fallbackDate,
    )
    const categoryName = task.category_id ? categories.get(task.category_id) : undefined
    const description = buildTaskDetails(task, categoryName)

    lines.push(
      'BEGIN:VEVENT',
      `UID:mytask-${task.id}@mytask.local`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${startCompact}`,
      `DTEND;VALUE=DATE:${endCompact}`,
      `SUMMARY:${escapeIcsText(task.title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `STATUS:${task.status === 'Completed' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT',
    )
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
    >
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

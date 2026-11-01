export const BUSINESS_TIME_ZONE = 'Asia/Jakarta'

function dateOnlyToUtc(year: number, month: number, day: number): Date {
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  return date
}

export function todayJakarta(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (type: 'year' | 'month' | 'day') =>
    parts.find((value) => value.type === type)?.value ?? ''

  return `${part('year')}-${part('month')}-${part('day')}`
}

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const [year, month, day] = value.split('-').map(Number)
  const parsed = dateOnlyToUtc(year, month, day)

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

export function addDaysToDateOnly(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = dateOnlyToUtc(year, month, day + days)

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

export function formatDateJakarta(
  value: string | null,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
): string {
  if (!value) {
    return 'Tanpa tanggal'
  }

  if (isValidDateOnly(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Intl.DateTimeFormat('id-ID', {
      ...options,
      timeZone: 'UTC',
    }).format(new Date(dateOnlyToUtc(year, month, day).getTime() + 12 * 60 * 60 * 1000))
  }

  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return 'Tanggal tidak valid'
  }

  return new Intl.DateTimeFormat('id-ID', {
    ...options,
    timeZone: BUSINESS_TIME_ZONE,
  }).format(timestamp)
}

export function formatJakartaDateTimeLocal(value: string | null): string {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)

  return parts.replace(' ', 'T')
}

export function jakartaDateTimeLocalToIso(value: string): string | null {
  if (!value) {
    return null
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error('Waktu pengingat tidak valid.')
  }

  const datePart = value.slice(0, 10)
  if (!isValidDateOnly(datePart)) {
    throw new Error('Tanggal pengingat tidak valid.')
  }
  const hour = Number(value.slice(11, 13))
  const minute = Number(value.slice(14, 16))
  if (hour > 23 || minute > 59) {
    throw new Error('Waktu pengingat tidak valid.')
  }

  return new Date(`${value}:00+07:00`).toISOString()
}

export function isPastJakartaDateTime(
  value: string,
  now: Date = new Date(),
): boolean {
  const parsed = jakartaDateTimeLocalToIso(value)
  return parsed !== null && new Date(parsed).getTime() <= now.getTime()
}

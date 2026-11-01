import type { RecurringFrequency, RecurringRule } from '../types/database'
import { addDaysToDateOnly, isValidDateOnly } from './dateTime'

function dateOnly(year: number, month: number, day: number): string {
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month, day)
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function daysInMonth(year: number, month: number): number {
  const lastDay = new Date(0)
  lastDay.setUTCHours(0, 0, 0, 0)
  lastDay.setUTCFullYear(year, month + 1, 0)
  return lastDay.getUTCDate()
}

export function getOccurrenceDate(
  startDate: string,
  frequency: RecurringFrequency,
  index: number,
): string | null {
  if (!isValidDateOnly(startDate) || !Number.isInteger(index) || index < 0) {
    return null
  }

  if (frequency === 'daily') {
    return addDaysToDateOnly(startDate, index)
  }
  if (frequency === 'weekly') {
    return addDaysToDateOnly(startDate, index * 7)
  }

  const [year, month, day] = startDate.split('-').map(Number)
  if (frequency === 'monthly') {
    const absoluteMonth = month - 1 + index
    const targetYear = year + Math.floor(absoluteMonth / 12)
    const targetMonth = absoluteMonth % 12
    return dateOnly(
      targetYear,
      targetMonth,
      Math.min(day, daysInMonth(targetYear, targetMonth)),
    )
  }

  const targetYear = year + index
  return dateOnly(targetYear, month - 1, Math.min(day, daysInMonth(targetYear, month - 1)))
}

export function getNextOccurrenceDate(
  rule: Pick<RecurringRule, 'start_date' | 'end_date' | 'frequency'>,
  index: number,
): string | null {
  const occurrenceDate = getOccurrenceDate(rule.start_date, rule.frequency, index)
  if (occurrenceDate === null || (rule.end_date && occurrenceDate > rule.end_date)) {
    return null
  }
  return occurrenceDate
}

export function getOccurrenceKey(ruleId: string, occurrenceDate: string): string {
  if (!isValidDateOnly(occurrenceDate)) {
    throw new Error('Tanggal occurrence tidak valid.')
  }
  return `${ruleId}_${occurrenceDate}`
}

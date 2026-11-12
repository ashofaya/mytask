import { describe, expect, it } from 'vitest'
import {
  buildGoogleCalendarEventUrl,
  buildGoogleCalendarRecurringUrl,
  buildTasksIcsContent,
} from './googleCalendar'

describe('googleCalendar utilities', () => {
  it('builds a Google Calendar template URL with exclusive all-day end date', () => {
    const url = new URL(
      buildGoogleCalendarEventUrl(
        {
          title: 'Siapkan presentasi Q4',
          description: 'Slide finansial dan roadmap',
          priority: 'High',
          status: 'To Do',
          start_date: null,
          deadline: '2026-11-15',
        },
        'Kantor',
      ),
    )

    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('text')).toBe('Siapkan presentasi Q4')
    expect(url.searchParams.get('dates')).toBe('20261115/20261116')
    expect(url.searchParams.get('ctz')).toBe('Asia/Jakarta')
    expect(url.searchParams.get('details')).toContain('Slide finansial dan roadmap')
    expect(url.searchParams.get('details')).toContain('Kategori: Kantor')
  })

  it('builds a recurring Google Calendar URL with RRULE and UNTIL', () => {
    const url = new URL(
      buildGoogleCalendarRecurringUrl({
        title: 'Evaluasi mingguan',
        description: null,
        priority: 'Medium',
        frequency: 'weekly',
        start_date: '2026-11-01',
        end_date: '2026-12-31',
      }),
    )

    expect(url.searchParams.get('dates')).toBe('20261101/20261102')
    expect(url.searchParams.get('recur')).toBe('RRULE:FREQ=WEEKLY;UNTIL=20261231T235959Z')
  })

  it('generates RFC 5545 ICS content for tasks with deadlines or start dates', () => {
    const ics = buildTasksIcsContent(
      [
        {
          id: 'task-1',
          title: 'Bayar tagihan, internet; bulanan',
          description: 'Via transfer\nBank',
          priority: 'High',
          status: 'To Do',
          start_date: '2026-11-12',
          deadline: '2026-11-14',
          category_id: 'cat-1',
        },
        {
          id: 'task-no-date',
          title: 'Ide backlog tanpa tanggal',
          description: null,
          priority: 'Low',
          status: 'To Do',
          start_date: null,
          deadline: null,
          category_id: null,
        },
      ],
      new Map([['cat-1', 'Keuangan']]),
      new Date('2026-11-12T08:00:00.000Z'),
    )

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('UID:mytask-task-1@mytask.local')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261112')
    expect(ics).toContain('DTEND;VALUE=DATE:20261115')
    expect(ics).toContain('SUMMARY:Bayar tagihan\\, internet\\; bulanan')
    expect(ics).not.toContain('task-no-date')
    expect(ics).toContain('END:VCALENDAR')
  })
})

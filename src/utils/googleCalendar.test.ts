import { describe, expect, it } from 'vitest'
import {
  buildGoogleCalendarEventUrl,
  buildGoogleCalendarRecurringUrl,
  buildTasksIcsContent,
} from './googleCalendar'

describe('googleCalendar utilities', () => {
  it('builds a timed Google Calendar event URL in UTC when remind_at (WIB) is provided', () => {
    // 2026-11-15 09:30 WIB (Asia/Jakarta, UTC+7) === 2026-11-15T02:30:00Z
    const urlFromLocalWib = new URL(
      buildGoogleCalendarEventUrl(
        {
          title: 'Rapat evaluasi sprint',
          description: 'Bahas target Q4',
          priority: 'High',
          status: 'To Do',
          start_date: '2026-11-12',
          deadline: '2026-11-15',
          remind_at: '2026-11-15T09:30',
        },
        'Kantor',
      ),
    )

    expect(urlFromLocalWib.origin + urlFromLocalWib.pathname).toBe(
      'https://calendar.google.com/calendar/render',
    )
    expect(urlFromLocalWib.searchParams.get('action')).toBe('TEMPLATE')
    expect(urlFromLocalWib.searchParams.get('text')).toBe('Rapat evaluasi sprint')
    // Start at 02:30:00Z (09:30 WIB), end 60 minutes later at 03:30:00Z (10:30 WIB)
    expect(urlFromLocalWib.searchParams.get('dates')).toBe(
      '20261115T023000Z/20261115T033000Z',
    )
    expect(urlFromLocalWib.searchParams.get('ctz')).toBe('Asia/Jakarta')
    expect(urlFromLocalWib.searchParams.get('details')).toContain('Waktu pengingat:')

    // Also verify ISO UTC string from Supabase database
    const urlFromIso = new URL(
      buildGoogleCalendarEventUrl({
        title: 'Rapat evaluasi sprint',
        description: null,
        priority: 'High',
        status: 'To Do',
        start_date: '2026-11-12',
        deadline: '2026-11-15',
        remind_at: '2026-11-15T02:30:00.000Z',
      }),
    )
    expect(urlFromIso.searchParams.get('dates')).toBe(
      '20261115T023000Z/20261115T033000Z',
    )
  })

  it('falls back to all-day start_date/deadline range when remind_at is empty', () => {
    const url = new URL(
      buildGoogleCalendarEventUrl(
        {
          title: 'Siapkan presentasi Q4',
          description: 'Slide finansial dan roadmap',
          priority: 'High',
          status: 'To Do',
          start_date: null,
          deadline: '2026-11-15',
          remind_at: null,
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

  it('generates RFC 5545 ICS content with timed VEVENT for tasks with remind_at and all-day VEVENT otherwise', () => {
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
          remind_at: null,
          category_id: 'cat-1',
        },
        {
          id: 'task-timed',
          title: 'Telepon klien',
          description: null,
          priority: 'Medium',
          status: 'To Do',
          start_date: '2026-11-12',
          deadline: '2026-11-15',
          remind_at: '2026-11-15T09:00',
          category_id: null,
        },
        {
          id: 'task-no-date',
          title: 'Ide backlog tanpa tanggal',
          description: null,
          priority: 'Low',
          status: 'To Do',
          start_date: null,
          deadline: null,
          remind_at: null,
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
    expect(ics).toContain('UID:mytask-task-timed@mytask.local')
    expect(ics).toContain('DTSTART:20261115T020000Z')
    expect(ics).toContain('DTEND:20261115T030000Z')
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics).toContain('SUMMARY:Bayar tagihan\\, internet\\; bulanan')
    expect(ics).not.toContain('task-no-date')
    expect(ics).toContain('END:VCALENDAR')
  })
})

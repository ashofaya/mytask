import { useCallback, useEffect, useRef, useState } from 'react'
import { claimDueReminder, listDueReminders } from '../services/reminderService'
import { getNotificationPermission, shouldPollReminders } from '../utils/reminderLogic'
import { useAuth } from './useAuth'

const POLL_INTERVAL_MS = 60_000

export function useReminderScheduler() {
  const { profile } = useAuth()
  const [permission, setPermission] = useState(() =>
    getNotificationPermission(
      typeof window !== 'undefined' && 'Notification' in window
        ? window.Notification
        : undefined,
    ),
  )
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef(false)
  const pollGenerationRef = useRef(0)
  const notificationsEnabled = profile?.notifications_enabled ?? false

  const refreshPermission = useCallback(() => {
    setPermission(
      getNotificationPermission(
        typeof window !== 'undefined' && 'Notification' in window
          ? window.Notification
          : undefined,
      ),
    )
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      return 'unsupported' as const
    }

    try {
      const nextPermission = await window.Notification.requestPermission()
      setPermission(nextPermission)
      return nextPermission
    } catch (permissionError) {
      setError(
        permissionError instanceof Error
          ? permissionError.message
          : 'Izin notifikasi tidak dapat diminta.',
      )
      refreshPermission()
      return getNotificationPermission(window.Notification)
    }
  }, [refreshPermission])

  const checkDueReminders = useCallback(async (generation: number) => {
    if (
      generation !== pollGenerationRef.current ||
      pollingRef.current ||
      !shouldPollReminders(notificationsEnabled, permission)
    ) {
      return
    }
    pollingRef.current = true
    try {
      const dueReminders = await listDueReminders()
      if (generation !== pollGenerationRef.current) return
      setError(null)
      for (const reminder of dueReminders) {
        if (generation !== pollGenerationRef.current) return
        let claimed = false
        try {
          claimed = await claimDueReminder(reminder.id)
        } catch (deliveryError) {
          if (generation !== pollGenerationRef.current) return
          setError(
            deliveryError instanceof Error
              ? `Pengingat “${reminder.title}” gagal diklaim: ${deliveryError.message}`
              : `Pengingat “${reminder.title}” gagal diklaim.`,
          )
          continue
        }
        if (!claimed || generation !== pollGenerationRef.current) continue
        try {
          const notification = new window.Notification(reminder.title, {
            body: 'Pengingat task MyTask',
            tag: `mytask-reminder-${reminder.id}`,
          })
          notification.onerror = () => {
            if (generation !== pollGenerationRef.current) return
            setError(
              `Pengingat “${reminder.title}” sudah diklaim, tetapi browser gagal menampilkannya. Reminder ini tidak akan dicoba ulang untuk mencegah duplikasi.`,
            )
          }
        } catch (notificationError) {
          if (generation !== pollGenerationRef.current) return
          setError(
            `Pengingat “${reminder.title}” sudah diklaim, tetapi browser gagal menampilkannya${
              notificationError instanceof Error
                ? `: ${notificationError.message}`
                : '.'
            } Reminder ini tidak akan dicoba ulang untuk mencegah duplikasi.`,
          )
        }
      }
    } catch (pollError) {
      if (generation !== pollGenerationRef.current) return
      setError(
        pollError instanceof Error
          ? `Pemeriksaan reminder gagal: ${pollError.message}`
          : 'Pemeriksaan reminder gagal.',
      )
    } finally {
      pollingRef.current = false
    }
  }, [notificationsEnabled, permission])

  useEffect(() => {
    const generation = ++pollGenerationRef.current
    const handleVisibility = () => {
      refreshPermission()
      if (document.visibilityState === 'visible') {
        void checkDueReminders(generation)
      }
    }
    window.addEventListener('focus', refreshPermission)
    document.addEventListener('visibilitychange', handleVisibility)
    if (shouldPollReminders(notificationsEnabled, permission)) {
      const initialCheck = window.setTimeout(
        () => void checkDueReminders(generation),
        0,
      )
      const interval = window.setInterval(
        () => void checkDueReminders(generation),
        POLL_INTERVAL_MS,
      )
      return () => {
        pollGenerationRef.current += 1
        window.clearTimeout(initialCheck)
        window.clearInterval(interval)
        window.removeEventListener('focus', refreshPermission)
        document.removeEventListener('visibilitychange', handleVisibility)
      }
    }
    return () => {
      pollGenerationRef.current += 1
      window.removeEventListener('focus', refreshPermission)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [checkDueReminders, notificationsEnabled, permission, refreshPermission])

  return { permission, error, requestPermission }
}

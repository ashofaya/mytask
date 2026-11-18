import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

export const VAULT_AUTO_LOCK_MS = 3 * 60 * 1000 // 3 menit

interface UseVaultLockOptions {
  timeoutMs?: number
  onLock?: () => void
}

export function useVaultLock({
  timeoutMs = VAULT_AUTO_LOCK_MS,
  onLock,
}: UseVaultLockOptions = {}) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [activePin, setActivePin] = useState<string | null>(null)
  const location = useLocation()
  const onLockRef = useRef(onLock)

  useEffect(() => {
    onLockRef.current = onLock
  }, [onLock])

  const lockNow = useCallback(() => {
    setIsUnlocked(false)
    setActivePin(null)
    onLockRef.current?.()
  }, [])

  const unlockWithPin = useCallback((verifiedPin: string) => {
    setActivePin(verifiedPin)
    setIsUnlocked(true)
  }, [])

  // Kunci otomatis saat berpindah route atau meninggalkan halaman Catatan
  useEffect(() => {
    return () => {
      setIsUnlocked(false)
      setActivePin(null)
      onLockRef.current?.()
    }
  }, [location.pathname])

  // Kunci otomatis saat tidak ada aktivitas selama 3 menit atau saat tab ditutup
  useEffect(() => {
    if (!isUnlocked) {
      return
    }

    let timerId = window.setTimeout(() => {
      lockNow()
    }, timeoutMs)

    const resetTimer = () => {
      window.clearTimeout(timerId)
      timerId = window.setTimeout(() => {
        lockNow()
      }, timeoutMs)
    }

    const handleBeforeUnload = () => {
      lockNow()
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ]

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, resetTimer, { passive: true })
    }
    window.addEventListener('pagehide', handleBeforeUnload)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.clearTimeout(timerId)
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, resetTimer)
      }
      window.removeEventListener('pagehide', handleBeforeUnload)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isUnlocked, lockNow, timeoutMs])

  return {
    isUnlocked,
    activePin,
    unlockWithPin,
    lockNow,
  }
}

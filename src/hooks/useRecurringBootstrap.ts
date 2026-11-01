import { useEffect, useState } from 'react'
import { generateActiveOccurrences } from '../services/recurringService'
import { useAuth } from './useAuth'

export function useRecurringBootstrap() {
  const { user } = useAuth()
  const userId = user?.id
  const [result, setResult] = useState<{
    userId: string
    error: string | null
  } | null>(null)

  useEffect(() => {
    if (!userId) return
    let active = true
    void generateActiveOccurrences()
      .catch((generationError: unknown) => {
        if (active) {
          setResult({
            userId,
            error:
              generationError instanceof Error
                ? `Occurrence recurring tidak dapat diperiksa: ${generationError.message}`
                : 'Occurrence recurring tidak dapat diperiksa.',
          })
        }
      })
      .finally(() => {
        if (active) {
          setResult((current) =>
            current && current.userId === userId && current.error
              ? current
              : { userId, error: null },
          )
        }
      })

    return () => {
      active = false
    }
  }, [userId])

  return {
    loading: Boolean(userId && result?.userId !== userId),
    error: result && result.userId === userId ? result.error : null,
  }
}

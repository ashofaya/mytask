import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import {
  getCurrentSession,
  setNewPassword,
  signOutFromSupabase,
} from '../services/authService'
import {
  getUserProfile,
  updateUserProfile,
  type UserProfile,
} from '../services/profileService'
import type { ProfileUpdate } from '../types/database'
import { AuthContext, type AuthContextValue } from './authContext'

const configurationError =
  'Supabase belum dikonfigurasi. Lengkapi environment variables untuk menggunakan autentikasi.'

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Terjadi kesalahan saat memulihkan sesi.'
}

function hasRecoveryCallback(): boolean {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash

  return new URLSearchParams(hash).get('type') === 'recovery'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [recoveryPending, setRecoveryPending] = useState(false)
  const [error, setError] = useState<string | null>(
    supabase ? null : configurationError,
  )
  const [profileState, setProfileState] = useState<{
    userId: string
    profile: UserProfile
  } | null>(null)
  const [profileErrorState, setProfileErrorState] = useState<{
    userId: string
    message: string
  } | null>(null)
  const user = session?.user ?? null
  const profile =
    profileState && profileState.userId === user?.id
      ? profileState.profile
      : null
  const profileError =
    profileErrorState && profileErrorState.userId === user?.id
      ? profileErrorState.message
      : null

  const refreshSession = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const currentSession = await getCurrentSession()
      setSession(currentSession)
      setRecoveryPending((current) => current || hasRecoveryCallback())
    } catch (sessionError) {
      setError(getErrorMessage(sessionError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      return
    }

    let active = true
    let authEventObserved = false
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, nextSession: Session | null) => {
        authEventObserved = true
        if (!active) {
          return
        }

        setSession(nextSession)
        if (event === 'PASSWORD_RECOVERY') {
          setRecoveryPending(true)
        } else if (event === 'SIGNED_OUT') {
          setRecoveryPending(false)
        }
      },
    )

    void getCurrentSession()
      .then((currentSession) => {
        if (active && !authEventObserved) {
          setSession(currentSession)
          setRecoveryPending(hasRecoveryCallback())
        }
      })
      .catch((sessionError: unknown) => {
        if (active) {
          setError(getErrorMessage(sessionError))
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true

    if (!user) {
      return
    }

    void getUserProfile(user)
      .then((nextProfile) => {
        if (active) {
          setProfileState({ userId: user.id, profile: nextProfile })
        }
      })
      .catch((profileLoadError: unknown) => {
        if (active) {
          setProfileErrorState({
            userId: user.id,
            message: getErrorMessage(profileLoadError),
          })
        }
      })

    return () => {
      active = false
    }
  }, [user])

  const signOut = useCallback(async () => {
    await signOutFromSupabase()
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    await setNewPassword(password)
  }, [])

  const finishRecovery = useCallback(() => {
    setRecoveryPending(false)
  }, [])

  const updateProfile = useCallback(
    async (input: ProfileUpdate) => {
      if (!user) {
        throw new Error('Sesi berakhir. Silakan masuk kembali.')
      }
      const updatedProfile = await updateUserProfile(user, input)
      setProfileState({ userId: user.id, profile: updatedProfile })
      setProfileErrorState(null)
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      recoveryPending,
      error,
      profileError,
      refreshSession,
      signOut,
      updatePassword,
      finishRecovery,
      updateProfile,
    }),
    [
      session,
      user,
      profile,
      loading,
      recoveryPending,
      error,
      profileError,
      refreshSession,
      signOut,
      updatePassword,
      finishRecovery,
      updateProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

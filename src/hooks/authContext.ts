import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { UserProfile } from '../services/profileService'
import type { ProfileUpdate } from '../types/database'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  recoveryPending: boolean
  error: string | null
  profileError: string | null
  refreshSession: () => Promise<void>
  signOut: () => Promise<void>
  updatePassword: (password: string) => Promise<void>
  finishRecovery: () => void
  updateProfile: (input: ProfileUpdate) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

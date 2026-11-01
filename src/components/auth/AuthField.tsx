import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface AuthFieldProps {
  label: string
  name: string
  type?: 'email' | 'password' | 'text'
  autoComplete?: string
  value: string
  error?: string
  onChange: (value: string) => void
}

export function AuthField({
  label,
  name,
  type = 'text',
  autoComplete,
  value,
  error,
  onChange,
}: AuthFieldProps) {
  const id = useId()
  const [passwordVisible, setPasswordVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && passwordVisible ? 'text' : type

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={inputType}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          required
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 aria-[invalid=true]:border-rose-400"
        />
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label={passwordVisible ? 'Sembunyikan password' : 'Tampilkan password'}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
}

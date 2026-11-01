import { LoaderCircle } from 'lucide-react'
import { Button } from '../ui/button'

export function AuthSubmitButton({
  children,
  loading,
  disabled = false,
}: {
  children: string
  loading: boolean
  disabled?: boolean
}) {
  return (
    <Button
      type="submit"
      disabled={loading || disabled}
      className="h-11 w-full rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      {loading && <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />}
      {loading ? 'Mohon tunggu…' : children}
    </Button>
  )
}

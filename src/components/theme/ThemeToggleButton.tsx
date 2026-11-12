import { Moon, Sun } from 'lucide-react'
import { Button } from '../ui/button'
import { useTheme } from './themeContext'

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Aktifkan tema ${nextTheme === 'dark' ? 'gelap' : 'terang'}`}
      title={`Aktifkan tema ${nextTheme === 'dark' ? 'gelap' : 'terang'}`}
      onClick={toggleTheme}
    >
      {theme === 'dark' ? (
        <Sun aria-hidden="true" className="size-4" />
      ) : (
        <Moon aria-hidden="true" className="size-4" />
      )}
    </Button>
  )
}

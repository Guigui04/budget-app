import { Moon, Sun, SunMoon } from 'lucide-react'
import { Segmented } from './Segmented'
import { useThemeStore, type ThemePreference } from '@/store/theme'

const icons = { light: Sun, dark: Moon, system: SunMoon }

interface ThemeToggleProps {
  variant?: 'segmented' | 'icon'
}

export function ThemeToggle({ variant = 'segmented' }: ThemeToggleProps) {
  const { preference, setPreference } = useThemeStore()

  if (variant === 'icon') {
    const order: ThemePreference[] = ['system', 'light', 'dark']
    const next = order[(order.indexOf(preference) + 1) % order.length]
    const Icon = icons[preference]
    return (
      <button className="icon-btn" aria-label="Changer de thème" onClick={() => setPreference(next)}>
        <Icon size={20} />
      </button>
    )
  }

  return (
    <Segmented
      value={preference}
      onChange={setPreference}
      options={[
        { value: 'light', label: 'Clair' },
        { value: 'dark', label: 'Sombre' },
        { value: 'system', label: 'Auto' },
      ]}
    />
  )
}

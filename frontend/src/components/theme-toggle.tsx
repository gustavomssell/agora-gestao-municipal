import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const next = theme === "dark" ? "claro" : "escuro"

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Ativar tema ${next}`}
      title={`Ativar tema ${next}`}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  )
}


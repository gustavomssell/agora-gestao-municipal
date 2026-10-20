import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { applyBranding, type Branding } from "@/lib/color"
import { ThemeContext, type Theme, type ThemeContextValue } from "@/lib/theme-context"

const THEME_KEY = "agora:theme"

function initialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_KEY)
    if (stored === "light" || stored === "dark") return stored
  } catch {
    // storage indisponível
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [branding, setBrandingState] = useState<Branding | null>(null)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    root.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    applyBranding(branding, theme === "dark")
  }, [branding, theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark"
      try {
        window.localStorage.setItem(THEME_KEY, next)
      } catch {
        // storage indisponível
      }
      return next
    })
  }, [])

  const setBranding = useCallback((next: Branding | null) => {
    setBrandingState(next)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme, setBranding }),
    [theme, toggleTheme, setBranding],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

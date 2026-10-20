import { createContext, useContext } from "react"
import type { Branding } from "@/lib/color"

export type Theme = "light" | "dark"

export interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setBranding: (branding: Branding | null) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme deve ser usado dentro de ThemeProvider")
  return context
}

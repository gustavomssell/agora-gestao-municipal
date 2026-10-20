export interface Branding {
  primary: string
  secondary: string
}

const fallbackBranding: Branding = { primary: "#123b33", secondary: "#c8a34a" }

const brandVars = [
  "--brand-primary",
  "--brand-secondary",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--accent",
  "--accent-foreground",
  "--ring",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-ring",
  "--signal",
  "--signal-foreground",
  "--chart-1",
  "--chart-2",
  "--status-progress",
] as const

export function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
  if (!match) return null
  const digits = match[1]
  const expanded =
    digits.length === 3
      ? digits
          .split("")
          .map((char) => char + char)
          .join("")
      : digits
  return `#${expanded.toLowerCase()}`
}

function toRgb(hex: string) {
  const value = normalizeHex(hex) ?? "#000000"
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  }
}

function toHex(channel: number) {
  return Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0")
}

function channelLuminance(value: number) {
  const normalized = value / 255
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

export function luminance(hex: string) {
  const { r, g, b } = toRgb(hex)
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

export function contrast(a: string, b: string) {
  const first = luminance(a)
  const second = luminance(b)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

export function mix(a: string, b: string, weight: number) {
  const from = toRgb(a)
  const to = toRgb(b)
  const t = Math.min(1, Math.max(0, weight))
  return `#${toHex(from.r + (to.r - from.r) * t)}${toHex(from.g + (to.g - from.g) * t)}${toHex(from.b + (to.b - from.b) * t)}`
}

export function foregroundFor(hex: string) {
  return contrast(hex, "#ffffff") >= contrast(hex, "#0b1512") ? "#ffffff" : "#0b1512"
}

function ensureContrast(hex: string, against: string, minimum: number, direction: "darken" | "lighten") {
  let result = hex
  for (let step = 0; step < 64 && contrast(result, against) < minimum; step += 1) {
    result = mix(result, direction === "darken" ? "#000000" : "#ffffff", 0.08)
  }
  return result
}

function ensureDark(hex: string, maximumLuminance: number) {
  let result = hex
  for (let step = 0; step < 64 && luminance(result) > maximumLuminance; step += 1) {
    result = mix(result, "#000000", 0.1)
  }
  return result
}

export function brandingVariables(branding: Branding, dark: boolean) {
  const primary = normalizeHex(branding.primary) ?? fallbackBranding.primary
  const secondary = normalizeHex(branding.secondary) ?? fallbackBranding.secondary
  const background = dark ? "#101a17" : "#f1f2ec"
  const surface = dark ? "#16211d" : "#fbfaf5"

  const strongPrimary = dark
    ? ensureContrast(mix(primary, "#ffffff", 0.5), background, 3.2, "lighten")
    : ensureContrast(primary, background, 4.5, "darken")
  const strongSecondary = dark
    ? ensureContrast(mix(secondary, "#ffffff", 0.28), background, 4.5, "lighten")
    : ensureContrast(secondary, background, 4.5, "darken")

  const sidebar = ensureDark(mix(primary, "#08120f", dark ? 0.72 : 0.62), 0.14)
  const sidebarAccent = ensureContrast(secondary, sidebar, 4.5, "lighten")

  const secondarySurface = dark ? mix(secondary, background, 0.8) : mix(secondary, surface, 0.88)

  return {
    "--brand-primary": primary,
    "--brand-secondary": secondary,
    "--primary": strongPrimary,
    "--primary-foreground": foregroundFor(strongPrimary),
    "--secondary": secondarySurface,
    "--secondary-foreground": dark ? "#edf2ec" : ensureContrast(secondary, surface, 4.5, "darken"),
    "--accent": dark ? mix(primary, background, 0.86) : mix(secondary, surface, 0.92),
    "--accent-foreground": dark ? "#edf2ec" : ensureContrast(primary, surface, 4.5, "darken"),
    "--ring": dark ? mix(strongPrimary, "#ffffff", 0.2) : mix(strongPrimary, background, 0.3),
    "--sidebar": sidebar,
    "--sidebar-foreground": "#e9efe9",
    "--sidebar-primary": sidebarAccent,
    "--sidebar-primary-foreground": foregroundFor(sidebarAccent),
    "--sidebar-ring": sidebarAccent,
    "--signal": strongSecondary,
    "--signal-foreground": foregroundFor(strongSecondary),
    "--chart-1": strongPrimary,
    "--chart-2": strongSecondary,
    "--status-progress": strongPrimary,
  }
}

export function applyBranding(branding: Branding | null, dark: boolean) {
  const root = document.documentElement
  if (!branding) {
    for (const name of brandVars) root.style.removeProperty(name)
    return
  }
  const variables = brandingVariables(branding, dark)
  for (const [name, value] of Object.entries(variables)) root.style.setProperty(name, value)
}

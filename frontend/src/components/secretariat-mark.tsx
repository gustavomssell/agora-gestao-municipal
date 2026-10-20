import { cn } from "@/lib/utils"

const fallbackColors = ["#123b33", "#4a6b7c", "#6e7b3f", "#9a6b16", "#a63a2b", "#5c665f"]

function hash(seed: string) {
  let value = 0
  for (let i = 0; i < seed.length; i += 1) value = (value * 31 + seed.charCodeAt(i)) % 997
  return value
}

export function SecretariatMark({
  name,
  acronym,
  color,
  className,
  size = "default",
}: {
  name: string
  acronym?: string
  color?: string
  className?: string
  size?: "xs" | "sm" | "default" | "lg"
}) {
  const letters = (acronym || name).slice(0, 3).toUpperCase()
  const background = color || fallbackColors[hash(name) % fallbackColors.length]
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm font-mono font-medium tracking-tight text-white",
        size === "xs" && "size-4 text-[0.5rem]",
        size === "sm" && "size-6 text-[0.6rem]",
        size === "default" && "size-8 text-[0.65rem]",
        size === "lg" && "size-11 text-xs",
        className,
      )}
      style={{ backgroundColor: background }}
    >
      {letters}
    </span>
  )
}

export function SecretariatTag({
  name,
  acronym,
  color,
  className,
}: {
  name: string
  acronym?: string
  color?: string
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-foreground", className)}>
      <SecretariatMark name={name} acronym={acronym} color={color} size="sm" />
      <span className="truncate">{acronym || name}</span>
    </span>
  )
}

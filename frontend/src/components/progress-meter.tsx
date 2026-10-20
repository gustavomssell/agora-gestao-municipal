import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { formatPercent } from "@/lib/format"

export function ProgressMeter({
  value,
  className,
  showValue = true,
  tone,
}: {
  value: number
  className?: string
  showValue?: boolean
  tone?: "default" | "late" | "done"
}) {
  const indicator =
    tone === "late"
      ? "bg-status-late"
      : tone === "done"
        ? "bg-status-done"
        : value >= 70
          ? "bg-status-done"
          : value >= 30
            ? "bg-primary"
            : "bg-signal"

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Progress
        value={Math.max(0, Math.min(100, value))}
        className="h-1.5 flex-1 bg-border"
        indicatorClassName={indicator}
      />
      {showValue ? <span className="w-9 text-right font-mono text-xs tabular text-muted-foreground">{formatPercent(value)}</span> : null}
    </div>
  )
}

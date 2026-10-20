import { Badge } from "@/components/ui/badge"
import {
  activityStatusClass,
  activityStatusLabels,
  priorityClass,
  priorityLabels,
  projectStatusClass,
  projectStatusLabels,
  roleClass,
} from "@/lib/format"
import { roleLabels } from "@/lib/roles"
import { cn } from "@/lib/utils"
import type { ActivityStatus, Priority, ProjectStatus, Role } from "@/types"

const base = "rounded-sm px-2 py-0.5 font-medium tracking-wide"

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(base, projectStatusClass[status], className)}>
      {projectStatusLabels[status]}
    </Badge>
  )
}

export function ActivityStatusBadge({ status, className }: { status: ActivityStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(base, activityStatusClass[status], className)}>
      {activityStatusLabels[status]}
    </Badge>
  )
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <Badge variant="outline" className={cn(base, priorityClass[priority], className)}>
      {priorityLabels[priority]}
    </Badge>
  )
}

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <Badge variant="outline" className={cn(base, roleClass[role], className)}>
      {roleLabels[role]}
    </Badge>
  )
}

export function CountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-6 items-center justify-center rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] tabular text-muted-foreground",
        className,
      )}
    >
      {count}
    </span>
  )
}

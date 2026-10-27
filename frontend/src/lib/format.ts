import { format, formatDistanceToNow, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ROLES } from "@/lib/roles"
import type { ActivityStatus, Priority, ProjectStatus, Role } from "@/types"

export const projectStatusLabels: Record<ProjectStatus, string> = {
  NAO_INICIADO: "Não iniciado",
  EM_ANDAMENTO: "Em andamento",
  EM_ATRASO: "Em atraso",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  CONCLUIDO: "Concluído",
  CONCLUIDO_COM_ATRASO: "Concluído com atraso",
  CANCELADO: "Cancelado",
  SUSPENSO: "Suspenso",
}

export const activityStatusLabels: Record<ActivityStatus, string> = {
  NAO_INICIADA: "Não iniciada",
  EM_ANDAMENTO: "Em andamento",
  EM_ATRASO: "Em atraso",
  CONCLUIDA: "Concluída",
  CONCLUIDA_COM_ATRASO: "Concluída com atraso",
  CANCELADA: "Cancelada",
  SUSPENSA: "Suspensa",
}

export const priorityLabels: Record<Priority, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
}

export const swotLabels = {
  FORCA: "Forças",
  FRAQUEZA: "Fraquezas",
  OPORTUNIDADE: "Oportunidades",
  AMEACA: "Ameaças",
} as const

export const projectStatusClass: Record<ProjectStatus, string> = {
  NAO_INICIADO: "border-status-neutral/30 bg-status-neutral/10 text-status-neutral",
  EM_ANDAMENTO: "border-status-progress/30 bg-status-progress/10 text-status-progress",
  EM_ATRASO: "border-status-late/30 bg-status-late/10 text-status-late",
  AGUARDANDO_APROVACAO: "border-chart-4/30 bg-chart-4/10 text-chart-4",
  CONCLUIDO: "border-status-done/30 bg-status-done/10 text-status-done",
  CONCLUIDO_COM_ATRASO: "border-status-warn/30 bg-status-warn/10 text-status-warn",
  CANCELADO: "border-status-muted/30 bg-status-muted/10 text-status-muted line-through",
  SUSPENSO: "border-status-warn/30 bg-status-warn/10 text-status-warn",
}

export const activityStatusClass: Record<ActivityStatus, string> = {
  NAO_INICIADA: projectStatusClass.NAO_INICIADO,
  EM_ANDAMENTO: projectStatusClass.EM_ANDAMENTO,
  EM_ATRASO: projectStatusClass.EM_ATRASO,
  CONCLUIDA: projectStatusClass.CONCLUIDO,
  CONCLUIDA_COM_ATRASO: projectStatusClass.CONCLUIDO_COM_ATRASO,
  CANCELADA: projectStatusClass.CANCELADO,
  SUSPENSA: projectStatusClass.SUSPENSO,
}

export const priorityClass: Record<Priority, string> = {
  BAIXA: "border-border bg-muted text-muted-foreground",
  MEDIA: "border-chart-4/30 bg-chart-4/10 text-chart-4",
  ALTA: "border-status-warn/30 bg-status-warn/10 text-status-warn",
  CRITICA: "border-status-late/30 bg-status-late/10 text-status-late",
}

export const roleClass: Record<Role, string> = {
  [ROLES.ADMIN]: "border-primary/30 bg-primary/10 text-primary",
  [ROLES.GESTOR]: "border-chart-4/30 bg-chart-4/10 text-chart-4",
  [ROLES.EDITOR]: "border-status-done/30 bg-status-done/10 text-status-done",
  [ROLES.GOVERNO]: "border-status-warn/30 bg-status-warn/10 text-status-warn",
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
const longFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" })


function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatDate(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? dateFormatter.format(date) : "—"
}

export function formatLongDate(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? longFormatter.format(date) : "—"
}

export function formatMonth(value: Date): string {
  return format(value, "MMM yy", { locale: ptBR }).replace(".", "")
}

export function formatRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return "Sem prazo definido"
  if (!start) return `até ${formatDate(end)}`
  if (!end) return `a partir de ${formatDate(start)}`
  return `${formatDate(start)} — ${formatDate(end)}`
}

export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? `${dateFormatter.format(date)} ${format(date, "HH:mm")}` : "—"
}

export function fromNow(value: string | null | undefined): string {
  const date = toDate(value)
  if (!date) return "—"
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR })
}

const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
const compactMoney = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
})

export function formatMoney(value: number | null | undefined): string {
  return moneyFormatter.format(value ?? 0)
}

export function formatMoneyCompact(value: number | null | undefined): string {
  return compactMoney.format(value ?? 0)
}

export function formatPercent(value: number | null | undefined): string {
  return `${Math.round(value ?? 0)}%`
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function toInputDate(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? format(date, "yyyy-MM-dd") : ""
}

export function startOfToday(): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

export function gutLevel(score: number): string {
  if (score >= 100) return "Crítico"
  if (score >= 60) return "Alto"
  if (score >= 30) return "Médio"
  return "Baixo"
}

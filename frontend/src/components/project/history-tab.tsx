import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, CalendarClock, History as HistoryIcon, ScrollText } from "lucide-react"
import { api } from "@/lib/api"
import { auditActionLabels, auditActionOptions } from "@/lib/audit"
import { formatDate, formatDateTime } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

const fieldLabels: Record<string, string> = {
  planned_start: "Início previsto",
  planned_end: "Término previsto",
}

export function HistoryTab({ projectId }: { projectId: number }) {
  const [logLimit, setLogLimit] = useState(200)
  const [actionFilter, setActionFilter] = useState("all")
  const { data, isLoading } = useQuery({
    queryKey: ["history", projectId, logLimit],
    queryFn: () => api.projectHistory(projectId, logLimit),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <Empty className="border border-border bg-card py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HistoryIcon />
          </EmptyMedia>
          <EmptyTitle>Histórico indisponível</EmptyTitle>
          <EmptyDescription>Não foi possível carregar o histórico do projeto.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const filteredLogs = actionFilter === "all" ? data.logs : data.logs.filter((log) => log.action === actionFilter)

  return (
    <div className="flex flex-col gap-8">
      {data.transfers.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="eyebrow flex items-center gap-2">
            <ArrowRight className="size-3.5" />
            Encaminhamentos
          </h3>
          <ol className="flex flex-col gap-2">
            {data.transfers.map((transfer) => (
              <li key={transfer.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{transfer.from_secretariat?.acronym ?? "—"}</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                  <span className="font-medium">{transfer.to_secretariat?.acronym ?? "—"}</span>
                  <span className="ml-auto font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                    {formatDateTime(transfer.created_at)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{transfer.note}</p>
                <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                  por {transfer.changed_by?.name ?? "—"}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {data.deadline_changes.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="eyebrow flex items-center gap-2">
            <CalendarClock className="size-3.5" />
            Alterações de prazo
          </h3>
          <ol className="flex flex-col gap-2">
            {data.deadline_changes.map((change) => (
              <li key={change.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm font-medium">{change.entity_name}</span>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
                    {change.entity_type} · {fieldLabels[change.field] ?? change.field}
                  </span>
                  <span className="ml-auto font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                    {formatDateTime(change.created_at)}
                  </span>
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="text-muted-foreground line-through">{formatDate(change.old_value)}</span>
                  <ArrowRight className="size-3 text-muted-foreground" />
                  <span className="text-foreground">{formatDate(change.new_value)}</span>
                </p>
                <p className="mt-2 border-l-2 border-signal pl-3 text-sm text-muted-foreground">{change.justification}</p>
                <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                  por {change.changed_by?.name ?? "—"}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="eyebrow flex items-center gap-2">
            <ScrollText className="size-3.5" />
            Trilha de auditoria
          </h3>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-56" aria-label="Filtrar histórico por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {auditActionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {filteredLogs.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            {data.logs.length === 0
              ? "Nenhum registro de auditoria para este projeto."
              : "Nenhum registro com o tipo selecionado."}
          </p>
        ) : (
          <ol className="relative flex flex-col border-l border-border pl-5">
            {filteredLogs.map((log) => (
              <li key={log.id} className="relative pb-5 last:pb-0">
                <span className="absolute -left-[1.4375rem] top-1.5 size-2 rounded-full border border-background bg-signal" />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm font-medium">{auditActionLabels[log.action] ?? log.action.replaceAll("_", " ").toLowerCase()}</span>
                  <span className="ml-auto font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{log.details}</p>
                <p className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                  {log.user_name} · {log.ip || "—"}
                </p>
              </li>
            ))}
          </ol>
        )}
        {data.logs_total > data.logs.length ? (
          <Button variant="outline" size="sm" className="self-start" onClick={() => setLogLimit((value) => value + 200)}>
            Carregar mais ({data.logs.length} de {data.logs_total})
          </Button>
        ) : null}
      </section>
    </div>
  )
}

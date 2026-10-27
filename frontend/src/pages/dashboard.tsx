import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2, CircleDollarSign, Plus } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatDate, formatMoney, formatMoneyCompact, formatPercent, fromNow, projectStatusLabels } from "@/lib/format"
import { ROLES } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/page-header"
import { ProjectStatusBadge } from "@/components/badges"
import { SecretariatMark } from "@/components/secretariat-mark"
import { ProgressMeter } from "@/components/progress-meter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { ProjectStatus } from "@/types"

const periods = [
  { value: "year", label: "Este ano" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "all", label: "Todo o histórico" },
]

const statusBar: Record<ProjectStatus, string> = {
  NAO_INICIADO: "bg-status-neutral",
  EM_ANDAMENTO: "bg-status-progress",
  EM_ATRASO: "bg-status-late",
  AGUARDANDO_APROVACAO: "bg-chart-4",
  CONCLUIDO: "bg-status-done",
  CONCLUIDO_COM_ATRASO: "bg-status-warn",
  CANCELADO: "bg-status-muted",
  SUSPENSO: "bg-status-warn",
}

export default function DashboardPage() {
  const { me } = useAuth()
  const [period, setPeriod] = useState("year")
  const [secretariatId, setSecretariatId] = useState("all")
  const [onlyMine, setOnlyMine] = useState(false)
  const canFilterSecretariat = me?.user.role === ROLES.ADMIN || me?.user.role === ROLES.GOVERNO
  const canLimitToOwn =
    (me?.user.role === ROLES.GESTOR || me?.user.role === ROLES.EDITOR) && Boolean(me?.user.secretariat_id)
  const mine = onlyMine && canLimitToOwn
  const secretariatsQuery = useQuery({
    queryKey: ["secretariats"],
    queryFn: api.secretariats,
    staleTime: 5 * 60 * 1000,
    enabled: canFilterSecretariat,
  })
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", period, secretariatId, mine],
    queryFn: () =>
      api.dashboard({
        period,
        secretariat_id: secretariatId === "all" ? undefined : Number(secretariatId),
        mine: mine || undefined,
      }),
  })

  const summary = data?.summary
  const byStatus = data?.by_status ?? []
  const bySecretariat = data?.by_secretariat ?? []
  const lateProjects = data?.late_projects ?? []
  const upcoming = data?.upcoming ?? []
  const recentLogs = data?.recent_logs ?? []
  const budgetPercent = summary?.budget_planned ? (summary.budget_executed / summary.budget_planned) * 100 : 0

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Situação do portfólio"
        description="Leitura rápida do que está em operação, do que exige decisão e do que já foi entregue à população."
        actions={
          <>
            {canFilterSecretariat ? (
              <Select value={secretariatId} onValueChange={setSecretariatId}>
                <SelectTrigger className="w-full sm:w-44 lg:w-52" aria-label="Filtrar por secretaria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todas as secretarias</SelectItem>
                    {secretariatsQuery.data?.items.map((secretariat) => (
                      <SelectItem key={secretariat.id} value={String(secretariat.id)}>
                        {secretariat.acronym} — {secretariat.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}
            {canLimitToOwn ? (
              <label htmlFor="dashboard-only-mine" className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
                <Checkbox
                  id="dashboard-only-mine"
                  checked={onlyMine}
                  onCheckedChange={(value) => setOnlyMine(value === true)}
                />
                Apenas meus
              </label>
            ) : null}
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-36 lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {periods.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {me?.permissions.can_create_project ? (
              <Button asChild className="w-full sm:w-auto">
                <Link to="/projetos/novo">
                  <Plus data-icon="inline-start" />
                  Novo projeto
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      {isError ? (
        <div className="flex items-start gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Não foi possível carregar o painel. Tente novamente em instantes.
        </div>
      ) : null}

      {isLoading || !summary ? (
        <div className="grid gap-4">
          <Skeleton className="h-52 w-full" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      ) : (
        <>
          <section className="page-grid relative overflow-hidden rounded-sm bg-sidebar text-sidebar-foreground">
            <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.2fr_1fr] lg:px-9 lg:py-8">
              <div className="flex flex-col justify-between gap-6">
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-sidebar-foreground/60">
                    Projetos em operação
                  </p>
                  <div className="mt-2 flex items-end gap-4">
                    <span className="font-heading text-6xl leading-none text-white">{summary.active}</span>
                    <span className="pb-1 text-sm text-sidebar-foreground/70">
                      de {summary.total} projetos no escopo
                    </span>
                  </div>
                </div>
                <div className="max-w-md">
                  <div className="flex items-center justify-between text-xs text-sidebar-foreground/75">
                    <span>Progresso médio dos ativos</span>
                    <span className="font-mono tabular text-white">{formatPercent(summary.average_progress)}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-signal" style={{ width: `${Math.min(100, summary.average_progress)}%` }} />
                  </div>
                  <p className="mt-3 text-xs text-sidebar-foreground/60">
                    {summary.activities_done} de {summary.activities_total} atividades concluídas
                    {summary.activities_late > 0 ? ` · ${summary.activities_late} em atraso` : ""}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/15 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <div>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-sidebar-foreground/60">Em atraso</p>
                  <p className={cn("mt-1 font-heading text-3xl", summary.late > 0 ? "text-[#e0887a]" : "text-white")}>
                    {summary.late}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60">projetos fora do prazo</p>
                </div>
                <div>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-sidebar-foreground/60">Entregues</p>
                  <p className="mt-1 font-heading text-3xl text-white">{summary.completed}</p>
                  <p className="text-xs text-sidebar-foreground/60">{summary.completed_period} no período</p>
                </div>
                <div>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-sidebar-foreground/60">Orçamento</p>
                  <p className="mt-1 font-heading text-3xl text-white">{formatMoneyCompact(summary.budget_executed)}</p>
                  <p className="text-xs text-sidebar-foreground/60">de {formatMoneyCompact(summary.budget_planned)} previstos</p>
                </div>
                <div>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-sidebar-foreground/60">Plano de governo</p>
                  <p className="mt-1 font-heading text-3xl text-white">
                    {summary.government_aligned}
                    <span className="text-base text-sidebar-foreground/60">/{summary.government_total}</span>
                  </p>
                  <p className="text-xs text-sidebar-foreground/60">projetos alinhados</p>
                </div>
                <div className="col-span-2 mt-1">
                  <div className="flex items-center justify-between text-xs text-sidebar-foreground/75">
                    <span>Execução orçamentária</span>
                    <span className="font-mono tabular text-white">{formatPercent(budgetPercent)}</span>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-white/60" style={{ width: `${Math.min(100, budgetPercent)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Distribuição por situação</CardTitle>
                <CardDescription>Como os {summary.total} projetos se distribuem hoje.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {byStatus.map((item) => {
                  const percent = summary.total ? (item.count / summary.total) * 100 : 0
                  return (
                    <div key={item.status} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm">{projectStatusLabels[item.status as ProjectStatus]}</span>
                        <span className="font-mono text-xs tabular text-muted-foreground">{item.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                            className={cn("h-full rounded-full", statusBar[item.status as ProjectStatus])}
                          style={{ width: `${Math.max(percent, 2)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {byStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem projetos no escopo.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Por secretaria</CardTitle>
                <CardDescription>Responsáveis e progresso consolidado.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {bySecretariat.map((secretariat) => (
                  <div key={secretariat.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <SecretariatMark name={secretariat.name} acronym={secretariat.acronym} color={secretariat.color} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{secretariat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {secretariat.total} projeto(s)
                          {secretariat.late > 0 ? ` · ${secretariat.late} em atraso` : ""}
                        </p>
                      </div>
                      <span className="font-mono text-xs tabular text-muted-foreground">{formatPercent(secretariat.progress)}</span>
                    </div>
                    <ProgressMeter value={secretariat.progress} showValue={false} tone={secretariat.late > 0 ? "late" : "default"} />
                  </div>
                ))}
                {bySecretariat.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem secretarias com projetos visíveis.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Atenção imediata</CardTitle>
                  <CardDescription>Projetos que já passaram do prazo.</CardDescription>
                </div>
                <AlertTriangle className="size-4 text-status-late" />
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {lateProjects.length ? (
                  <ul className="flex flex-col divide-y divide-border/70">
                    {lateProjects.map((project) => (
                      <li key={project.id}>
                        <Link to={`/projetos/${project.id}`} className="group flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                              {project.code}
                            </span>
                            <span className="font-mono text-[0.62rem] text-status-late">venceu {formatDate(project.planned_end)}</span>
                          </span>
                          <span className="flex items-start justify-between gap-2 text-sm leading-snug">
                            {project.name}
                            <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-status-done" />
                    Nenhum projeto em atraso.
                  </div>
                )}
                <Link
                  to="/projetos"
                  className="mt-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Ver portfólio completo
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </CardContent>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Prazos próximos</CardTitle>
                  <CardDescription>Vencimentos nos próximos 7 dias.</CardDescription>
                </div>
                <CalendarClock className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {upcoming.length ? (
                  <ul className="flex flex-col divide-y divide-border/70">
                    {upcoming.map((project) => (
                      <li key={project.id}>
                        <Link to={`/projetos/${project.id}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="truncate text-sm">{project.name}</p>
                            <p className="mt-0.5 font-mono text-[0.62rem] text-muted-foreground">
                              {project.code} · {project.responsible_secretariat?.acronym ?? "—"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <ProjectStatusBadge status={project.status} />
                            <span className="font-mono text-xs tabular text-muted-foreground">{formatDate(project.planned_end)}</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty className="py-8">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CalendarClock />
                      </EmptyMedia>
                      <EmptyTitle>Sem vencimentos na janela</EmptyTitle>
                      <EmptyDescription>Nenhum projeto vence nos próximos 7 dias.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
                <Link
                  to="/cronograma"
                  className="mt-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Abrir cronograma
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </CardContent>
            </Card>

            <Card className="lg:col-span-7">
              <CardHeader>
                <CardTitle className="text-base">Atividade recente</CardTitle>
                <CardDescription>Ações registradas no histórico do portfólio.</CardDescription>
              </CardHeader>
              <CardContent>
                {recentLogs.length ? (
                  <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
                    {recentLogs.map((log) => (
                      <li key={log.id} className="relative">
                        <span className="absolute -left-[1.36rem] top-1.5 size-2 rounded-full border border-background bg-primary" />
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                          <span className="font-medium">{log.user_name}</span>
                          <span className="text-muted-foreground">{log.details || log.action.toLowerCase().replaceAll("_", " ")}</span>
                        </div>
                        <p className="mt-0.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                          {fromNow(log.created_at)}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem movimentações recentes.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <CircleDollarSign className="size-3.5" />
              Orçamento executado: {formatMoney(summary.budget_executed)} de {formatMoney(summary.budget_planned)}
            </span>
            <Link to="/projetos" className="flex items-center gap-1 text-foreground hover:underline">
              Ver todos os projetos
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

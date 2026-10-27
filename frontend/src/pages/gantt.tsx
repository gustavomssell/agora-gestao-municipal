import { useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { addMonths, differenceInCalendarDays, eachMonthOfInterval, endOfMonth, startOfMonth } from "date-fns"
import { toPng } from "html-to-image"
import { CalendarRange, Download } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { formatDate, formatMonth, formatPercent, projectStatusLabels, startOfToday } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { ProjectStatus } from "@/types"

const barClass: Record<ProjectStatus, string> = {
  NAO_INICIADO: "bg-status-neutral/60",
  EM_ANDAMENTO: "bg-status-progress",
  EM_ATRASO: "bg-status-late",
  AGUARDANDO_APROVACAO: "bg-chart-4",
  CONCLUIDO: "bg-status-done",
  CONCLUIDO_COM_ATRASO: "bg-status-warn",
  CANCELADO: "bg-status-muted/50",
  SUSPENSO: "bg-status-warn/60",
}

const barText: Partial<Record<ProjectStatus, string>> = {
  EM_ANDAMENTO: "text-background",
  EM_ATRASO: "text-background",
  CONCLUIDO: "text-background",
  CONCLUIDO_COM_ATRASO: "text-[#241b06]",
}

export default function GanttPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const [secretariatId, setSecretariatId] = useState("all")
  const [exporting, setExporting] = useState(false)
  const secretariatsQuery = useQuery({ queryKey: ["secretariats"], queryFn: api.secretariats, staleTime: 5 * 60 * 1000 })
  const { data, isLoading } = useQuery({
    queryKey: ["gantt", secretariatId],
    queryFn: () => api.gantt({ secretariat_id: secretariatId === "all" ? undefined : Number(secretariatId) }),
  })

  const items = useMemo(() => data?.items ?? [], [data])

  const timeline = useMemo(() => {
    const dated = items
      .map((project) => {
        const start = project.planned_start ? new Date(project.planned_start) : project.planned_end ? new Date(project.planned_end) : null
        const end = project.planned_end ? new Date(project.planned_end) : start
        return start && end ? { project, start, end } : null
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

    if (dated.length === 0) return null

    let min = dated.reduce((acc, entry) => (entry.start < acc ? entry.start : acc), dated[0].start)
    let max = dated.reduce((acc, entry) => (entry.end > acc ? entry.end : acc), dated[0].end)
    min = startOfMonth(min)
    max = endOfMonth(max)
    if (differenceInCalendarDays(max, min) < 45) max = endOfMonth(addMonths(max, 1))

    const totalDays = Math.max(1, differenceInCalendarDays(max, min) + 1)
    const months = eachMonthOfInterval({ start: min, end: max }).map((month) => {
      const monthStart = month < min ? min : month
      const monthEnd = endOfMonth(month) > max ? max : endOfMonth(month)
      const days = differenceInCalendarDays(monthEnd, monthStart) + 1
      return { month, width: (days / totalDays) * 100 }
    })

    const bars = dated.map((entry) => {
      const offset = differenceInCalendarDays(entry.start, min)
      const length = Math.max(1, differenceInCalendarDays(entry.end, entry.start) + 1)
      return { ...entry, left: (offset / totalDays) * 100, width: Math.min(100, (length / totalDays) * 100) }
    })

    const today = startOfToday()
    const todayLeft = today >= min && today <= max ? (differenceInCalendarDays(today, min) / totalDays) * 100 : null
    const undatedProjects = items.filter(
      (project) => !project.planned_start && !project.planned_end,
    )

    return { min, max, months, bars, todayLeft, undatedProjects }
  }, [items])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cronograma"
        description="Prazos previstos lado a lado. Projetos sem data aparecem ao final para ajuste no cadastro."
        actions={
          <>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={!timeline || exporting}
              onClick={async () => {
                if (!chartRef.current) return
                setExporting(true)
                try {
                  const node = chartRef.current
                  const dataUrl = await toPng(node, {
                    cacheBust: true,
                    pixelRatio: 2,
                    width: node.scrollWidth,
                    height: node.scrollHeight,
                    backgroundColor: getComputedStyle(document.body).backgroundColor,
                  })
                  const link = document.createElement("a")
                  link.download = `agora-cronograma-${new Date().toISOString().slice(0, 10)}.png`
                  link.href = dataUrl
                  link.click()
                  toast.success("Imagem do cronograma gerada.")
                } catch {
                  toast.error("Não foi possível gerar a imagem do cronograma.")
                } finally {
                  setExporting(false)
                }
              }}
            >
              <Download data-icon="inline-start" />
              {exporting ? "Gerando…" : "Baixar imagem"}
            </Button>
            <Select value={secretariatId} onValueChange={setSecretariatId}>
              <SelectTrigger className="w-full sm:w-52" aria-label="Filtrar por secretaria">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todas secretarias</SelectItem>
                  {secretariatsQuery.data?.items.map((secretariat) => (
                    <SelectItem key={secretariat.id} value={String(secretariat.id)}>
                      {secretariat.acronym} · {secretariat.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </>
        }
      />


      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : !timeline ? (
        <Empty className="border border-border bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarRange />
            </EmptyMedia>
            <EmptyTitle>Nenhum projeto com prazo definido</EmptyTitle>
            <EmptyDescription>Cadastre início e término previstos para visualizar o cronograma.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div ref={chartRef} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-4 text-[0.68rem] text-muted-foreground">
            {(Object.keys(projectStatusLabels) as ProjectStatus[]).map((status) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-sm", barClass[status])} />
                {projectStatusLabels[status]}
              </span>
            ))}
            {timeline.todayLeft !== null ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-px bg-signal" />
                Hoje
              </span>
            ) : null}
            {timeline.undatedProjects.length > 0 ? (
              <span className="ml-auto font-mono">{timeline.undatedProjects.length} sem data</span>
            ) : null}
          </div>

          <div className="overflow-hidden overflow-x-auto rounded-xl border border-border bg-card">
            <div className="min-w-[56rem]">
              <div className="flex border-b border-border">
                <div className="w-48 shrink-0 border-r border-border px-4 py-2 md:w-72">
                  <span className="eyebrow">Projeto</span>
                </div>
                <div className="relative flex flex-1">
                  {timeline.months.map((entry) => (
                    <div
                      key={entry.month.toISOString()}
                      style={{ width: `${entry.width}%` }}
                      className="whitespace-nowrap border-r border-border/70 px-0.5 py-2 text-center font-mono text-[0.55rem] uppercase tracking-[0.1em] text-muted-foreground last:border-r-0 md:px-2 md:text-[0.6rem]"
                    >
                      {formatMonth(entry.month)}
                    </div>
                  ))}
                </div>
              </div>

              {timeline.bars.map(({ project, start, end, left, width }) => (
                <div key={project.id} className="flex border-b border-border/70 last:border-0">
                  <div className="w-48 shrink-0 border-r border-border px-4 py-2.5 md:w-72">
                    <Link to={`/projetos/${project.id}`} className="block truncate text-sm font-medium hover:text-primary" title={project.name}>
                      {project.name}
                    </Link>
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted-foreground">
                      {project.code}
                      {project.responsible_secretariat ? ` · ${project.responsible_secretariat.acronym}` : ""}
                    </span>
                  </div>
                  <div className="relative flex-1 py-2.5">
                    <div className="absolute inset-0 flex">
                      {timeline.months.map((entry) => (
                        <div
                          key={entry.month.toISOString()}
                          style={{ width: `${entry.width}%` }}
                          className="border-r border-border/40 last:border-r-0"
                        />
                      ))}
                    </div>
                    {timeline.todayLeft !== null ? (
                      <div
                        className="pointer-events-none absolute inset-y-0 z-10 w-px bg-signal/70"
                        style={{ left: `${timeline.todayLeft}%` }}
                        title="Hoje"
                      />
                    ) : null}
                    <div
                      className={cn("absolute top-1/2 flex h-5 -translate-y-1/2 items-center rounded-sm", barClass[project.status])}
                      style={{ left: `${left}%`, width: `${width}%`, minWidth: "0.5rem" }}
                      title={`${project.name}: ${formatDate(start.toISOString())} — ${formatDate(end.toISOString())} · ${formatPercent(project.progress)}`}
                    >
                      <span className={cn("truncate px-1.5 font-mono text-[0.55rem] uppercase tracking-[0.06em]", barText[project.status])}>
                        {barText[project.status] && project.progress >= 18 ? formatPercent(project.progress) : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Janela de {formatDate(timeline.min.toISOString())} a {formatDate(timeline.max.toISOString())}. Barras representam os prazos previstos;
            o percentual indica o progresso das atividades.
          </p>

          {timeline.undatedProjects.length ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">Projetos sem data</h2>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {timeline.undatedProjects.map((project) => (
                  <div key={project.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <Link to={`/projetos/${project.id}`} className="min-w-0 truncate text-sm hover:text-primary">
                      <span className="mr-2 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                        {project.code}
                      </span>
                      {project.name}
                    </Link>
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                      Definir prazo no cadastro
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

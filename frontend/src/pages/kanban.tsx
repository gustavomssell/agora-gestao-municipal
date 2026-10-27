import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { CalendarDays, Info, Plus, Search } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatDate, formatPercent, priorityLabels } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/page-header"
import { PriorityBadge } from "@/components/badges"
import { SecretariatMark } from "@/components/secretariat-mark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

const columnAccent: Record<string, string> = {
  nao_iniciado: "border-t-status-neutral",
  em_andamento: "border-t-status-progress",
  aguardando_aprovacao: "border-t-chart-4",
  concluido: "border-t-status-done",
}

export default function KanbanPage() {
  const { me } = useAuth()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [priority, setPriority] = useState("all")
  const [secretariatId, setSecretariatId] = useState("all")

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const secretariatsQuery = useQuery({ queryKey: ["secretariats"], queryFn: api.secretariats, staleTime: 5 * 60 * 1000 })
  const { data, isLoading } = useQuery({
    queryKey: ["kanban", debouncedSearch, priority, secretariatId],
    queryFn: () =>
      api.kanban({
        search: debouncedSearch || undefined,
        priority: priority === "all" ? undefined : priority,
        secretariat_id: secretariatId === "all" ? undefined : Number(secretariatId),
      }),
  })

  const columns = data?.columns ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Quadro kanban"
        description="Situação derivada das atividades: o projeto entra em andamento ao iniciar a primeira entrega, aguarda aprovação ao terminar as entregas e conclui após o aval das etapas."
        actions={
          me?.permissions.can_create_project ? (
            <Button asChild>
              <Link to="/projetos/novo">
                <Plus data-icon="inline-start" />
                Novo projeto
              </Link>
            </Button>
          ) : null
        }
      />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="size-3.5 shrink-0 text-muted-foreground" />
        Projetos suspensos ou cancelados ficam fora do quadro.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filtrar projetos no quadro"
            className="pl-9"
            aria-label="Filtrar projetos no quadro"
          />
        </div>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-40 sm:w-44" aria-label="Filtrar por prioridade">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todas prioridades</SelectItem>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={secretariatId} onValueChange={setSecretariatId}>
          <SelectTrigger className="w-40 sm:w-52" aria-label="Filtrar por secretaria">
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
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-80 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
            <section
              key={column.key}
              className={cn("flex flex-col gap-3 rounded-xl border border-t-2 border-border bg-muted/25 p-3", columnAccent[column.key])}
            >
              <header className="flex items-baseline justify-between gap-2 px-1">
                <h2 className="text-base font-medium">{column.title}</h2>
                <span className="font-mono text-xs tabular text-muted-foreground">{column.items.length}</span>
              </header>

              <div className="flex min-h-24 flex-col gap-2">
                {column.items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    Nenhum projeto nesta etapa.
                  </p>
                ) : (
                  column.items.map((project) => (
                    <Link
                      key={project.id}
                      to={`/projetos/${project.id}`}
                      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">{project.code}</span>
                        <PriorityBadge priority={project.priority} />
                      </div>
                      <h3 className="text-sm font-medium leading-snug group-hover:text-primary">{project.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-muted-foreground">
                        {project.responsible_secretariat ? (
                          <span className="flex items-center gap-1.5">
                            <SecretariatMark
                              name={project.responsible_secretariat.name}
                              acronym={project.responsible_secretariat.acronym}
                              color={project.responsible_secretariat.color}
                              size="xs"
                            />
                            {project.responsible_secretariat.acronym}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {formatDate(project.planned_end)}
                        </span>
                        <span className="ml-auto font-mono tabular">{formatPercent(project.progress)}</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            project.status === "EM_ATRASO"
                              ? "bg-status-late"
                              : project.status === "AGUARDANDO_APROVACAO"
                                ? "bg-chart-4"
                                : project.status === "CONCLUIDO"
                                  ? "bg-status-done"
                                  : project.status === "CONCLUIDO_COM_ATRASO"
                                    ? "bg-status-warn"
                                    : "bg-primary",
                          )}
                          style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }}
                        />
                      </div>
                      <span className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted-foreground">
                        {project.completed_count}/{project.activity_count} atividades
                        {project.status === "EM_ATRASO" ? <span className="text-status-late"> · em atraso</span> : null}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

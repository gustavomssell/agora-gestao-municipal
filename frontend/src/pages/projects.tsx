import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Landmark, Plus, Search, SlidersHorizontal, X } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatDate, formatPercent, priorityLabels, projectStatusLabels } from "@/lib/format"
import { PageHeader } from "@/components/page-header"
import { PeriodFields } from "@/components/period-fields"
import { PriorityBadge, ProjectStatusBadge } from "@/components/badges"
import { SecretariatMark } from "@/components/secretariat-mark"
import { ProgressMeter } from "@/components/progress-meter"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { ProjectStatus } from "@/types"

const statusOptions: { value: string; label: string }[] = [
  { value: "all", label: "Todas as situações" },
  ...Object.entries(projectStatusLabels).map(([value, label]) => ({ value, label })),
]

const priorityOptions = [
  { value: "all", label: "Todas as prioridades" },
  ...Object.entries(priorityLabels).map(([value, label]) => ({ value, label })),
]

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { me } = useAuth()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [priority, setPriority] = useState("all")
  const [secretariatId, setSecretariatId] = useState("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [overdue, setOverdue] = useState(false)
  const [includeCanceled, setIncludeCanceled] = useState(false)
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const filterIncludesCanceled = includeCanceled || status === "CANCELADO"

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, priority, secretariatId, overdue, filterIncludesCanceled])

  const secretariatsQuery = useQuery({
    queryKey: ["secretariats"],
    queryFn: api.secretariats,
    staleTime: 5 * 60 * 1000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ["projects", debouncedSearch, status, priority, secretariatId, from, to, overdue, filterIncludesCanceled, page],
    queryFn: () =>
      api.projects({
        search: debouncedSearch || undefined,
        status: status === "all" ? undefined : status,
        priority: priority === "all" ? undefined : priority,
        secretariat_id: secretariatId === "all" ? undefined : Number(secretariatId),
        from: from || undefined,
        to: to || undefined,
        overdue: overdue || undefined,
        include_canceled: filterIncludesCanceled || undefined,
        page,
        page_size: 20,
        sort: "updated",
      }),
  })

  const hasFilters = Boolean(debouncedSearch) || status !== "all" || priority !== "all" || secretariatId !== "all" || Boolean(from) || Boolean(to) || overdue || filterIncludesCanceled
  const totalPages = data ? Math.max(1, Math.ceil(data.total / 20)) : 1
  const projects = data?.items ?? []

  function resetFilters() {
    setSearch("")
    setStatus("all")
    setPriority("all")
    setSecretariatId("all")
    setFrom("")
    setTo("")
    setOverdue(false)
    setIncludeCanceled(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projetos"
        description="Todos os projetos visíveis para o seu perfil, com situação, prioridade, secretaria responsável e prazos."
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

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou código do projeto"
              className="pl-9"
              aria-label="Buscar projetos"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters((value) => !value)}>
            <SlidersHorizontal data-icon="inline-start" />
            Filtros
            {hasFilters ? <span className="ml-1 size-1.5 rounded-full bg-signal" /> : null}
          </Button>
          {hasFilters ? (
            <Button variant="ghost" onClick={resetFilters}>
              <X data-icon="inline-start" />
              Limpar
            </Button>
          ) : null}
        </div>

        {showFilters ? (
          <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full" aria-label="Filtrar por situação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full" aria-label="Filtrar por prioridade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={secretariatId} onValueChange={setSecretariatId}>
              <SelectTrigger className="w-full" aria-label="Filtrar por secretaria">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todas as secretarias</SelectItem>
                  {secretariatsQuery.data?.items.map((secretariat) => (
                    <SelectItem key={secretariat.id} value={String(secretariat.id)}>
                      {secretariat.acronym} · {secretariat.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <PeriodFields
              idPrefix="projects"
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />

            <div className="flex flex-col justify-center gap-2 text-sm">
              <label htmlFor="filter-overdue" className="flex items-center gap-2">
                <Checkbox
                  id="filter-overdue"
                  checked={overdue}
                  onCheckedChange={(value) => setOverdue(value === true)}
                />
                Somente em atraso
              </label>
              <label htmlFor="filter-canceled" className="flex items-center gap-2">
                <Checkbox
                  id="filter-canceled"
                  checked={filterIncludesCanceled}
                  disabled={status === "CANCELADO"}
                  onCheckedChange={(value) => setIncludeCanceled(value === true)}
                />
                Incluir cancelados
              </label>
            </div>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : projects.length ? (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-32">Código</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead className="hidden lg:table-cell">Secretaria</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="hidden md:table-cell">Prioridade</TableHead>
                    <TableHead className="w-40">Progresso</TableHead>
                    <TableHead className="hidden sm:table-cell">Prazo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/projetos/${project.id}`)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">{project.code}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium leading-snug">{project.name}</span>
                          <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
                            {project.activity_count} atividade(s)
                            {project.government_plan ? " · plano de governo" : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {project.responsible_secretariat ? (
                          <div className="flex items-center gap-2">
                            <SecretariatMark
                              name={project.responsible_secretariat.name}
                              acronym={project.responsible_secretariat.acronym}
                              color={project.responsible_secretariat.color}
                              size="sm"
                            />
                            <span className="max-w-[11rem] truncate text-xs text-muted-foreground" title={project.responsible_secretariat.name}>
                              {project.responsible_secretariat.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ProjectStatusBadge status={project.status as ProjectStatus} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <PriorityBadge priority={project.priority} />
                      </TableCell>
                      <TableCell>
                        <ProgressMeter value={project.progress} tone={project.status === "EM_ATRASO" ? "late" : "default"} />
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs tabular text-muted-foreground sm:table-cell">
                        {formatDate(project.planned_end)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link to={`/projetos/${project.id}`} className="flex flex-col gap-2.5 p-4 transition-colors hover:bg-muted/40">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                        {project.code}
                        {project.government_plan ? <Landmark className="size-3 text-status-warn" aria-label="Plano de governo" /> : null}
                      </span>
                      <ProjectStatusBadge status={project.status as ProjectStatus} />
                    </div>
                    <p className="font-medium leading-snug">{project.name}</p>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                        {project.responsible_secretariat ? (
                          <>
                            <SecretariatMark
                              name={project.responsible_secretariat.name}
                              acronym={project.responsible_secretariat.acronym}
                              color={project.responsible_secretariat.color}
                              size="xs"
                            />
                            <span className="truncate">{project.responsible_secretariat.name}</span>
                          </>
                        ) : (
                          "Sem secretaria"
                        )}
                      </span>
                      <PriorityBadge priority={project.priority} />
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressMeter
                        value={project.progress}
                        showValue={false}
                        tone={project.status === "EM_ATRASO" ? "late" : "default"}
                        className="flex-1"
                      />
                      <span className="font-mono text-xs tabular text-muted-foreground">{formatPercent(project.progress)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                      <span>
                        {project.completed_count}/{project.activity_count} atividades
                      </span>
                      <span>prazo {formatDate(project.planned_end)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {data?.total ?? 0} {(data?.total ?? 0) === 1 ? "projeto" : "projetos"} · página {data?.page ?? page} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                  <ChevronLeft data-icon="inline-start" />
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
                  Próxima
                  <ChevronRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <Empty className="border-0 py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
              </EmptyMedia>
              <EmptyTitle>Nenhum projeto encontrado</EmptyTitle>
              <EmptyDescription>
                {hasFilters
                  ? "Ajuste a busca e os filtros para ver outros projetos."
                  : "Ainda não há projetos cadastrados no seu escopo."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {hasFilters ? (
                <Button variant="outline" onClick={resetFilters}>
                  Limpar filtros
                </Button>
              ) : me?.permissions.can_create_project ? (
                <Button asChild>
                  <Link to="/projetos/novo">
                    <Plus data-icon="inline-start" />
                    Criar primeiro projeto
                  </Link>
                </Button>
              ) : null}
            </EmptyContent>
          </Empty>
        )}
      </div>
    </div>
  )
}

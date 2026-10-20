import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Building2, CalendarDays, Landmark, Search } from "lucide-react"
import { api } from "@/lib/api"
import { formatMoney, formatPercent, formatRange, projectStatusLabels, projectStatusClass } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export default function PublicTransparencyPage() {
  const { slug = "" } = useParams<{ slug: string }>()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [secretariatId, setSecretariatId] = useState("all")

  const query = useQuery({
    queryKey: ["public-transparency", slug, search, status, secretariatId],
    queryFn: () =>
      api.publicTransparency(slug, {
        search: search || undefined,
        status: status === "all" ? undefined : status,
        secretariat_id: secretariatId === "all" ? undefined : Number(secretariatId),
      }),
  })

  if (query.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-10">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-5 py-20 text-center">
        <h1 className="text-2xl font-medium">Portal não encontrado</h1>
        <p className="text-sm text-muted-foreground">Verifique o endereço ou entre em contato com a prefeitura.</p>
      </div>
    )
  }

  const { tenant, summary, projects, secretariats } = query.data

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-sm border border-white/25 bg-white/5">
              <Landmark className="size-5 text-sidebar-primary" />
            </div>
            <div>
              <p className="font-heading text-xl leading-none">{tenant.name}</p>
              <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-white/60">
                Portal da transparência · {tenant.city}
              </p>
            </div>
          </div>
          <div>
            <h1 className="font-heading text-3xl font-normal text-white md:text-4xl">Projetos do município</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
              Acompanhe o andamento, os prazos e a execução orçamentária dos projetos municipais.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Summary label="Projetos" value={summary.total} />
            <Summary label="Ativos" value={summary.active} />
            <Summary label="Em atraso" value={summary.late} />
            <Summary label="Concluídos" value={summary.completed} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-8">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou código"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todas as situações</SelectItem>
                {Object.entries(projectStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={secretariatId} onValueChange={setSecretariatId}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todas as secretarias</SelectItem>
                {secretariats.map((secretariat) => (
                  <SelectItem key={secretariat.id} value={String(secretariat.id)}>{secretariat.acronym}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {projects.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Nenhum projeto encontrado com esses filtros.</p>
        ) : (
          <div className="grid gap-3">
            {projects.map((project) => (
              <Card key={project.id} className="gap-0 py-0 transition-colors hover:border-primary/40">
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">{project.code}</span>
                      <span className={`border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] ${projectStatusClass[project.status]}`}>
                        {projectStatusLabels[project.status]}
                      </span>
                    </div>
                    <h2 className="mt-1 text-base font-medium">{project.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.objectives}</p>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="size-3" />{project.responsible_secretariat?.acronym ?? "—"}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="size-3" />{formatRange(project.planned_start, project.planned_end)}</span>
                      <span>{formatPercent(project.progress)} concluído</span>
                      <span>{formatMoney(project.budget_executed)} de {formatMoney(project.budget_planned)}</span>
                    </div>
                  </div>
                  <Link
                    to={`/transparencia/${slug}/projetos/${project.id}`}
                    className="flex w-fit items-center gap-1.5 border border-border px-3 py-2 text-sm hover:bg-muted"
                  >
                    Detalhes
                    <ArrowRight className="size-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Dados públicos atualizados pela administração municipal.
      </footer>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-white/15 bg-white/5 px-4 py-3">
      <p className="font-heading text-2xl text-white">{value}</p>
      <p className="mt-0.5 text-xs text-white/60">{label}</p>
    </div>
  )
}

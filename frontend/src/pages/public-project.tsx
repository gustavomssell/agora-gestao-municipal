import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, CircleDollarSign, Landmark, Target } from "lucide-react"
import { api } from "@/lib/api"
import { formatDate, formatMoney, formatPercent, formatRange, projectStatusClass, projectStatusLabels } from "@/lib/format"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

export default function PublicProjectPage() {
  const { slug = "", id = "" } = useParams<{ slug: string; id: string }>()
  const projectId = Number(id)

  const query = useQuery({
    queryKey: ["public-project", slug, projectId],
    queryFn: () => api.publicProject(slug, projectId),
    enabled: Number.isFinite(projectId),
  })

  if (query.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 py-10">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-3 px-5 py-20">
        <h1 className="text-2xl font-medium">Projeto não encontrado</h1>
        <Link to={`/transparencia/${slug}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Voltar ao portal
        </Link>
      </div>
    )
  }

  const { tenant, project, activities, milestones, contracts, payments, commitments } = query.data
  const paid = payments.reduce((total, payment) => total + payment.amount, 0)
  const committed = commitments.filter((item) => item.status !== "CANCELADO").reduce((total, item) => total + item.amount, 0)

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-8">
          <Link to={`/transparencia/${slug}`} className="flex w-fit items-center gap-1.5 text-xs text-white/60 hover:text-white">
            <ArrowLeft className="size-3.5" />
            {tenant.name}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-white/60">{project.code}</span>
            <span className={`border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] ${projectStatusClass[project.status]}`}>
              {projectStatusLabels[project.status]}
            </span>
          </div>
          <h1 className="font-heading text-3xl font-normal text-white md:text-4xl">{project.name}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/70">
            <span className="flex items-center gap-1.5"><Building2 className="size-3.5" />{project.responsible_secretariat?.name ?? "Sem secretaria"}</span>
            <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{formatRange(project.planned_start, project.planned_end)}</span>
            <span className="flex items-center gap-1.5"><Target className="size-3.5" />{formatPercent(project.progress)} concluído</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Previsto" value={formatMoney(project.budget_planned)} icon={Landmark} />
          <Metric label="Empenhado" value={formatMoney(committed)} icon={CircleDollarSign} />
          <Metric label="Pago" value={formatMoney(paid)} icon={CheckCircle2} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso</CardTitle>
            <CardDescription>{project.status === "EM_ATRASO" ? "Projeto em atraso" : "Execução atual"}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Progress value={project.progress} />
            <p className="text-xs text-muted-foreground">
              {formatPercent(project.progress)} concluído · atualizado em {formatDate(project.updated_at)}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Objetivo</CardTitle></CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              {project.objectives || project.justification || "Não informado."}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Plano de governo</CardTitle></CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              {project.government_plan ? project.government_plan_detail || "Vinculado ao plano de governo." : "Não vinculado ao plano de governo."}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Atividades</CardTitle></CardHeader>
          <CardContent className="p-0">
            {activities.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">Nenhuma atividade cadastrada.</p>
            ) : (
              <ul className="divide-y divide-border">
                {activities.map((activity) => (
                  <li key={activity.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{formatRange(activity.planned_start, activity.planned_end)}</p>
                    </div>
                    <span className="border border-border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                      {activity.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Marcos</CardTitle></CardHeader>
            <CardContent className="p-0">
              {milestones.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">Nenhum marco cadastrado.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {milestones.map((milestone) => (
                    <li key={milestone.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{milestone.name}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(milestone.due_date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Contratos</CardTitle></CardHeader>
            <CardContent className="p-0">
              {contracts.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">Nenhum contrato cadastrado.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {contracts.map((contract) => (
                    <li key={contract.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                      <span className="font-mono text-xs">{contract.number}</span>
                      <span className="min-w-0 flex-1 truncate">{contract.object}</span>
                      <span className="font-mono text-xs">{formatMoney(contract.value)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Landmark }) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="px-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" />{label}</p>
        <p className="mt-1 font-mono text-lg">{value}</p>
      </CardContent>
    </Card>
  )
}

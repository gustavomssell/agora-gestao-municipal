import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Landmark,
  ListChecks,
  Pencil,
  ScrollText,
  ShieldAlert,
  Target,
} from "lucide-react"
import { api } from "@/lib/api"
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatPercent,
  formatRange,
  priorityLabels,
} from "@/lib/format"
import { PageHeader } from "@/components/page-header"
import { PriorityBadge, ProjectStatusBadge } from "@/components/badges"
import { SecretariatMark } from "@/components/secretariat-mark"
import { ProgressMeter } from "@/components/progress-meter"
import { ProjectManageMenu } from "@/components/project/manage-menu"
import { ActivitiesTab } from "@/components/project/activities-tab"
import { ApprovalsTab } from "@/components/project/approvals-tab"
import { FinanceTab } from "@/components/project/finance-tab"
import { DocumentsTab } from "@/components/project/documents-tab"
import { PlanningTab } from "@/components/project/planning-tab"
import { StakeholdersTab } from "@/components/project/stakeholders-tab"
import { RisksTab } from "@/components/project/risks-tab"
import { ActionsTab } from "@/components/project/actions-tab"
import { SwotTab } from "@/components/project/swot-tab"
import { LessonsTab } from "@/components/project/lessons-tab"
import { AttachmentsTab } from "@/components/project/attachments-tab"
import { HistoryTab } from "@/components/project/history-tab"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const tabs = [
  { value: "visao", label: "Visão geral" },
  { value: "atividades", label: "Atividades" },
  { value: "aprovacoes", label: "Aprovações" },
  { value: "financeiro", label: "Financeiro" },
  { value: "documentos", label: "Documentos" },
  { value: "planejamento", label: "Planejamento" },
  { value: "stakeholders", label: "Partes interessadas" },
  { value: "riscos", label: "Riscos" },
  { value: "5w2h", label: "5W2H" },
  { value: "swot", label: "SWOT" },
  { value: "licoes", label: "Lições" },
  { value: "anexos", label: "Anexos" },
  { value: "historico", label: "Histórico" },
]

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.project(projectId),
    enabled: Number.isFinite(projectId),
  })
  const secretariatsQuery = useQuery({ queryKey: ["secretariats"], queryFn: api.secretariats, staleTime: 5 * 60 * 1000 })

  if (projectQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Projeto não encontrado" description="Ele pode ter sido excluído ou estar fora do seu escopo de acesso." />
        <Button variant="outline" asChild className="w-fit">
          <Link to="/projetos">
            <ArrowLeft data-icon="inline-start" />
            Voltar aos projetos
          </Link>
        </Button>
      </div>
    )
  }

  const { project, permissions } = projectQuery.data
  const secretariats = secretariatsQuery.data?.items ?? []
  const budgetUsage = project.budget_planned > 0 ? (project.budget_executed / project.budget_planned) * 100 : 0

  return (
    <div className="flex flex-col gap-6">
      <Link to="/projetos" className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Projetos
      </Link>

      <header className="flex flex-col gap-5 border-b border-border pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">{project.code}</span>
              <ProjectStatusBadge status={project.status} />
              <PriorityBadge priority={project.priority} />
              {project.government_plan ? (
                <span className="inline-flex items-center gap-1 border border-signal/40 bg-signal/10 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-status-warn">
                  <Landmark className="size-3" />
                  Plano de governo
                </span>
              ) : null}
            </div>
            <h1 className="text-3xl font-medium leading-tight md:text-[2.3rem]">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {project.responsible_secretariat ? (
                <span className="flex items-center gap-2">
                  <SecretariatMark
                    name={project.responsible_secretariat.name}
                    acronym={project.responsible_secretariat.acronym}
                    color={project.responsible_secretariat.color}
                    size="sm"
                  />
                  {project.responsible_secretariat.name}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {formatRange(project.planned_start, project.planned_end)}
              </span>
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em]">
                prioridade {priorityLabels[project.priority]}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {permissions.can_edit ? (
              <Button variant="outline" asChild>
                <Link to={`/projetos/${project.id}/editar`}>
                  <Pencil data-icon="inline-start" />
                  Editar
                </Link>
              </Button>
            ) : null}
            <ProjectManageMenu project={project} permissions={permissions} secretariats={secretariats} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">Progresso</span>
            <span className="font-mono text-sm tabular">{formatPercent(project.progress)}</span>
          </div>
          <ProgressMeter
            value={project.progress}
            showValue={false}
            tone={project.status === "EM_ATRASO" ? "late" : "default"}
          />
          <p className="text-xs text-muted-foreground">
            {project.completed_count} de {project.activity_count} atividades concluídas
            <span className="mx-1.5 text-border">·</span>
            {formatMoney(project.budget_executed)} de {formatMoney(project.budget_planned)} executados
          </p>
        </div>
      </header>

      <Tabs defaultValue="visao" className="gap-6">
        <div className="relative">
          <TabsList
            variant="line"
            aria-label="Seções do projeto"
            className="w-full flex-nowrap justify-start gap-x-5 overflow-x-auto overflow-y-hidden border-b border-border pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ height: "auto" }}
          >
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="h-auto flex-none px-0 pb-2.5 after:bottom-0">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent"
          />
        </div>

        <TabsContent value="visao" className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="gap-2 py-4">
              <CardHeader className="px-4">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <CalendarDays className="size-3.5" />
                  Cronograma
                </CardDescription>
                <CardTitle className="font-mono text-sm font-normal">{formatRange(project.planned_start, project.planned_end)}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 text-xs text-muted-foreground">
                Início real: {formatDate(project.real_start)} · Término real: {formatDate(project.real_end)}
              </CardContent>
            </Card>
            <Card className="gap-2 py-4">
              <CardHeader className="px-4">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <CircleDollarSign className="size-3.5" />
                  Orçamento
                </CardDescription>
                <CardTitle className="font-mono text-sm font-normal">{formatMoney(project.budget_planned)}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 px-4">
                <ProgressMeter value={budgetUsage} tone={budgetUsage > 100 ? "late" : "default"} />
                <span className="text-xs text-muted-foreground">
                  {formatMoney(project.budget_executed)} executados ({formatPercent(budgetUsage)})
                </span>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
            <div className="flex flex-col gap-4">
              {project.government_plan && project.government_plan_detail ? (
                <Card className="gap-3 border-signal/40 bg-signal/5 py-4">
                  <CardHeader className="px-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Landmark className="size-4 text-status-warn" />
                      Compromisso do plano de governo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 text-sm leading-relaxed">{project.government_plan_detail}</CardContent>
                </Card>
              ) : null}

              <Card className="gap-0 overflow-hidden py-0">
                <CardHeader className="border-b border-border px-4 py-3">
                  <CardTitle className="text-sm">Escopo do projeto</CardTitle>
                  <CardDescription>Definido no cadastro. Alterações exigem ação da administração.</CardDescription>
                </CardHeader>
                <div className="divide-y divide-border">
                  <ScopeRow icon={Target} title="Justificativa" body={project.justification} />
                  <ScopeRow icon={ListChecks} title="Objetivos" body={project.objectives} />
                  <ScopeRow icon={FileText} title="Requisitos" body={project.requirements} />
                  <ScopeRow icon={ShieldAlert} title="Avaliação de riscos" body={project.risk_assessment} />
                </div>
              </Card>
            </div>

            <aside className="flex flex-col gap-4">
              <Card className="gap-3 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-sm">Secretarias envolvidas</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 px-4">
                  {project.secretariats?.length ? (
                    project.secretariats.map((secretariat) => (
                      <div key={secretariat.id} className="flex items-center gap-2.5">
                        <SecretariatMark
                          name={secretariat.name}
                          acronym={secretariat.acronym}
                          color={secretariat.color}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm leading-tight">{secretariat.name}</p>
                          <p className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted-foreground">
                            {secretariat.id === project.responsible_secretariat_id ? "responsável" : secretariat.acronym}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhuma secretaria vinculada.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="gap-3 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-sm">Registro</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 px-4 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-3">
                    <span>Criado em</span>
                    <span className="font-mono text-foreground">{formatDateTime(project.created_at)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Atualizado em</span>
                    <span className="font-mono text-foreground">{formatDateTime(project.updated_at)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Secretarias</span>
                    <span className="text-foreground">{project.secretariats?.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Autor</span>
                    <span className="text-foreground">{project.created_by?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Identificador</span>
                    <span className="font-mono text-foreground">#{project.id}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="gap-2 py-4">
                <CardContent className="px-4">
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                    <ScrollText className="mt-0.5 size-3.5 shrink-0" />
                    Toda alteração neste projeto é registrada na trilha de auditoria e sincronizada em tempo real com a equipe.
                  </p>
                </CardContent>
              </Card>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="atividades">
          <ActivitiesTab projectId={project.id} canEdit={permissions.can_edit} />
        </TabsContent>
        <TabsContent value="aprovacoes">
          <ApprovalsTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="financeiro">
          <FinanceTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="documentos">
          <DocumentsTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="planejamento">
          <PlanningTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="stakeholders">
          <StakeholdersTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="riscos">
          <RisksTab projectId={project.id} canEdit={permissions.can_edit} />
        </TabsContent>
        <TabsContent value="5w2h">
          <ActionsTab projectId={project.id} canEdit={permissions.can_edit} />
        </TabsContent>
        <TabsContent value="swot">
          <SwotTab projectId={project.id} canEdit={permissions.can_edit} />
        </TabsContent>
        <TabsContent value="licoes">
          <LessonsTab projectId={project.id} canEdit={permissions.can_edit} />
        </TabsContent>
        <TabsContent value="anexos">
          <AttachmentsTab projectId={project.id} canEdit={permissions.can_edit} />
        </TabsContent>
        <TabsContent value="historico">
          <HistoryTab projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ScopeRow({ icon: Icon, title, body }: { icon: typeof Target; title: string; body: string }) {
  return (
    <div className="grid gap-2 px-4 py-4 md:grid-cols-[10rem_1fr] md:gap-6">
      <h3 className="flex items-center gap-2 text-sm font-medium leading-snug">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        {title}
      </h3>
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{body || "—"}</p>
    </div>
  )
}

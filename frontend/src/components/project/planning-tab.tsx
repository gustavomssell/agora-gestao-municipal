import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowRight, Flag, Gauge, GitBranch, Plus, Trash2 } from "lucide-react"
import { api, type IndicatorPayload, type MilestonePayload } from "@/lib/api"
import { formatDate, formatPercent, toInputDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type { Activity, Milestone, ProjectIndicator } from "@/types"

const milestoneStatuses = ["PENDENTE", "EM_ANDAMENTO", "CONCLUIDO", "ATRASADO", "CANCELADO"]

export function PlanningTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient()
  const [dependencyOpen, setDependencyOpen] = useState(false)
  const [milestoneEditing, setMilestoneEditing] = useState<Milestone | null | "new">(null)
  const [indicatorEditing, setIndicatorEditing] = useState<ProjectIndicator | null | "new">(null)

  const dependenciesQuery = useQuery({ queryKey: ["dependencies", projectId], queryFn: () => api.dependencies(projectId) })
  const milestonesQuery = useQuery({ queryKey: ["milestones", projectId], queryFn: () => api.milestones(projectId) })
  const indicatorsQuery = useQuery({ queryKey: ["indicators", projectId], queryFn: () => api.indicators(projectId) })
  const activitiesQuery = useQuery({ queryKey: ["activities", projectId], queryFn: () => api.activities(projectId) })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["dependencies", projectId] })
    queryClient.invalidateQueries({ queryKey: ["milestones", projectId] })
    queryClient.invalidateQueries({ queryKey: ["indicators", projectId] })
    queryClient.invalidateQueries({ queryKey: ["project", projectId] })
    queryClient.invalidateQueries({ queryKey: ["history", projectId] })
  }

  const removeDependency = useMutation({
    mutationFn: (id: number) => api.deleteDependency(id),
    onSuccess: () => {
      toast.success("Dependência removida.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })
  const removeMilestone = useMutation({
    mutationFn: (id: number) => api.deleteMilestone(id),
    onSuccess: () => {
      toast.success("Marco removido.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })
  const removeIndicator = useMutation({
    mutationFn: (id: number) => api.deleteIndicator(id),
    onSuccess: () => {
      toast.success("Indicador removido.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  if (dependenciesQuery.isLoading || milestonesQuery.isLoading || indicatorsQuery.isLoading) {
    return <Skeleton className="h-80 w-full" />
  }

  const dependencies = dependenciesQuery.data?.items ?? []
  const milestones = milestonesQuery.data?.items ?? []
  const indicators = indicatorsQuery.data?.items ?? []
  const activities = activitiesQuery.data?.items ?? []
  const canEdit = Boolean(dependenciesQuery.data?.can_edit)

  return (
    <div className="flex flex-col gap-5">
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <GitBranch className="size-4 text-muted-foreground" />
            Dependências entre atividades
          </CardTitle>
          {canEdit ? (
            <Button size="sm" variant="outline" onClick={() => setDependencyOpen(true)}>
              <Plus data-icon="inline-start" />
              Nova dependência
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {dependencies.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma dependência definida.</p>
          ) : (
            <ul className="divide-y divide-border">
              {dependencies.map((dependency) => (
                <li key={dependency.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{dependency.predecessor_title}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{dependency.successor_title}</span>
                  {canEdit ? (
                    <Button size="icon-sm" variant="ghost" onClick={() => removeDependency.mutate(dependency.id)} aria-label="Excluir dependência">
                      <Trash2 />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Flag className="size-4 text-muted-foreground" />
            Marcos
          </CardTitle>
          {canEdit ? (
            <Button size="sm" variant="outline" onClick={() => setMilestoneEditing("new")}>
              <Plus data-icon="inline-start" />
              Novo marco
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {milestones.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum marco cadastrado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {milestones.map((milestone) => (
                <li key={milestone.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{milestone.name}</p>
                    <p className="text-xs text-muted-foreground">{milestone.description || "Sem descrição"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(milestone.due_date)}</span>
                  <span className="border border-border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                    {milestone.status}
                  </span>
                  {canEdit ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setMilestoneEditing(milestone)}>Editar</Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => removeMilestone.mutate(milestone.id)} aria-label="Excluir marco">
                        <Trash2 />
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Gauge className="size-4 text-muted-foreground" />
            Indicadores
          </CardTitle>
          {canEdit ? (
            <Button size="sm" variant="outline" onClick={() => setIndicatorEditing("new")}>
              <Plus data-icon="inline-start" />
              Novo indicador
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {indicators.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum indicador cadastrado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {indicators.map((indicator) => {
                const percent = indicator.target > 0 ? (indicator.current / indicator.target) * 100 : 0
                return (
                  <li key={indicator.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{indicator.name}</p>
                        <p className="text-xs text-muted-foreground">{indicator.notes || "Sem observações"}</p>
                      </div>
                      <span className="font-mono text-sm">
                        {indicator.current} / {indicator.target} {indicator.unit}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{formatPercent(percent)}</span>
                      {canEdit ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setIndicatorEditing(indicator)}>Editar</Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => removeIndicator.mutate(indicator.id)} aria-label="Excluir indicador">
                            <Trash2 />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <Progress value={Math.min(percent, 100)} />
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <DependencyDialog
        projectId={projectId}
        activities={activities}
        open={dependencyOpen}
        onClose={() => setDependencyOpen(false)}
        onSaved={invalidate}
      />
      <MilestoneDialog
        key={milestoneEditing === "new" ? "new" : milestoneEditing?.id ?? "closed"}
        projectId={projectId}
        milestone={milestoneEditing === "new" ? null : milestoneEditing}
        open={milestoneEditing !== null}
        onClose={() => setMilestoneEditing(null)}
        onSaved={invalidate}
      />
      <IndicatorDialog
        key={indicatorEditing === "new" ? "new" : indicatorEditing?.id ?? "closed"}
        projectId={projectId}
        indicator={indicatorEditing === "new" ? null : indicatorEditing}
        open={indicatorEditing !== null}
        onClose={() => setIndicatorEditing(null)}
        onSaved={invalidate}
      />
    </div>
  )
}

function DependencyDialog({
  projectId,
  activities,
  open,
  onClose,
  onSaved,
}: {
  projectId: number
  activities: Activity[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [predecessor, setPredecessor] = useState("")
  const [successor, setSuccessor] = useState("")

  const mutation = useMutation({
    mutationFn: () => api.createDependency(projectId, { predecessor_id: Number(predecessor), successor_id: Number(successor) }),
    onSuccess: () => {
      toast.success("Dependência criada.")
      onClose()
      onSaved()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova dependência</DialogTitle>
          <DialogDescription>A atividade sucessora só deve começar após a predecessora.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel>Predecessora</FieldLabel>
            <Select value={predecessor} onValueChange={setPredecessor}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {activities.map((activity) => <SelectItem key={activity.id} value={String(activity.id)}>{activity.title}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Sucessora</FieldLabel>
            <Select value={successor} onValueChange={setSuccessor}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {activities.map((activity) => <SelectItem key={activity.id} value={String(activity.id)}>{activity.title}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !predecessor || !successor}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MilestoneDialog({
  projectId,
  milestone,
  open,
  onClose,
  onSaved,
}: {
  projectId: number
  milestone: Milestone | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(milestone?.name ?? "")
  const [description, setDescription] = useState(milestone?.description ?? "")
  const [dueDate, setDueDate] = useState(toInputDate(milestone?.due_date))
  const [status, setStatus] = useState<string>(milestone?.status ?? "PENDENTE")

  const mutation = useMutation({
    mutationFn: (payload: MilestonePayload) =>
      milestone ? api.updateMilestone(milestone.id, payload) : api.createMilestone(projectId, payload),
    onSuccess: () => {
      toast.success(milestone ? "Marco atualizado." : "Marco criado.")
      onClose()
      onSaved()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{milestone ? "Editar marco" : "Novo marco"}</DialogTitle>
          <DialogDescription>Marcos representam entregas relevantes do cronograma.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="milestone-name">Nome</FieldLabel>
            <Input id="milestone-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="milestone-description">Descrição</FieldLabel>
            <Textarea id="milestone-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="milestone-due">Data prevista</FieldLabel>
              <Input id="milestone-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {milestoneStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate({ name, description, due_date: dueDate || null, status })}
            disabled={mutation.isPending}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function IndicatorDialog({
  projectId,
  indicator,
  open,
  onClose,
  onSaved,
}: {
  projectId: number
  indicator: ProjectIndicator | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(indicator?.name ?? "")
  const [unit, setUnit] = useState(indicator?.unit ?? "")
  const [target, setTarget] = useState(String(indicator?.target ?? 0))
  const [current, setCurrent] = useState(String(indicator?.current ?? 0))
  const [notes, setNotes] = useState(indicator?.notes ?? "")

  const mutation = useMutation({
    mutationFn: (payload: IndicatorPayload) =>
      indicator ? api.updateIndicator(indicator.id, payload) : api.createIndicator(projectId, payload),
    onSuccess: () => {
      toast.success(indicator ? "Indicador atualizado." : "Indicador criado.")
      onClose()
      onSaved()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{indicator ? "Editar indicador" : "Novo indicador"}</DialogTitle>
          <DialogDescription>Acompanhe a meta e o valor atual do resultado.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="indicator-name">Nome</FieldLabel>
            <Input id="indicator-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="indicator-unit">Unidade</FieldLabel>
              <Input id="indicator-unit" value={unit} onChange={(event) => setUnit(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="indicator-target">Meta</FieldLabel>
              <Input id="indicator-target" type="number" step="0.01" value={target} onChange={(event) => setTarget(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="indicator-current">Atual</FieldLabel>
              <Input id="indicator-current" type="number" step="0.01" value={current} onChange={(event) => setCurrent(event.target.value)} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="indicator-notes">Observações</FieldLabel>
            <Textarea id="indicator-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate({ name, unit, target: Number(target), current: Number(current), notes })}
            disabled={mutation.isPending}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

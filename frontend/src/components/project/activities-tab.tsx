import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { CalendarRange, Check, CirclePlay, MoreHorizontal, Paperclip, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { api, type ActivityPayload } from "@/lib/api"
import { activitySchema, type ActivityFormValues } from "@/lib/schemas"
import { activityStatusLabels, formatDate, toInputDate } from "@/lib/format"
import { ROLES } from "@/lib/roles"
import { useAuth } from "@/lib/auth"
import { ActivityStatusBadge } from "@/components/badges"
import { ActivityAttachmentsDialog } from "@/components/project/activity-attachments-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type { Activity } from "@/types"

interface ActivitiesTabProps {
  projectId: number
  canEdit: boolean
}

const emptyForm: ActivityFormValues = {
  title: "",
  description: "",
  planned_start: "",
  planned_end: "",
  deadline_justification: "",
}

export function ActivitiesTab({ projectId, canEdit }: ActivitiesTabProps) {
  const queryClient = useQueryClient()
  const { me } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [attachmentsActivity, setAttachmentsActivity] = useState<Activity | null>(null)

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: emptyForm,
  })
  const errors = form.formState.errors
  const pending = form.formState.isSubmitting

  const { data, isLoading } = useQuery({
    queryKey: ["activities", projectId],
    queryFn: () => api.activities(projectId),
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.deleteActivity(id),
    onSuccess: () => {
      toast.success("Atividade removida.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["activities", projectId] })
    queryClient.invalidateQueries({ queryKey: ["project", projectId] })
    queryClient.invalidateQueries({ queryKey: ["projects"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["kanban"] })
    queryClient.invalidateQueries({ queryKey: ["history", projectId] })
  }

  function openCreate() {
    setEditing(null)
    form.reset(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(activity: Activity) {
    setEditing(activity)
    form.reset({
      title: activity.title,
      description: activity.description,
      planned_start: toInputDate(activity.planned_start),
      planned_end: toInputDate(activity.planned_end),
      deadline_justification: "",
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: ActivityFormValues) {
    if (editing) {
      const datesChanged =
        values.planned_start !== toInputDate(editing.planned_start) || values.planned_end !== toInputDate(editing.planned_end)
      if (datesChanged && values.deadline_justification.trim().length < 5) {
        form.setError("deadline_justification", { message: "Justifique a alteração de prazo." })
        return
      }
    }
    const payload: ActivityPayload = {
      title: values.title.trim(),
      description: values.description.trim(),
      planned_start: values.planned_start || null,
      planned_end: values.planned_end || null,
      deadline_justification: values.deadline_justification.trim() || undefined,
    }
    try {
      if (editing) {
        await api.updateActivity(editing.id, payload)
        toast.success("Atividade atualizada.")
      } else {
        await api.createActivity(projectId, payload)
        toast.success("Atividade criada.")
      }
      setDialogOpen(false)
      invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a atividade.")
    }
  }

  async function applyAction(activity: Activity, action: "start" | "complete" | "reopen") {
    try {
      await api.updateActivity(activity.id, {
        title: activity.title,
        description: activity.description,
        planned_start: toInputDate(activity.planned_start) || null,
        planned_end: toInputDate(activity.planned_end) || null,
        action,
      })
      toast.success(action === "complete" ? "Atividade concluída." : action === "start" ? "Atividade iniciada." : "Atividade reaberta.")
      invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a atividade.")
    }
  }

  const activities = data?.items ?? []
  const done = activities.filter((activity) => activity.status === "CONCLUIDA" || activity.status === "CONCLUIDA_COM_ATRASO").length

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-foreground">{done}</span> de {activities.length} atividades concluídas
        </p>
        {canEdit ? (
          <Button size="sm" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            Nova atividade
          </Button>
        ) : null}
      </div>

      {activities.length === 0 ? (
        <Empty className="border border-border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarRange />
            </EmptyMedia>
            <EmptyTitle>Nenhuma atividade cadastrada</EmptyTitle>
            <EmptyDescription>Divida o projeto em entregas com datas para acompanhar o progresso e o atraso.</EmptyDescription>
          </EmptyHeader>
          {canEdit ? (
            <EmptyContent>
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                Criar primeira atividade
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {activities.map((activity, index) => {
            const isDone = activity.status === "CONCLUIDA" || activity.status === "CONCLUIDA_COM_ATRASO"
            return (
              <li key={activity.id}>
                <Card className="gap-0 py-0">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                    <span className="mt-0.5 hidden size-6 shrink-0 items-center justify-center border border-border font-mono text-[0.65rem] text-muted-foreground sm:flex">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={isDone ? "font-medium text-muted-foreground line-through" : "font-medium"}>{activity.title}</h3>
                        <ActivityStatusBadge status={activity.status} />
                        {activity.is_late ? (
                          <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-status-late">em atraso</span>
                        ) : null}
                      </div>
                      {activity.description ? (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{activity.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">
                        <span>previsto {formatDate(activity.planned_start)} → {formatDate(activity.planned_end)}</span>
                        {activity.real_start ? <span>início real {formatDate(activity.real_start)}</span> : null}
                        {activity.real_end ? <span>fim real {formatDate(activity.real_end)}</span> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Anexos da atividade ${activity.title}`}
                        onClick={() => setAttachmentsActivity(activity)}
                      >
                        <Paperclip />
                      </Button>
                      {canEdit ? (
                        <>
                          {!isDone ? (
                            <Button
                              size="sm"
                              variant={activity.status === "EM_ANDAMENTO" || activity.status === "EM_ATRASO" ? "default" : "outline"}
                              onClick={() => applyAction(activity, activity.status === "EM_ANDAMENTO" || activity.status === "EM_ATRASO" ? "complete" : "start")}
                            >
                              {activity.status === "EM_ANDAMENTO" || activity.status === "EM_ATRASO" ? (
                                <>
                                  <Check data-icon="inline-start" />
                                  Concluir
                                </>
                              ) : (
                                <>
                                  <CirclePlay data-icon="inline-start" />
                                  Iniciar
                                </>
                              )}
                            </Button>
                          ) : me?.user.role === ROLES.ADMIN ? (
                            <Button size="sm" variant="outline" onClick={() => applyAction(activity, "reopen")}>
                              <RotateCcw data-icon="inline-start" />
                              Reabrir
                            </Button>
                          ) : null}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon-sm" variant="ghost" aria-label={`Ações da atividade ${activity.title}`}>
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => openEdit(activity)}>
                                <Pencil />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => {
                                  if (window.confirm(`Remover a atividade "${activity.title}"?`)) {
                                    removeMutation.mutate(activity.id)
                                  }
                                }}
                              >
                                <Trash2 />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <ActivityAttachmentsDialog
        activity={attachmentsActivity}
        canEdit={canEdit}
        open={Boolean(attachmentsActivity)}
        onOpenChange={(open) => {
          if (!open) setAttachmentsActivity(null)
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar atividade" : "Nova atividade"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? `Situação atual: ${activityStatusLabels[editing.status]}. Alterações de prazo exigem justificativa.`
                  : "Descreva uma entrega concreta com início e término previstos."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Field data-invalid={Boolean(errors.title)}>
                <FieldLabel htmlFor="activity-title">Título</FieldLabel>
                <Input
                  id="activity-title"
                  aria-invalid={Boolean(errors.title)}
                  placeholder="Ex.: Licitar serviços de pavimentação"
                  {...form.register("title")}
                />
                <FieldError errors={[errors.title]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="activity-description">Descrição</FieldLabel>
                <Textarea
                  id="activity-description"
                  rows={3}
                  placeholder="Escopo, entregáveis e observações"
                  {...form.register("description")}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.planned_start)}>
                  <FieldLabel htmlFor="activity-start">Início previsto</FieldLabel>
                  <Input id="activity-start" type="date" aria-invalid={Boolean(errors.planned_start)} {...form.register("planned_start")} />
                  <FieldError errors={[errors.planned_start]} />
                </Field>
                <Field data-invalid={Boolean(errors.planned_end)}>
                  <FieldLabel htmlFor="activity-end">Término previsto</FieldLabel>
                  <Input id="activity-end" type="date" aria-invalid={Boolean(errors.planned_end)} {...form.register("planned_end")} />
                  <FieldError errors={[errors.planned_end]} />
                </Field>
              </div>
              {editing ? (
                <Field data-invalid={Boolean(errors.deadline_justification)}>
                  <FieldLabel htmlFor="activity-justification">Justificativa da alteração de prazo</FieldLabel>
                  <Textarea
                    id="activity-justification"
                    rows={2}
                    aria-invalid={Boolean(errors.deadline_justification)}
                    placeholder="Obrigatória somente se as datas mudarem"
                    {...form.register("deadline_justification")}
                  />
                  <FieldDescription>Registrada no histórico e notifica os envolvidos.</FieldDescription>
                  <FieldError errors={[errors.deadline_justification]} />
                </Field>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {editing ? "Salvar" : "Criar atividade"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

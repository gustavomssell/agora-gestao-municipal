import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { ListTodo, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { api, type ActionPayload } from "@/lib/api"
import { actionSchema, type ActionFormValues } from "@/lib/schemas"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type { Action5W2H, Risk } from "@/types"

const actionStatusLabels: Record<string, string> = {
  PLANEJADA: "Planejada",
  EM_EXECUCAO: "Em execução",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
}

const actionStatusClass: Record<string, string> = {
  PLANEJADA: "border-border bg-muted text-muted-foreground",
  EM_EXECUCAO: "border-status-progress/30 bg-status-progress/10 text-status-progress",
  CONCLUIDA: "border-status-done/30 bg-status-done/10 text-status-done",
  CANCELADA: "border-status-muted/30 bg-status-muted/10 text-status-muted line-through",
}

interface ActionsTabProps {
  projectId: number
  canEdit: boolean
}

const emptyForm: ActionFormValues = {
  risk_id: "none",
  what: "",
  why: "",
  where: "",
  when: "",
  who: "",
  how: "",
  how_much: "",
  status: "PLANEJADA",
}

export function ActionsTab({ projectId, canEdit }: ActionsTabProps) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Action5W2H | null>(null)

  const form = useForm<ActionFormValues>({
    resolver: zodResolver(actionSchema),
    defaultValues: emptyForm,
  })
  const errors = form.formState.errors
  const pending = form.formState.isSubmitting

  const { data, isLoading } = useQuery({ queryKey: ["actions", projectId], queryFn: () => api.actions(projectId) })
  const risksQuery = useQuery({ queryKey: ["risks", projectId], queryFn: () => api.risks(projectId) })

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.deleteAction(id),
    onSuccess: () => {
      toast.success("Plano de ação removido.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["actions", projectId] })
    queryClient.invalidateQueries({ queryKey: ["history", projectId] })
  }

  function openCreate() {
    setEditing(null)
    form.reset(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(action: Action5W2H) {
    setEditing(action)
    form.reset({
      risk_id: action.risk_id ? String(action.risk_id) : "none",
      what: action.what,
      why: action.why,
      where: action.where,
      when: action.when,
      who: action.who,
      how: action.how,
      how_much: action.how_much,
      status: action.status as ActionFormValues["status"],
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: ActionFormValues) {
    const payload: ActionPayload = {
      risk_id: values.risk_id === "none" ? null : Number(values.risk_id),
      what: values.what.trim(),
      why: values.why.trim(),
      where: values.where.trim(),
      when: values.when.trim(),
      who: values.who.trim(),
      how: values.how.trim(),
      how_much: values.how_much.trim(),
      status: values.status,
    }
    try {
      if (editing) {
        await api.updateAction(editing.id, payload)
        toast.success("Plano de ação atualizado.")
      } else {
        await api.createAction(projectId, payload)
        toast.success("Plano de ação criado.")
      }
      setDialogOpen(false)
      invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o plano de ação.")
    }
  }

  const actions = data?.items ?? []
  const risks: Risk[] = risksQuery.data?.items ?? []

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-48 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Planos de ação 5W2H · <span className="font-mono text-foreground">{actions.length}</span> registrado(s)
        </p>
        {canEdit ? (
          <Button size="sm" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            Novo plano
          </Button>
        ) : null}
      </div>

      {actions.length === 0 ? (
        <Empty className="border border-border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListTodo />
            </EmptyMedia>
            <EmptyTitle>Nenhum plano de ação</EmptyTitle>
            <EmptyDescription>Transforme riscos e decisões em ações com responsável, prazo e custo estimado.</EmptyDescription>
          </EmptyHeader>
          {canEdit ? (
            <EmptyContent>
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                Criar plano 5W2H
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {actions.map((action) => (
            <Card key={action.id} className="gap-0 py-0">
              <CardHeader className="gap-2 border-b border-border px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex rounded-sm border px-2 py-0.5 text-xs font-medium", actionStatusClass[action.status])}>
                      {actionStatusLabels[action.status] ?? action.status}
                    </span>
                    {action.risk_id ? (
                      <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                        risco #{action.risk_id}
                      </span>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label="Ações do plano">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openEdit(action)}>
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            if (window.confirm("Remover este plano de ação?")) removeMutation.mutate(action.id)
                          }}
                        >
                          <Trash2 />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
                <p className="font-medium leading-snug">{action.what}</p>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-xs">
                <div className="col-span-2">
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">Por quê</span>
                  <p className="mt-0.5 leading-relaxed">{action.why || "—"}</p>
                </div>
                <div>
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">Onde</span>
                  <p className="mt-0.5">{action.where || "—"}</p>
                </div>
                <div>
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">Quando</span>
                  <p className="mt-0.5">{action.when || "—"}</p>
                </div>
                <div>
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">Quem</span>
                  <p className="mt-0.5">{action.who || "—"}</p>
                </div>
                <div>
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">Quanto</span>
                  <p className="mt-0.5">{action.how_much || "—"}</p>
                </div>
                <div className="col-span-2 border-t border-border pt-2">
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">Como</span>
                  <p className="mt-0.5 leading-relaxed">{action.how || "—"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar plano 5W2H" : "Novo plano 5W2H"}</DialogTitle>
              <DialogDescription>O quê, por quê e como são obrigatórios. Os demais campos ajudam a executar e cobrar a ação.</DialogDescription>
            </DialogHeader>
            <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
              <Field data-invalid={Boolean(errors.what)}>
                <FieldLabel htmlFor="action-what">O quê</FieldLabel>
                <Input id="action-what" aria-invalid={Boolean(errors.what)} placeholder="Ação concreta a executar" {...form.register("what")} />
                <FieldError errors={[errors.what]} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.why)}>
                  <FieldLabel htmlFor="action-why">Por quê</FieldLabel>
                  <Textarea
                    id="action-why"
                    rows={2}
                    aria-invalid={Boolean(errors.why)}
                    placeholder="Motivo ou risco que justifica"
                    {...form.register("why")}
                  />
                  <FieldError errors={[errors.why]} />
                </Field>
                <Field data-invalid={Boolean(errors.how)}>
                  <FieldLabel htmlFor="action-how">Como</FieldLabel>
                  <Textarea
                    id="action-how"
                    rows={2}
                    aria-invalid={Boolean(errors.how)}
                    placeholder="Método ou etapas"
                    {...form.register("how")}
                  />
                  <FieldError errors={[errors.how]} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="action-where">Onde</FieldLabel>
                  <Input id="action-where" {...form.register("where")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="action-when">Quando</FieldLabel>
                  <Input id="action-when" {...form.register("when")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="action-who">Quem</FieldLabel>
                  <Input id="action-who" {...form.register("who")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="action-howmuch">Quanto custa</FieldLabel>
                  <Input id="action-howmuch" placeholder="Ex.: R$ 12.000,00" {...form.register("how_much")} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Risco vinculado</FieldLabel>
                  <Controller
                    control={form.control}
                    name="risk_id"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">Sem vínculo</SelectItem>
                            {risks.map((risk) => (
                              <SelectItem key={risk.id} value={String(risk.id)}>
                                #{risk.id} · {risk.description.slice(0, 48)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel>Situação</FieldLabel>
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {Object.entries(actionStatusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {editing ? "Salvar" : "Criar plano"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { MoreHorizontal, Pencil, Plus, ShieldAlert, Trash2 } from "lucide-react"
import { api, type RiskPayload } from "@/lib/api"
import { riskSchema, type RiskFormValues } from "@/lib/schemas"
import { gutLevel } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { Risk } from "@/types"

const riskStatusLabels: Record<string, string> = {
  ABERTO: "Aberto",
  MITIGADO: "Mitigado",
  ENCERRADO: "Encerrado",
}

const riskStatusClass: Record<string, string> = {
  ABERTO: "border-status-late/30 bg-status-late/10 text-status-late",
  MITIGADO: "border-status-warn/30 bg-status-warn/10 text-status-warn",
  ENCERRADO: "border-status-done/30 bg-status-done/10 text-status-done",
}

const levelClass: Record<string, string> = {
  CRITICO: "text-status-late",
  ALTO: "text-status-warn",
  MEDIO: "text-chart-4",
  BAIXO: "text-muted-foreground",
}

const scaleOptions = [1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: String(value) }))

interface RisksTabProps {
  projectId: number
  canEdit: boolean
}

const emptyForm: RiskFormValues = {
  description: "",
  category: "Prazo",
  gravity: "3",
  urgency: "3",
  tendency: "3",
  status: "ABERTO",
  response: "",
  owner: "",
}

export function RisksTab({ projectId, canEdit }: RisksTabProps) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Risk | null>(null)

  const form = useForm<RiskFormValues>({
    resolver: zodResolver(riskSchema),
    defaultValues: emptyForm,
  })
  const errors = form.formState.errors
  const pending = form.formState.isSubmitting

  const { data, isLoading } = useQuery({ queryKey: ["risks", projectId], queryFn: () => api.risks(projectId) })

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.deleteRisk(id),
    onSuccess: () => {
      toast.success("Risco removido.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["risks", projectId] })
    queryClient.invalidateQueries({ queryKey: ["project", projectId] })
    queryClient.invalidateQueries({ queryKey: ["projects"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["history", projectId] })
  }

  function openCreate() {
    setEditing(null)
    form.reset(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(risk: Risk) {
    setEditing(risk)
    form.reset({
      description: risk.description,
      category: risk.category || "Prazo",
      gravity: String(risk.gravity) as RiskFormValues["gravity"],
      urgency: String(risk.urgency) as RiskFormValues["urgency"],
      tendency: String(risk.tendency) as RiskFormValues["tendency"],
      status: risk.status as RiskFormValues["status"],
      response: risk.response,
      owner: risk.owner,
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: RiskFormValues) {
    const payload: RiskPayload = {
      description: values.description.trim(),
      category: values.category.trim(),
      gravity: Number(values.gravity),
      urgency: Number(values.urgency),
      tendency: Number(values.tendency),
      status: values.status,
      response: values.response.trim(),
      owner: values.owner.trim(),
    }
    try {
      if (editing) {
        await api.updateRisk(editing.id, payload)
        toast.success("Risco atualizado.")
      } else {
        await api.createRisk(projectId, payload)
        toast.success("Risco registrado.")
      }
      setDialogOpen(false)
      invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o risco.")
    }
  }

  const risks = data?.items ?? []
  const previewScore = Number(form.watch("gravity")) * Number(form.watch("urgency")) * Number(form.watch("tendency"))

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Matriz GUT · <span className="font-mono text-foreground">{risks.length}</span> risco(s) registrados
        </p>
        {canEdit ? (
          <Button size="sm" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            Novo risco
          </Button>
        ) : null}
      </div>

      {risks.length === 0 ? (
        <Empty className="border border-border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldAlert />
            </EmptyMedia>
            <EmptyTitle>Nenhum risco registrado</EmptyTitle>
            <EmptyDescription>
              Avalie gravidade, urgência e tendência para priorizar respostas e planos de contingência.
            </EmptyDescription>
          </EmptyHeader>
          {canEdit ? (
            <EmptyContent>
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                Registrar risco
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Risco</TableHead>
                <TableHead className="w-24">GUT</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Responsável</TableHead>
                <TableHead>Situação</TableHead>
                {canEdit ? <TableHead className="w-12" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.map((risk) => (
                <TableRow key={risk.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium leading-snug">{risk.description}</span>
                      {risk.response ? (
                        <span className="text-xs text-muted-foreground">Resposta: {risk.response}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-lg tabular">{risk.score}</span>
                      <span className={cn("font-mono text-[0.6rem] uppercase tracking-[0.1em]", levelClass[risk.level] ?? "text-muted-foreground")}>
                        {risk.level}
                      </span>
                    </div>
                    <span className="font-mono text-[0.6rem] text-muted-foreground">
                      {risk.gravity}×{risk.urgency}×{risk.tendency}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">{risk.category || "—"}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{risk.owner || "—"}</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex rounded-sm border px-2 py-0.5 text-xs font-medium", riskStatusClass[risk.status])}>
                      {riskStatusLabels[risk.status] ?? risk.status}
                    </span>
                  </TableCell>
                  {canEdit ? (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost" aria-label="Ações do risco">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(risk)}>
                            <Pencil />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                              if (window.confirm("Remover este risco? Os planos 5W2H vinculados serão desassociados.")) {
                                removeMutation.mutate(risk.id)
                              }
                            }}
                          >
                            <Trash2 />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar risco" : "Novo risco"}</DialogTitle>
              <DialogDescription>
                O nível é calculado pela matriz GUT (gravidade × urgência × tendência). Escala de 1 a 5.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Field data-invalid={Boolean(errors.description)}>
                <FieldLabel htmlFor="risk-description">Descrição</FieldLabel>
                <Textarea
                  id="risk-description"
                  rows={2}
                  aria-invalid={Boolean(errors.description)}
                  placeholder="Ex.: Atraso na entrega de insumos pelo fornecedor"
                  {...form.register("description")}
                />
                <FieldError errors={[errors.description]} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="risk-category">Categoria</FieldLabel>
                  <Input id="risk-category" placeholder="Prazo, orçamento, escopo…" {...form.register("category")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="risk-owner">Responsável pelo risco</FieldLabel>
                  <Input id="risk-owner" placeholder="Nome ou cargo" {...form.register("owner")} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                {(
                  [
                    { key: "gravity", label: "Gravidade" },
                    { key: "urgency", label: "Urgência" },
                    { key: "tendency", label: "Tendência" },
                  ] as const
                ).map((item) => (
                  <Field key={item.key}>
                    <FieldLabel>{item.label}</FieldLabel>
                    <Controller
                      control={form.control}
                      name={item.key}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {scaleOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                ))}
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
                            {Object.entries(riskStatusLabels).map(([value, label]) => (
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

              <div className="flex items-center justify-between border border-border bg-background/50 px-4 py-3">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">Pontuação GUT</span>
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl tabular">{previewScore}</span>
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">
                    {gutLevel(previewScore)}
                  </span>
                </span>
              </div>

              <Field>
                <FieldLabel htmlFor="risk-response">Resposta / plano de contingência</FieldLabel>
                <Textarea
                  id="risk-response"
                  rows={2}
                  placeholder="Como o risco será mitigado, transferido ou aceito"
                  {...form.register("response")}
                />
                <FieldDescription>Vincule ações concretas na aba 5W2H.</FieldDescription>
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {editing ? "Salvar" : "Registrar risco"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

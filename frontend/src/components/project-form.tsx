import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { CalendarDays, Info, Landmark, ListChecks, Save } from "lucide-react"
import { api, type ProjectPayload } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { priorityLabels, toInputDate } from "@/lib/format"
import { ROLES } from "@/lib/roles"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { Project } from "@/types"

const schema = z
  .object({
    name: z.string().trim().min(3, "Informe um nome com pelo menos 3 caracteres."),
    priority: z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]),
    responsible_secretariat_id: z.string().min(1, "Selecione a secretaria responsável."),
    secretariat_ids: z.array(z.number()),
    planned_start: z.string(),
    planned_end: z.string(),
    budget_planned: z.string(),
    budget_executed: z.string(),
    ppa: z.string(),
    ldo: z.string(),
    loa: z.string(),
    baseline_start: z.string(),
    baseline_end: z.string(),
    baseline_budget: z.string(),
    template_id: z.string(),
    justification: z.string().trim().min(10, "Descreva a justificativa com pelo menos 10 caracteres."),
    objectives: z.string().trim().min(10, "Descreva os objetivos com pelo menos 10 caracteres."),
    requirements: z.string().trim().min(10, "Descreva os requisitos com pelo menos 10 caracteres."),
    risk_assessment: z.string().trim().min(10, "Descreva a avaliação de riscos com pelo menos 10 caracteres."),
    government_plan: z.boolean(),
    government_plan_detail: z.string(),
    deadline_justification: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.planned_start && value.planned_end && value.planned_end < value.planned_start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["planned_end"],
        message: "O término previsto não pode ser anterior ao início.",
      })
    }
    if (value.government_plan && value.government_plan_detail.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["government_plan_detail"],
        message: "Informe a proposta do plano de governo atendida.",
      })
    }
    for (const field of ["budget_planned", "budget_executed"] as const) {
      const raw = value[field].trim()
      if (raw && (Number.isNaN(Number(raw)) || Number(raw) < 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Informe um valor válido e não negativo." })
      }
    }
  })

type FormValues = z.infer<typeof schema>

interface ProjectFormProps {
  mode: "create" | "edit"
  project?: Project
}

export function ProjectForm({ mode, project }: ProjectFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { me } = useAuth()
  const isAdmin = me?.user.role === ROLES.ADMIN
  const [institutionalLocked, setInstitutionalLocked] = useState(mode === "edit" && !isAdmin)

  const secretariatsQuery = useQuery({ queryKey: ["secretariats"], queryFn: api.secretariats, staleTime: 5 * 60 * 1000 })
  const templatesQuery = useQuery({ queryKey: ["templates"], queryFn: api.templates, staleTime: 5 * 60 * 1000, enabled: mode === "create" })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project?.name ?? "",
      priority: project?.priority ?? "MEDIA",
      responsible_secretariat_id: project ? String(project.responsible_secretariat_id) : me?.user.secretariat_id ? String(me.user.secretariat_id) : "",
      secretariat_ids: project?.secretariats?.map((item) => item.id) ?? [],
      planned_start: toInputDate(project?.planned_start),
      planned_end: toInputDate(project?.planned_end),
      budget_planned: project ? String(project.budget_planned) : "",
      budget_executed: project ? String(project.budget_executed) : "",
      ppa: project?.ppa ?? "",
      ldo: project?.ldo ?? "",
      loa: project?.loa ?? "",
      baseline_start: toInputDate(project?.baseline_start),
      baseline_end: toInputDate(project?.baseline_end),
      baseline_budget: String(project?.baseline_budget ?? 0),
      template_id: "none",
      justification: project?.justification ?? "",
      objectives: project?.objectives ?? "",
      requirements: project?.requirements ?? "",
      risk_assessment: project?.risk_assessment ?? "",
      government_plan: project?.government_plan ?? false,
      government_plan_detail: project?.government_plan_detail ?? "",
      deadline_justification: "",
    },
  })

  const governmentPlan = form.watch("government_plan")
  const responsibleId = form.watch("responsible_secretariat_id")

  useEffect(() => {
    if (mode === "edit" && !isAdmin) setInstitutionalLocked(true)
  }, [mode, isAdmin])

  async function onSubmit(values: FormValues) {
    const payload: ProjectPayload = {
      name: values.name.trim(),
      justification: values.justification.trim(),
      objectives: values.objectives.trim(),
      requirements: values.requirements.trim(),
      risk_assessment: values.risk_assessment.trim(),
      government_plan: values.government_plan,
      government_plan_detail: values.government_plan_detail.trim(),
      priority: values.priority,
      responsible_secretariat_id: Number(values.responsible_secretariat_id),
      secretariat_ids: values.secretariat_ids,
      planned_start: values.planned_start || null,
      planned_end: values.planned_end || null,
      budget_planned: Number(values.budget_planned || 0),
      budget_executed: Number(values.budget_executed || 0),
      ppa: values.ppa.trim(),
      ldo: values.ldo.trim(),
      loa: values.loa.trim(),
      baseline_start: values.baseline_start || null,
      baseline_end: values.baseline_end || null,
      baseline_budget: Number(values.baseline_budget || 0),
      template_id: mode === "create" && values.template_id !== "none" ? Number(values.template_id) : null,
      deadline_justification: values.deadline_justification.trim() || undefined,
    }

    try {
      if (mode === "create") {
        const response = await api.createProject(payload)
        toast.success("Projeto criado.")
        queryClient.invalidateQueries({ queryKey: ["projects"] })
        queryClient.invalidateQueries({ queryKey: ["dashboard"] })
        navigate(`/projetos/${response.project.id}`)
      } else if (project) {
        await api.updateProject(project.id, payload)
        toast.success("Projeto atualizado.")
        queryClient.invalidateQueries({ queryKey: ["project", project.id] })
        queryClient.invalidateQueries({ queryKey: ["projects"] })
        queryClient.invalidateQueries({ queryKey: ["dashboard"] })
        queryClient.invalidateQueries({ queryKey: ["history", project.id] })
        navigate(`/projetos/${project.id}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o projeto.")
    }
  }

  const secretariats = secretariatsQuery.data?.items ?? []
  const templates = templatesQuery.data?.items.filter((item) => item.active) ?? []
  const submitting = form.formState.isSubmitting

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="size-4 text-muted-foreground" />
            Identificação e responsabilidade
          </CardTitle>
          <CardDescription>Quem responde pelo projeto e qual o grau de prioridade no portfólio.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="project-name">Nome do projeto</FieldLabel>
              <Input
                id="project-name"
                placeholder="Ex.: Requalificação da Praça Central"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={Boolean(form.formState.errors.priority)}>
                <FieldLabel>Prioridade</FieldLabel>
                <Controller
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full" aria-invalid={Boolean(form.formState.errors.priority)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {Object.entries(priorityLabels).map(([value, label]) => (
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

              <Field data-invalid={Boolean(form.formState.errors.responsible_secretariat_id)}>
                <FieldLabel>Secretaria responsável</FieldLabel>
                <Controller
                  control={form.control}
                  name="responsible_secretariat_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!isAdmin && mode === "edit"}>
                      <SelectTrigger className="w-full" aria-invalid={Boolean(form.formState.errors.responsible_secretariat_id)}>
                        <SelectValue placeholder="Selecione a secretaria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {secretariats.map((secretariat) => (
                            <SelectItem key={secretariat.id} value={String(secretariat.id)}>
                              {secretariat.acronym} · {secretariat.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldDescription>
                  {mode === "edit"
                    ? "A troca de responsável é feita pelo fluxo de encaminhamento, com histórico."
                    : "Somente a secretaria responsável poderá editar atividades e dados operacionais."}
                </FieldDescription>
                <FieldError errors={[form.formState.errors.responsible_secretariat_id]} />
              </Field>
            </div>

            <FieldSet>
              <FieldLegend variant="label">Secretarias envolvidas</FieldLegend>
              <FieldDescription>
                A responsável é incluída automaticamente. As envolvidas visualizam o projeto e recebem notificações.
              </FieldDescription>
              <div className="grid gap-2 sm:grid-cols-2">
                {secretariats.map((secretariat) => {
                  const checked =
                    form.watch("secretariat_ids").includes(secretariat.id) || String(secretariat.id) === responsibleId
                  return (
                    <label
                      key={secretariat.id}
                      className="flex items-center gap-3 rounded-md border border-border bg-background/50 px-3 py-2 text-sm transition-colors has-checked:border-primary/30 has-checked:bg-primary/5"
                    >
                      <Checkbox
                        checked={checked}
                        disabled={String(secretariat.id) === responsibleId}
                        onCheckedChange={(value) => {
                          const current = form.getValues("secretariat_ids")
                          const next = value
                            ? [...current, secretariat.id]
                            : current.filter((id) => id !== secretariat.id)
                          form.setValue("secretariat_ids", Array.from(new Set(next)), { shouldDirty: true })
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate">{secretariat.name}</span>
                        <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
                          {secretariat.acronym}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </FieldSet>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-muted-foreground" />
            Prazos e orçamento
          </CardTitle>
          <CardDescription>Datas previstas orientam o cronograma e os alertas de vencimento.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="planned-start">Início previsto</FieldLabel>
                <Input id="planned-start" type="date" {...form.register("planned_start")} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.planned_end)}>
                <FieldLabel htmlFor="planned-end">Término previsto</FieldLabel>
                <Input
                  id="planned-end"
                  type="date"
                  aria-invalid={Boolean(form.formState.errors.planned_end)}
                  {...form.register("planned_end")}
                />
                <FieldError errors={[form.formState.errors.planned_end]} />
              </Field>
            </div>

            {mode === "edit" ? (
              <Field>
                <FieldLabel htmlFor="deadline-justification">Justificativa da alteração de prazo</FieldLabel>
                <Textarea
                  id="deadline-justification"
                  rows={2}
                  placeholder="Obrigatória apenas se o início ou o término previsto mudar."
                  {...form.register("deadline_justification")}
                />
                <FieldDescription>Toda alteração de prazo é registrada no histórico do projeto.</FieldDescription>
              </Field>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="budget-planned">Orçamento previsto (R$)</FieldLabel>
                <Input id="budget-planned" type="number" min="0" step="100" placeholder="0" {...form.register("budget_planned")} />
                <FieldError errors={[form.formState.errors.budget_planned]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="budget-executed">Executado (R$)</FieldLabel>
                <Input id="budget-executed" type="number" min="0" step="100" placeholder="0" {...form.register("budget_executed")} />
                <FieldError errors={[form.formState.errors.budget_executed]} />
                <FieldDescription>O executado não pode ser negativo; pode ser atualizado ao longo do projeto.</FieldDescription>
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="size-4 text-muted-foreground" />
            Planejamento orçamentário e linha de base
          </CardTitle>
          <CardDescription>
            Referências do PPA, LDO e LOA e a linha de base aprovada para medir mudanças de prazo e orçamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {mode === "create" ? (
              <Field>
                <FieldLabel>Template de projeto</FieldLabel>
                <Controller
                  control={form.control}
                  name="template_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sem template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">Sem template</SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={String(template.id)}>
                              {template.name} · {template.duration_days} dias
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldDescription>
                  O template cria automaticamente as atividades, aprovações e checklist documental.
                </FieldDescription>
              </Field>
            ) : null}
            <div className="grid gap-5 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="project-ppa">PPA</FieldLabel>
                <Input id="project-ppa" placeholder="Ex.: 2026–2029" {...form.register("ppa")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="project-ldo">LDO</FieldLabel>
                <Input id="project-ldo" placeholder="Ex.: 2026" {...form.register("ldo")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="project-loa">LOA</FieldLabel>
                <Input id="project-loa" placeholder="Ex.: 2026" {...form.register("loa")} />
              </Field>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="baseline-start">Início da linha de base</FieldLabel>
                <Input id="baseline-start" type="date" {...form.register("baseline_start")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="baseline-end">Fim da linha de base</FieldLabel>
                <Input id="baseline-end" type="date" {...form.register("baseline_end")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="baseline-budget">Orçamento da linha de base (R$)</FieldLabel>
                <Input id="baseline-budget" type="number" min="0" step="100" placeholder="0" {...form.register("baseline_budget")} />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="size-4 text-muted-foreground" />
            Escopo institucional
          </CardTitle>
          <CardDescription>
            {institutionalLocked
              ? "Estes campos foram definidos no cadastro e só podem ser alterados pela administração."
              : "Estes campos ficam imutáveis após o cadastro, exceto para administradores com auditoria."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.justification)}>
              <FieldLabel htmlFor="justification">Justificativa</FieldLabel>
              <Textarea
                id="justification"
                rows={3}
                disabled={institutionalLocked}
                aria-invalid={Boolean(form.formState.errors.justification)}
                placeholder="Por que este projeto existe e qual problema ele resolve?"
                {...form.register("justification")}
              />
              <FieldError errors={[form.formState.errors.justification]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.objectives)}>
              <FieldLabel htmlFor="objectives">Objetivos</FieldLabel>
              <Textarea
                id="objectives"
                rows={3}
                disabled={institutionalLocked}
                aria-invalid={Boolean(form.formState.errors.objectives)}
                placeholder="O que deve ser entregue e qual resultado se espera?"
                {...form.register("objectives")}
              />
              <FieldError errors={[form.formState.errors.objectives]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.requirements)}>
              <FieldLabel htmlFor="requirements">Requisitos</FieldLabel>
              <Textarea
                id="requirements"
                rows={3}
                disabled={institutionalLocked}
                aria-invalid={Boolean(form.formState.errors.requirements)}
                placeholder="Equipe, insumos, licenças e condições necessárias."
                {...form.register("requirements")}
              />
              <FieldError errors={[form.formState.errors.requirements]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.risk_assessment)}>
              <FieldLabel htmlFor="risk-assessment">Avaliação de riscos</FieldLabel>
              <Textarea
                id="risk-assessment"
                rows={3}
                disabled={institutionalLocked}
                aria-invalid={Boolean(form.formState.errors.risk_assessment)}
                placeholder="Principais ameaças, restrições e planos de contingência."
                {...form.register("risk_assessment")}
              />
              <FieldError errors={[form.formState.errors.risk_assessment]} />
            </Field>

            <Field orientation="horizontal" className="items-start justify-between rounded-md border border-border bg-background/50 px-4 py-3">
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="government-plan">Vinculado ao plano de governo</FieldLabel>
                <FieldDescription>Marque se o projeto atende a uma proposta registrada do governo municipal.</FieldDescription>
              </div>
              <Controller
                control={form.control}
                name="government_plan"
                render={({ field }) => (
                  <Switch
                    id="government-plan"
                    checked={field.value}
                    disabled={institutionalLocked}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </Field>

            {governmentPlan ? (
              <Field data-invalid={Boolean(form.formState.errors.government_plan_detail)}>
                <FieldLabel htmlFor="government-plan-detail">Proposta do plano de governo</FieldLabel>
                <Textarea
                  id="government-plan-detail"
                  rows={2}
                  disabled={institutionalLocked}
                  aria-invalid={Boolean(form.formState.errors.government_plan_detail)}
                  placeholder="Qual proposta ou meta do plano de governo este projeto atende?"
                  {...form.register("government_plan_detail")}
                />
                <FieldError errors={[form.formState.errors.government_plan_detail]} />
              </Field>
            ) : null}
          </FieldGroup>
          {institutionalLocked ? (
            <p className="mt-4 flex items-start gap-2 rounded-md border border-signal/40 bg-signal/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0 text-status-warn" />
              Para corrigir o escopo institucional, solicite à administração. A alteração fica registrada na auditoria.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button type="button" variant="outline" onClick={() => navigate(mode === "edit" && project ? `/projetos/${project.id}` : "/projetos")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          <Save data-icon="inline-start" />
          {submitting ? "Salvando…" : mode === "create" ? "Criar projeto" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  )
}

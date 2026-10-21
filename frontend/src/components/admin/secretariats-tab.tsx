import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { Building2, Pencil, Plus, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { secretariatSchema, type SecretariatFormValues } from "@/lib/schemas"
import { SecretariatMark } from "@/components/secretariat-mark"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Secretariat } from "@/types"

const emptyForm: SecretariatFormValues = { name: "", acronym: "", color: "#123b33", active: true }

export function SecretariatsTab() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Secretariat | null>(null)

  const form = useForm<SecretariatFormValues>({
    resolver: zodResolver(secretariatSchema),
    defaultValues: emptyForm,
  })
  const errors = form.formState.errors
  const pending = form.formState.isSubmitting

  const { data, isLoading } = useQuery({ queryKey: ["secretariats"], queryFn: api.secretariats })

  const toggleMutation = useMutation({
    mutationFn: (secretariat: Secretariat) =>
      api.updateSecretariat(secretariat.id, {
        name: secretariat.name,
        acronym: secretariat.acronym,
        color: secretariat.color,
        active: !secretariat.active,
      }),
    onSuccess: () => {
      toast.success("Situação atualizada.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.deleteSecretariat(id),
    onSuccess: () => {
      toast.success("Secretaria excluída.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["secretariats"] })
    queryClient.invalidateQueries({ queryKey: ["logs"] })
    queryClient.invalidateQueries({ queryKey: ["me"] })
  }

  function openCreate() {
    setEditing(null)
    form.reset(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(secretariat: Secretariat) {
    setEditing(secretariat)
    form.reset({
      name: secretariat.name,
      acronym: secretariat.acronym,
      color: secretariat.color || "#123b33",
      active: secretariat.active,
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: SecretariatFormValues) {
    try {
      const payload = { name: values.name.trim(), acronym: values.acronym.trim(), color: values.color, active: values.active }
      if (editing) {
        await api.updateSecretariat(editing.id, payload)
        toast.success("Secretaria atualizada.")
      } else {
        await api.createSecretariat(payload)
        toast.success("Secretaria criada.")
      }
      setDialogOpen(false)
      invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a secretaria.")
    }
  }

  const secretariats = data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Estrutura administrativa · <span className="font-mono text-foreground">{secretariats.length}</span> secretaria(s)
        </p>
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Nova secretaria
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : secretariats.length === 0 ? (
        <Empty className="border border-border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>Nenhuma secretaria</EmptyTitle>
            <EmptyDescription>Cadastre a estrutura responsável pelos projetos da prefeitura.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
            <Table className="min-w-[36rem]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Secretaria</TableHead>
                  <TableHead className="w-24">Sigla</TableHead>
                  <TableHead className="hidden sm:table-cell">Usuários</TableHead>
                  <TableHead className="hidden sm:table-cell">Projetos</TableHead>
                  <TableHead className="w-24 text-center">Ativa</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {secretariats.map((secretariat) => (
                  <TableRow key={secretariat.id} className={!secretariat.active ? "opacity-60" : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <SecretariatMark
                          name={secretariat.name}
                          acronym={secretariat.acronym}
                          color={secretariat.color}
                          size="sm"
                        />
                        <span className="truncate font-medium">{secretariat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{secretariat.acronym}</TableCell>
                    <TableCell className="hidden font-mono text-xs tabular text-muted-foreground sm:table-cell">
                      {secretariat.user_count ?? "—"}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs tabular text-muted-foreground sm:table-cell">
                      {secretariat.project_count ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={secretariat.active}
                        onCheckedChange={() => toggleMutation.mutate(secretariat)}
                        aria-label={`Ativar ou inativar ${secretariat.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label="Editar secretaria" onClick={() => openEdit(secretariat)}>
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Excluir secretaria"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (window.confirm(`Excluir a secretaria ${secretariat.name}?`)) removeMutation.mutate(secretariat.id)
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:hidden">
            {secretariats.map((secretariat) => (
              <div key={secretariat.id} className={cn("flex flex-col gap-3 p-4", !secretariat.active && "opacity-60")}>
                <div className="flex items-center gap-2.5">
                  <SecretariatMark
                    name={secretariat.name}
                    acronym={secretariat.acronym}
                    color={secretariat.color}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-snug">{secretariat.name}</p>
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">
                      {secretariat.acronym}
                    </p>
                  </div>
                  <Switch
                    checked={secretariat.active}
                    onCheckedChange={() => toggleMutation.mutate(secretariat)}
                    aria-label={`Ativar ou inativar ${secretariat.name}`}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {secretariat.user_count ?? 0} usuário(s) · {secretariat.project_count ?? 0} projeto(s)
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="icon-sm" variant="ghost" aria-label="Editar secretaria" onClick={() => openEdit(secretariat)}>
                      <Pencil />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Excluir secretaria"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (window.confirm(`Excluir a secretaria ${secretariat.name}?`)) removeMutation.mutate(secretariat.id)
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar secretaria" : "Nova secretaria"}</DialogTitle>
              <DialogDescription>A sigla e a cor identificam a secretaria em todo o sistema.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="secretariat-name">Nome</FieldLabel>
                <Input
                  id="secretariat-name"
                  aria-invalid={Boolean(errors.name)}
                  placeholder="Secretaria Municipal de Obras"
                  {...form.register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.acronym)}>
                  <FieldLabel htmlFor="secretariat-acronym">Sigla</FieldLabel>
                  <Input
                    id="secretariat-acronym"
                    maxLength={8}
                    aria-invalid={Boolean(errors.acronym)}
                    placeholder="SEMOB"
                    {...form.register("acronym", { onChange: (event) => form.setValue("acronym", event.target.value.toUpperCase()) })}
                  />
                  <FieldError errors={[errors.acronym]} />
                </Field>
                <Field data-invalid={Boolean(errors.color)}>
                  <FieldLabel htmlFor="secretariat-color">Cor</FieldLabel>
                  <div className="flex items-center gap-2">
                    <input
                      id="secretariat-color"
                      type="color"
                      value={form.watch("color")}
                      onChange={(event) => form.setValue("color", event.target.value)}
                      className="size-9 cursor-pointer border border-border bg-background p-0.5"
                    />
                    <Input className="font-mono text-xs" {...form.register("color")} />
                  </div>
                  <FieldError errors={[errors.color]} />
                </Field>
              </div>
              <Field orientation="horizontal" className="justify-between border border-border bg-background/50 px-4 py-3">
                <FieldLabel htmlFor="secretariat-active">Secretaria ativa</FieldLabel>
                <Controller
                  control={form.control}
                  name="active"
                  render={({ field }) => <Switch id="secretariat-active" checked={field.value} onCheckedChange={field.onChange} />}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {editing ? "Salvar" : "Criar secretaria"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

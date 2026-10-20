import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { BriefcaseBusiness, Pencil, Plus, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { cargoSchema, type CargoFormValues } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Cargo } from "@/types"

const emptyForm: CargoFormValues = { name: "", description: "", active: true }

export function CargosTab() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Cargo | null>(null)

  const form = useForm<CargoFormValues>({
    resolver: zodResolver(cargoSchema),
    defaultValues: emptyForm,
  })
  const errors = form.formState.errors
  const pending = form.formState.isSubmitting

  const { data, isLoading } = useQuery({ queryKey: ["cargos"], queryFn: api.cargos })

  const toggleMutation = useMutation({
    mutationFn: (cargo: Cargo) => api.updateCargo(cargo.id, { name: cargo.name, description: cargo.description, active: !cargo.active }),
    onSuccess: () => {
      toast.success("Situação atualizada.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.deleteCargo(id),
    onSuccess: () => {
      toast.success("Cargo excluído.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["cargos"] })
    queryClient.invalidateQueries({ queryKey: ["logs"] })
  }

  function openCreate() {
    setEditing(null)
    form.reset(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(cargo: Cargo) {
    setEditing(cargo)
    form.reset({ name: cargo.name, description: cargo.description, active: cargo.active })
    setDialogOpen(true)
  }

  async function onSubmit(values: CargoFormValues) {
    try {
      const payload = { name: values.name.trim(), description: values.description.trim(), active: values.active }
      if (editing) {
        await api.updateCargo(editing.id, payload)
        toast.success("Cargo atualizado.")
      } else {
        await api.createCargo(payload)
        toast.success("Cargo criado.")
      }
      setDialogOpen(false)
      invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o cargo.")
    }
  }

  const cargos = data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Cargos e funções · <span className="font-mono text-foreground">{cargos.length}</span> registro(s)
        </p>
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Novo cargo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : cargos.length === 0 ? (
        <Empty className="border border-border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BriefcaseBusiness />
            </EmptyMedia>
            <EmptyTitle>Nenhum cargo cadastrado</EmptyTitle>
            <EmptyDescription>Organize os vínculos dos servidores por cargo ou função.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Cargo</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead className="hidden sm:table-cell">Usuários</TableHead>
                <TableHead className="w-24 text-center">Ativo</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargos.map((cargo) => (
                <TableRow key={cargo.id} className={!cargo.active ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">{cargo.name}</TableCell>
                  <TableCell className="hidden max-w-md truncate text-xs text-muted-foreground md:table-cell">
                    {cargo.description || "—"}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs tabular text-muted-foreground sm:table-cell">
                    {cargo.user_count ?? "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={cargo.active}
                      onCheckedChange={() => toggleMutation.mutate(cargo)}
                      aria-label={`Ativar ou inativar ${cargo.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" aria-label="Editar cargo" onClick={() => openEdit(cargo)}>
                        <Pencil />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Excluir cargo"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (window.confirm(`Excluir o cargo ${cargo.name}?`)) removeMutation.mutate(cargo.id)
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
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar cargo" : "Novo cargo"}</DialogTitle>
              <DialogDescription>Cargos são usados para identificar os servidores nos projetos e no histórico.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="cargo-name">Nome</FieldLabel>
                <Input id="cargo-name" aria-invalid={Boolean(errors.name)} placeholder="Engenheiro civil" {...form.register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="cargo-description">Descrição</FieldLabel>
                <Input id="cargo-description" placeholder="Atribuições resumidas" {...form.register("description")} />
              </Field>
              <Field orientation="horizontal" className="justify-between border border-border bg-background/50 px-4 py-3">
                <FieldLabel htmlFor="cargo-active">Cargo ativo</FieldLabel>
                <Controller
                  control={form.control}
                  name="active"
                  render={({ field }) => <Switch id="cargo-active" checked={field.value} onCheckedChange={field.onChange} />}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {editing ? "Salvar" : "Criar cargo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { ArrowRightLeft, MoreHorizontal, PauseCircle, PlayCircle, Trash2, XCircle } from "lucide-react"
import { api } from "@/lib/api"
import { statusSchema, transferSchema, type StatusFormValues, type TransferFormValues } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Project, ProjectPermissions, Secretariat } from "@/types"

interface ManageMenuProps {
  project: Project
  permissions: ProjectPermissions
  secretariats: Secretariat[]
}

export function ProjectManageMenu({ project, permissions, secretariats }: ManageMenuProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<"transfer" | "status" | "delete" | null>(null)
  const [pending, setPending] = useState(false)

  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { target_secretariat_id: "", note: "" },
  })
  const statusForm = useForm<StatusFormValues>({
    resolver: zodResolver(statusSchema),
    defaultValues: { status: "", note: "" },
  })

  if (!permissions.can_manage && !permissions.can_delete) return null

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["project", project.id] })
    queryClient.invalidateQueries({ queryKey: ["projects"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["history", project.id] })
    queryClient.invalidateQueries({ queryKey: ["kanban"] })
    queryClient.invalidateQueries({ queryKey: ["gantt"] })
  }

  const statusOptions = [
    { value: "EM_ANDAMENTO", label: "Retomar / em andamento", icon: PlayCircle },
    { value: "NAO_INICIADO", label: "Marcar como não iniciado", icon: PlayCircle },
    { value: "SUSPENSO", label: "Suspender", icon: PauseCircle },
    { value: "CANCELADO", label: "Cancelar projeto", icon: XCircle },
  ].filter((option) => option.value !== project.status)

  async function onTransfer(values: TransferFormValues) {
    setPending(true)
    try {
      await api.transferProject(project.id, Number(values.target_secretariat_id), values.note.trim())
      toast.success("Projeto encaminhado.")
      setDialog(null)
      transferForm.reset()
      refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível encaminhar o projeto.")
    } finally {
      setPending(false)
    }
  }

  async function onStatus(values: StatusFormValues) {
    setPending(true)
    try {
      await api.changeStatus(project.id, values.status, values.note.trim())
      toast.success("Situação atualizada.")
      setDialog(null)
      statusForm.reset()
      refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a situação.")
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    setPending(true)
    try {
      await api.deleteProject(project.id)
      toast.success("Projeto excluído.")
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      navigate("/projetos")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o projeto.")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <MoreHorizontal data-icon="inline-start" />
            Gerenciar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{project.code}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!permissions.can_manage}
            onSelect={() => {
              transferForm.reset({ target_secretariat_id: "", note: "" })
              setDialog("transfer")
            }}
          >
            <ArrowRightLeft />
            Encaminhar para secretaria
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!permissions.can_manage}
            onSelect={() => {
              statusForm.reset({ status: "", note: "" })
              setDialog("status")
            }}
          >
            <PauseCircle />
            Alterar situação
          </DropdownMenuItem>
          {permissions.can_delete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                <Trash2 />
                Excluir projeto
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === "transfer"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={transferForm.handleSubmit(onTransfer)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Encaminhar projeto</DialogTitle>
              <DialogDescription>
                A secretaria de destino passa a ser responsável e ganha permissão para editar o projeto. A ação fica no histórico.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Field data-invalid={Boolean(transferForm.formState.errors.target_secretariat_id)}>
                <FieldLabel>Secretaria de destino</FieldLabel>
                <Controller
                  control={transferForm.control}
                  name="target_secretariat_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {secretariats
                            .filter((secretariat) => secretariat.id !== project.responsible_secretariat_id && secretariat.active)
                            .map((secretariat) => (
                              <SelectItem key={secretariat.id} value={String(secretariat.id)}>
                                {secretariat.acronym} · {secretariat.name}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[transferForm.formState.errors.target_secretariat_id]} />
              </Field>
              <Field data-invalid={Boolean(transferForm.formState.errors.note)}>
                <FieldLabel>Justificativa</FieldLabel>
                <Textarea rows={3} placeholder="Por que o projeto está mudando de secretaria?" {...transferForm.register("note")} />
                <FieldDescription>Obrigatória. Notifica a secretaria de destino e os envolvidos.</FieldDescription>
                <FieldError errors={[transferForm.formState.errors.note]} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                <ArrowRightLeft data-icon="inline-start" />
                Encaminhar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "status"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={statusForm.handleSubmit(onStatus)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Alterar situação</DialogTitle>
              <DialogDescription>
                Suspender ou cancelar interrompe o cômputo de atraso. As atividades permanecem registradas.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Field data-invalid={Boolean(statusForm.formState.errors.status)}>
                <FieldLabel>Nova situação</FieldLabel>
                <Controller
                  control={statusForm.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[statusForm.formState.errors.status]} />
              </Field>
              <Field>
                <FieldLabel>Observação</FieldLabel>
                <Textarea rows={2} placeholder="Contexto da mudança (opcional)" {...statusForm.register("note")} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={dialog === "delete"} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {project.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o projeto e seus vínculos. O registro permanece na auditoria e não pode ser desfeito pela interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              disabled={pending}
            >
              Excluir projeto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

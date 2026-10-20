import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { LayoutTemplate, Plus, Trash2 } from "lucide-react"
import { api, type TemplatePayload } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { Priority, ProjectTemplate } from "@/types"

const priorities: Priority[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"]

interface TemplateActivity {
  title: string
  description?: string
  duration_days?: number
}

function parseActivities(raw: string): TemplateActivity[] {
  try {
    const parsed = JSON.parse(raw || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function activitiesToText(raw: string) {
  return parseActivities(raw)
    .map((item) => `${item.title} | ${item.duration_days ?? 0}`)
    .join("\n")
}

function textToActivities(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, duration] = line.split("|").map((part) => part.trim())
      return { title, description: "", duration_days: Number(duration) || 0 }
    })
}

export function TemplatesTab() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ProjectTemplate | null | "new">(null)

  const { data, isLoading } = useQuery({ queryKey: ["templates"], queryFn: api.templates })

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteTemplate(id),
    onSuccess: () => {
      toast.success("Modelo removido.")
      queryClient.invalidateQueries({ queryKey: ["templates"] })
    },
    onError: (error) => toast.error(error.message),
  })

  if (isLoading) return <Skeleton className="h-56 w-full" />
  const items = data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus data-icon="inline-start" />
          Novo modelo
        </Button>
      </div>
      {items.length === 0 ? (
        <Empty className="border border-border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon"><LayoutTemplate /></EmptyMedia>
            <EmptyTitle>Nenhum modelo cadastrado</EmptyTitle>
            <EmptyDescription>Crie modelos com atividades padrão para acelerar novos projetos.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Modelo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Atividades</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <span className="block font-medium">{template.name}</span>
                    <span className="block text-xs text-muted-foreground">{template.description || "—"}</span>
                  </TableCell>
                  <TableCell className="text-xs">{template.priority}</TableCell>
                  <TableCell className="text-xs">{template.duration_days} dias</TableCell>
                  <TableCell className="text-xs">{parseActivities(template.activities).length}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(template)}>Editar</Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove.mutate(template.id)}
                      aria-label={`Excluir ${template.name}`}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TemplateDialog
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        template={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["templates"] })}
      />
    </div>
  )
}

function TemplateDialog({
  template,
  open,
  onClose,
  onSaved,
}: {
  template: ProjectTemplate | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(template?.name ?? "")
  const [description, setDescription] = useState(template?.description ?? "")
  const [priority, setPriority] = useState<Priority>(template?.priority ?? "MEDIA")
  const [duration, setDuration] = useState(String(template?.duration_days ?? 30))
  const [activities, setActivities] = useState(template ? activitiesToText(template.activities) : "")

  const mutation = useMutation({
    mutationFn: (payload: TemplatePayload) =>
      template ? api.updateTemplate(template.id, payload) : api.createTemplate(payload),
    onSuccess: () => {
      toast.success(template ? "Modelo atualizado." : "Modelo criado.")
      onClose()
      onSaved()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? "Editar modelo" : "Novo modelo"}</DialogTitle>
          <DialogDescription>Modelos preenchem automaticamente as atividades de novos projetos.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="template-name">Nome</FieldLabel>
            <Input id="template-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="template-description">Descrição</FieldLabel>
            <Input id="template-description" value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Prioridade</FieldLabel>
            <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {priorities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="template-duration">Prazo (dias)</FieldLabel>
            <Input
              id="template-duration"
              type="number"
              min={1}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="template-activities">Atividades (uma por linha: título | dias)</FieldLabel>
            <Textarea
              id="template-activities"
              rows={5}
              value={activities}
              onChange={(event) => setActivities(event.target.value)}
              placeholder={"Mobilização | 5\nExecução | 20"}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() =>
              mutation.mutate({
                name,
                description,
                priority,
                duration_days: Number(duration) || 0,
                activities: textToActivities(activities),
              })
            }
            disabled={mutation.isPending}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

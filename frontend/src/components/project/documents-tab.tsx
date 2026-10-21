import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Download, FileCheck2, Paperclip, Plus, Trash2 } from "lucide-react"
import { api, downloadAttachment, type DocumentPayload } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type { Attachment, ProjectDocument } from "@/types"

const statuses = ["PENDENTE", "RECEBIDO", "DISPENSADO", "VENCIDO"]

const statusClass: Record<string, string> = {
  PENDENTE: "border-status-warn/30 bg-status-warn/10 text-status-warn",
  RECEBIDO: "border-status-done/30 bg-status-done/10 text-status-done",
  DISPENSADO: "border-status-neutral/30 bg-status-neutral/10 text-status-neutral",
  VENCIDO: "border-status-late/30 bg-status-late/10 text-status-late",
}

export function DocumentsTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ProjectDocument | null | "new">(null)

  const { data, isLoading } = useQuery({ queryKey: ["documents", projectId], queryFn: () => api.documents(projectId) })
  const attachmentsQuery = useQuery({
    queryKey: ["attachments", projectId],
    queryFn: () => api.attachments(projectId),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["documents", projectId] })
    queryClient.invalidateQueries({ queryKey: ["history", projectId] })
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DocumentPayload }) => api.updateDocument(id, payload),
    onSuccess: () => {
      toast.success("Documento atualizado.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.deleteDocument(id),
    onSuccess: () => {
      toast.success("Item removido.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  if (isLoading) return <Skeleton className="h-72 w-full" />

  const items = data?.items ?? []
  const attachments = attachmentsQuery.data?.items ?? []
  const received = items.filter((item) => item.status === "RECEBIDO" || item.status === "DISPENSADO").length

  function payloadFrom(item: ProjectDocument, status: string = item.status): DocumentPayload {
    return {
      name: item.name,
      category: item.category,
      required: item.required,
      status,
      attachment_id: item.attachment_id,
      note: item.note,
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-foreground">{received}</span> de {items.length} itens atendidos
        </p>
        {data?.can_edit ? (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus data-icon="inline-start" />
            Novo item
          </Button>
        ) : null}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b border-border px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileCheck2 className="size-4 text-muted-foreground" />
            Checklist documental
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum item de checklist cadastrado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm">{item.name}</p>
                      {item.required ? (
                        <span className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-status-late">obrigatório</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.category || "Sem categoria"}
                      {item.note ? ` · ${item.note}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {item.attachment ? (
                      <Button size="sm" variant="ghost" onClick={() => downloadAttachment(item.attachment!)}>
                        <Download data-icon="inline-start" />
                        Anexo
                      </Button>
                    ) : null}
                    {data?.can_edit ? (
                      <Select
                        value={item.status}
                        onValueChange={(value) => updateMutation.mutate({ id: item.id, payload: payloadFrom(item, value) })}
                      >
                        <SelectTrigger size="sm" className="w-32 sm:w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] ${statusClass[item.status]}`}>
                        {item.status}
                      </span>
                    )}
                    {data?.can_edit ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>Editar</Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => removeMutation.mutate(item.id)} aria-label="Excluir item">
                          <Trash2 />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <DocumentDialog
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        projectId={projectId}
        document={editing === "new" ? null : editing}
        attachments={attachments}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={invalidate}
      />
    </div>
  )
}

function DocumentDialog({
  projectId,
  document,
  attachments,
  open,
  onClose,
  onSaved,
}: {
  projectId: number
  document: ProjectDocument | null
  attachments: Attachment[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(document?.name ?? "")
  const [category, setCategory] = useState(document?.category ?? "")
  const [required, setRequired] = useState(document?.required ?? false)
  const [status, setStatus] = useState<string>(document?.status ?? "PENDENTE")
  const [attachmentId, setAttachmentId] = useState(document?.attachment_id ? String(document.attachment_id) : "none")
  const [note, setNote] = useState(document?.note ?? "")

  const mutation = useMutation({
    mutationFn: (payload: DocumentPayload) =>
      document ? api.updateDocument(document.id, payload) : api.createDocument(projectId, payload),
    onSuccess: () => {
      toast.success(document ? "Item atualizado." : "Item criado.")
      onClose()
      onSaved()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{document ? "Editar item" : "Novo item de checklist"}</DialogTitle>
          <DialogDescription>Anexe o arquivo correspondente e atualize a situação.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="document-name">Nome</FieldLabel>
            <Input id="document-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="document-category">Categoria</FieldLabel>
              <Input id="document-category" value={category} onChange={(event) => setCategory(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {statuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel>Anexo</FieldLabel>
            <Select value={attachmentId} onValueChange={setAttachmentId}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Sem anexo</SelectItem>
                  {attachments.map((attachment) => (
                    <SelectItem key={attachment.id} value={String(attachment.id)}>{attachment.name}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
            Item obrigatório
          </label>
          <Field>
            <FieldLabel htmlFor="document-note">Observação</FieldLabel>
            <Textarea id="document-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
          </Field>
          {document ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Paperclip className="size-3.5" />
              Criado em {formatDate(document.created_at)}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() =>
              mutation.mutate({
                name,
                category,
                required,
                status,
                attachment_id: attachmentId === "none" ? null : Number(attachmentId),
                note,
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

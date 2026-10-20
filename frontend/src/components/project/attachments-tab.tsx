import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Download, FileText, Paperclip, Trash2, Upload } from "lucide-react"
import { api, downloadAttachment } from "@/lib/api"
import { formatDateTime, formatFileSize } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

interface AttachmentsTabProps {
  projectId: number
  canEdit: boolean
}

export function AttachmentsTab({ projectId, canEdit }: AttachmentsTabProps) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["attachments", projectId],
    queryFn: () => api.attachments(projectId),
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.deleteAttachment(id),
    onSuccess: () => {
      toast.success("Anexo removido.")
      queryClient.invalidateQueries({ queryKey: ["attachments", projectId] })
      queryClient.invalidateQueries({ queryKey: ["history", projectId] })
    },
    onError: (error) => toast.error(error.message),
  })

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error("O arquivo excede o limite de 10 MB.")
      return
    }
    setUploading(true)
    try {
      await api.uploadAttachment(projectId, file)
      toast.success("Anexo enviado.")
      queryClient.invalidateQueries({ queryKey: ["attachments", projectId] })
      queryClient.invalidateQueries({ queryKey: ["history", projectId] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o arquivo.")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  const attachments = data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Documentos do projeto · <span className="font-mono text-foreground">{attachments.length}</span> arquivo(s) · limite de 10 MB
        </p>
        {canEdit ? (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.odt,.ods,.png,.jpg,.jpeg,.webp,.txt,.csv"
              onChange={(event) => void handleFiles(event.target.files)}
            />
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload data-icon="inline-start" />
              {uploading ? "Enviando…" : "Enviar arquivo"}
            </Button>
          </>
        ) : null}
      </div>

      {attachments.length === 0 ? (
        <Empty className="border border-border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Paperclip />
            </EmptyMedia>
            <EmptyTitle>Nenhum anexo</EmptyTitle>
            <EmptyDescription>Guarde propostas, termos, fotos e documentos de referência junto ao projeto.</EmptyDescription>
          </EmptyHeader>
          {canEdit ? (
            <EmptyContent>
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
                <Upload data-icon="inline-start" />
                Enviar primeiro arquivo
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-background text-muted-foreground">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{attachment.name}</p>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                  {formatFileSize(attachment.size)} · {attachment.uploaded_by?.name ?? "—"} · {formatDateTime(attachment.created_at)}
                </p>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Baixar ${attachment.name}`}
                onClick={async () => {
                  try {
                    await downloadAttachment(attachment)
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Não foi possível baixar o arquivo.")
                  }
                }}
              >
                <Download />
              </Button>
              {canEdit ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remover ${attachment.name}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (window.confirm(`Remover o anexo "${attachment.name}"?`)) removeMutation.mutate(attachment.id)
                  }}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

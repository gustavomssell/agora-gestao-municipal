import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { BadgeCheck, RotateCcw, ShieldCheck, ShieldX } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatDateTime } from "@/lib/format"
import { ROLES } from "@/lib/roles"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type { ProjectApproval } from "@/types"

const stageLabels: Record<string, string> = {
  TECNICA: "Aprovação técnica",
  ORCAMENTARIA: "Aprovação orçamentária",
  JURIDICA: "Aprovação jurídica",
}

const statusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
}

const statusClass: Record<string, string> = {
  PENDENTE: "border-status-warn/30 bg-status-warn/10 text-status-warn",
  APROVADO: "border-status-done/30 bg-status-done/10 text-status-done",
  REJEITADO: "border-status-late/30 bg-status-late/10 text-status-late",
}

export function ApprovalsTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient()
  const { me } = useAuth()
  const [editing, setEditing] = useState<ProjectApproval | null>(null)
  const [status, setStatus] = useState("APROVADO")
  const [comment, setComment] = useState("")
  const [signature, setSignature] = useState("")
  const [error, setError] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["approvals", projectId],
    queryFn: () => api.approvals(projectId),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["approvals", projectId] })
    queryClient.invalidateQueries({ queryKey: ["project", projectId] })
    queryClient.invalidateQueries({ queryKey: ["history", projectId] })
  }

  const decideMutation = useMutation({
    mutationFn: () => api.decideApproval(editing!.id, { status, comment, signature }),
    onSuccess: () => {
      toast.success("Decisão registrada.")
      setEditing(null)
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  const resetMutation = useMutation({
    mutationFn: (id: number) => api.resetApproval(id),
    onSuccess: () => {
      toast.success("Etapa reaberta.")
      invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  function openDecision(approval: ProjectApproval) {
    setEditing(approval)
    setStatus("APROVADO")
    setComment("")
    setSignature(me?.user.name ?? "")
    setError("")
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />

  const items = data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        As etapas seguem a ordem técnica, orçamentária e jurídica. A assinatura é um registro interno, não substitui certificação ICP-Brasil.
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        {items.map((approval) => (
          <Card key={approval.id} className="gap-3 py-4">
            <CardContent className="flex flex-col gap-3 px-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">Etapa {approval.id}</p>
                  <h3 className="font-medium">{stageLabels[approval.stage] ?? approval.stage}</h3>
                </div>
                <span className={`border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] ${statusClass[approval.status]}`}>
                  {statusLabels[approval.status]}
                </span>
              </div>
              {approval.comment ? <p className="text-sm text-muted-foreground">{approval.comment}</p> : null}
              {approval.signature ? (
                <div className="border-t border-border pt-2 text-xs text-muted-foreground">
                  <p>Assinado por <span className="text-foreground">{approval.signature}</span></p>
                  <p className="font-mono text-[0.62rem]">{approval.approver?.name ?? "—"} · {formatDateTime(approval.decided_at)}</p>
                </div>
              ) : null}
              <div className="mt-auto flex gap-2">
                {data?.can_decide && approval.status === "PENDENTE" ? (
                  <Button size="sm" onClick={() => openDecision(approval)}>
                    <BadgeCheck data-icon="inline-start" />
                    Decidir
                  </Button>
                ) : null}
                {me?.user.role === ROLES.ADMIN && approval.status !== "PENDENTE" ? (
                  <Button size="sm" variant="outline" onClick={() => resetMutation.mutate(approval.id)}>
                    <RotateCcw data-icon="inline-start" />
                    Reabrir
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decidir {editing ? stageLabels[editing.stage] : ""}</DialogTitle>
            <DialogDescription>Registre a decisão e o responsável pela assinatura interna.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={status === "APROVADO" ? "default" : "outline"}
                onClick={() => setStatus("APROVADO")}
              >
                <ShieldCheck data-icon="inline-start" />
                Aprovar
              </Button>
              <Button
                type="button"
                variant={status === "REJEITADO" ? "destructive" : "outline"}
                onClick={() => setStatus("REJEITADO")}
              >
                <ShieldX data-icon="inline-start" />
                Rejeitar
              </Button>
            </div>
            <Field>
              <FieldLabel htmlFor="approval-signature">Responsável pela assinatura</FieldLabel>
              <Input id="approval-signature" value={signature} onChange={(event) => setSignature(event.target.value)} />
            </Field>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="approval-comment">Parecer {status === "REJEITADO" ? "(obrigatório)" : "(opcional)"}</FieldLabel>
              <Textarea id="approval-comment" value={comment} onChange={(event) => setComment(event.target.value)} rows={4} />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                setError("")
                if (status === "APROVADO" && signature.trim().length < 3) {
                  setError("Informe o nome do responsável pela assinatura.")
                  return
                }
                if (status === "REJEITADO" && !comment.trim()) {
                  setError("Informe o motivo da rejeição.")
                  return
                }
                decideMutation.mutate()
              }}
              disabled={decideMutation.isPending}
            >
              Registrar decisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

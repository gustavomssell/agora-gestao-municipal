import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Mail, Phone, Plus, Trash2, Users } from "lucide-react"
import { api, type StakeholderPayload } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type { Stakeholder } from "@/types"

const kinds = ["EQUIPE", "BENEFICIARIO", "ORGAO", "FORNECEDOR", "COMUNIDADE", "OUTRO"]

const kindLabels: Record<string, string> = {
  EQUIPE: "Equipe",
  BENEFICIARIO: "Beneficiário",
  ORGAO: "Órgão",
  FORNECEDOR: "Fornecedor",
  COMUNIDADE: "Comunidade",
  OUTRO: "Outro",
}

export function StakeholdersTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Stakeholder | null | "new">(null)

  const { data, isLoading } = useQuery({
    queryKey: ["stakeholders", projectId],
    queryFn: () => api.stakeholders(projectId),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["stakeholders", projectId] })
    queryClient.invalidateQueries({ queryKey: ["history", projectId] })
  }

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.deleteStakeholder(id),
    onSuccess: () => {
      toast.success("Parte interessada removida.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />

  const items = data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-foreground">{items.length}</span> partes interessadas mapeadas
        </p>
        {data?.can_edit ? (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus data-icon="inline-start" />
            Nova parte
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <Card className="py-10">
          <CardContent className="flex flex-col items-center gap-2 text-center">
            <Users className="size-5 text-muted-foreground" />
            <p className="text-sm">Nenhuma parte interessada cadastrada.</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Mapeie equipe, beneficiários, órgãos e comunidade para acompanhar influência e interesse.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="gap-3 py-4">
              <CardContent className="flex flex-col gap-2 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {kindLabels[item.kind] ?? item.kind}
                      {item.organization ? ` · ${item.organization}` : ""}
                    </p>
                  </div>
                  {data?.can_edit ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>Editar</Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => removeMutation.mutate(item.id)} aria-label="Excluir parte interessada">
                        <Trash2 />
                      </Button>
                    </div>
                  ) : null}
                </div>
                {item.role ? <p className="text-sm text-muted-foreground">{item.role}</p> : null}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {item.email ? <span className="flex items-center gap-1"><Mail className="size-3" />{item.email}</span> : null}
                  {item.phone ? <span className="flex items-center gap-1"><Phone className="size-3" />{item.phone}</span> : null}
                </div>
                <div className="mt-1 flex gap-4 border-t border-border pt-2 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                  <span>influência {item.influence}/5</span>
                  <span>interesse {item.interest}/5</span>
                </div>
                {item.notes ? <p className="text-xs text-muted-foreground">{item.notes}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StakeholderDialog
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        projectId={projectId}
        stakeholder={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={invalidate}
      />
    </div>
  )
}

function StakeholderDialog({
  projectId,
  stakeholder,
  open,
  onClose,
  onSaved,
}: {
  projectId: number
  stakeholder: Stakeholder | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(stakeholder?.name ?? "")
  const [kind, setKind] = useState<string>(stakeholder?.kind ?? "EQUIPE")
  const [organization, setOrganization] = useState(stakeholder?.organization ?? "")
  const [email, setEmail] = useState(stakeholder?.email ?? "")
  const [phone, setPhone] = useState(stakeholder?.phone ?? "")
  const [role, setRole] = useState(stakeholder?.role ?? "")
  const [influence, setInfluence] = useState(String(stakeholder?.influence ?? 3))
  const [interest, setInterest] = useState(String(stakeholder?.interest ?? 3))
  const [notes, setNotes] = useState(stakeholder?.notes ?? "")

  const mutation = useMutation({
    mutationFn: (payload: StakeholderPayload) =>
      stakeholder ? api.updateStakeholder(stakeholder.id, payload) : api.createStakeholder(projectId, payload),
    onSuccess: () => {
      toast.success(stakeholder ? "Parte interessada atualizada." : "Parte interessada criada.")
      onClose()
      onSaved()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stakeholder ? "Editar parte interessada" : "Nova parte interessada"}</DialogTitle>
          <DialogDescription>Registre quem influencia ou é afetado pelo projeto.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="stakeholder-name">Nome</FieldLabel>
            <Input id="stakeholder-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Tipo</FieldLabel>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {kinds.map((item) => <SelectItem key={item} value={item}>{kindLabels[item]}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="stakeholder-organization">Organização</FieldLabel>
            <Input id="stakeholder-organization" value={organization} onChange={(event) => setOrganization(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="stakeholder-role">Papel</FieldLabel>
            <Input id="stakeholder-role" value={role} onChange={(event) => setRole(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="stakeholder-email">E-mail</FieldLabel>
            <Input id="stakeholder-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="stakeholder-phone">Telefone</FieldLabel>
            <Input id="stakeholder-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="stakeholder-influence">Influência (1–5)</FieldLabel>
            <Input id="stakeholder-influence" type="number" min="1" max="5" value={influence} onChange={(event) => setInfluence(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="stakeholder-interest">Interesse (1–5)</FieldLabel>
            <Input id="stakeholder-interest" type="number" min="1" max="5" value={interest} onChange={(event) => setInterest(event.target.value)} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="stakeholder-notes">Observações</FieldLabel>
            <Textarea id="stakeholder-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() =>
              mutation.mutate({
                name,
                kind,
                organization,
                email,
                phone,
                role,
                influence: Number(influence),
                interest: Number(interest),
                notes,
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

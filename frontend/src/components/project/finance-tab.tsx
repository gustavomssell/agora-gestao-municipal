import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Banknote, FileSignature, Landmark, Plus, Receipt, Trash2 } from "lucide-react"
import { api, type BudgetLinePayload, type CommitmentPayload, type ContractPayload } from "@/lib/api"
import { formatDate, formatMoney, toInputDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type { BudgetLine, Commitment, Contract } from "@/types"

const commitmentStatuses = ["EMPENHADO", "LIQUIDADO", "PAGO", "CANCELADO"]
const contractStatuses = ["VIGENTE", "ENCERRADO", "RESCINDIDO", "ADITIVO"]

export function FinanceTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient()
  const [lineDialog, setLineDialog] = useState<BudgetLine | null | "new">(null)
  const [commitmentDialog, setCommitmentDialog] = useState<Commitment | null | "new">(null)
  const [paymentFor, setPaymentFor] = useState<Commitment | null>(null)
  const [contractDialog, setContractDialog] = useState<Contract | null | "new">(null)

  const { data, isLoading } = useQuery({ queryKey: ["finance", projectId], queryFn: () => api.finance(projectId) })
  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: api.suppliers, staleTime: 5 * 60 * 1000 })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["finance", projectId] })
    queryClient.invalidateQueries({ queryKey: ["project", projectId] })
    queryClient.invalidateQueries({ queryKey: ["projects"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["history", projectId] })
  }

  const removeLine = useMutation({
    mutationFn: (id: number) => api.deleteBudgetLine(id),
    onSuccess: () => {
      toast.success("Dotação removida.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })
  const removeCommitment = useMutation({
    mutationFn: (id: number) => api.deleteCommitment(id),
    onSuccess: () => {
      toast.success("Empenho removido.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })
  const removePayment = useMutation({
    mutationFn: (id: number) => api.deletePayment(id),
    onSuccess: () => {
      toast.success("Pagamento removido.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })
  const removeContract = useMutation({
    mutationFn: (id: number) => api.deleteContract(id),
    onSuccess: () => {
      toast.success("Contrato removido.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  if (isLoading) return <Skeleton className="h-80 w-full" />

  const finance = data
  if (!finance) return null
  const suppliers = suppliersQuery.data?.items ?? []

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Previsto" value={formatMoney(finance.totals.planned)} icon={Landmark} />
        <SummaryCard label="Empenhado" value={formatMoney(finance.totals.committed)} icon={Receipt} />
        <SummaryCard label="Pago" value={formatMoney(finance.totals.paid)} icon={Banknote} />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3">
          <CardTitle className="text-sm">Dotações orçamentárias</CardTitle>
          {finance.can_edit ? (
            <Button size="sm" variant="outline" onClick={() => setLineDialog("new")}>
              <Plus data-icon="inline-start" />
              Nova dotação
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {finance.budget_lines.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma dotação cadastrada.</p>
          ) : (
            <ul className="divide-y divide-border">
              {finance.budget_lines.map((line) => (
                <li key={line.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground">{line.code}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{line.description || "Sem descrição"}</p>
                    <p className="text-xs text-muted-foreground">{line.source || "Fonte não informada"}</p>
                  </div>
                  <span className="font-mono text-sm">{formatMoney(line.planned)}</span>
                  {finance.can_edit ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setLineDialog(line)}>Editar</Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => removeLine.mutate(line.id)} aria-label="Excluir dotação">
                        <Trash2 />
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3">
          <CardTitle className="text-sm">Empenhos e pagamentos</CardTitle>
          {finance.can_edit ? (
            <Button size="sm" variant="outline" onClick={() => setCommitmentDialog("new")}>
              <Plus data-icon="inline-start" />
              Novo empenho
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {finance.commitments.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum empenho cadastrado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {finance.commitments.map((commitment) => (
                <li key={commitment.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">{commitment.number || `#${commitment.id}`}</span>
                    <p className="min-w-0 flex-1 truncate text-sm">{commitment.description}</p>
                    <span className="border border-border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                      {commitment.status}
                    </span>
                    <span className="font-mono text-sm">{formatMoney(commitment.amount)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{commitment.supplier?.name ?? "Sem fornecedor"}</span>
                    <span>{commitment.budget_line?.code ?? "Sem dotação"}</span>
                    <span>Emitido em {formatDate(commitment.issued_at)}</span>
                    {finance.can_edit ? (
                      <span className="ml-auto flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setPaymentFor(commitment)}>Pagamento</Button>
                        <Button size="sm" variant="ghost" onClick={() => setCommitmentDialog(commitment)}>Editar</Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => removeCommitment.mutate(commitment.id)} aria-label="Excluir empenho">
                          <Trash2 />
                        </Button>
                      </span>
                    ) : null}
                  </div>
                  {commitment.payments?.length ? (
                    <ul className="ml-4 flex flex-col gap-1 border-l border-border pl-3">
                      {commitment.payments.map((payment) => (
                        <li key={payment.id} className="flex items-center gap-3 text-xs">
                          <span className="font-mono">{formatMoney(payment.amount)}</span>
                          <span className="text-muted-foreground">{formatDate(payment.paid_at)}</span>
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">{payment.note}</span>
                          {finance.can_edit ? (
                            <Button size="icon-sm" variant="ghost" onClick={() => removePayment.mutate(payment.id)} aria-label="Excluir pagamento">
                              <Trash2 />
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3">
          <CardTitle className="text-sm">Contratos</CardTitle>
          {finance.can_edit ? (
            <Button size="sm" variant="outline" onClick={() => setContractDialog("new")}>
              <Plus data-icon="inline-start" />
              Novo contrato
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {finance.contracts.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum contrato cadastrado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {finance.contracts.map((contract) => (
                <li key={contract.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <FileSignature className="size-4 text-muted-foreground" />
                  <span className="font-mono text-xs">{contract.number}</span>
                  <p className="min-w-0 flex-1 truncate text-sm">{contract.object}</p>
                  <span className="text-xs text-muted-foreground">{contract.supplier?.name ?? "Sem fornecedor"}</span>
                  <span className="border border-border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                    {contract.status}
                  </span>
                  <span className="font-mono text-sm">{formatMoney(contract.value)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(contract.start_date)} — {formatDate(contract.end_date)}</span>
                  {finance.can_edit ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setContractDialog(contract)}>Editar</Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => removeContract.mutate(contract.id)} aria-label="Excluir contrato">
                        <Trash2 />
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <BudgetLineDialog
        key={`line-${lineDialog === "new" ? "new" : lineDialog?.id ?? "closed"}`}
        projectId={projectId}
        line={lineDialog === "new" ? null : lineDialog}
        open={lineDialog !== null}
        onClose={() => setLineDialog(null)}
        onSaved={invalidate}
      />
      <CommitmentDialog
        key={`commitment-${commitmentDialog === "new" ? "new" : commitmentDialog?.id ?? "closed"}`}
        projectId={projectId}
        commitment={commitmentDialog === "new" ? null : commitmentDialog}
        budgetLines={finance.budget_lines}
        suppliers={suppliers}
        open={commitmentDialog !== null}
        onClose={() => setCommitmentDialog(null)}
        onSaved={invalidate}
      />
      <PaymentDialog
        key={`payment-${paymentFor?.id ?? "closed"}`}
        commitment={paymentFor}
        open={Boolean(paymentFor)}
        onClose={() => setPaymentFor(null)}
        onSaved={invalidate}
      />
      <ContractDialog
        key={`contract-${contractDialog === "new" ? "new" : contractDialog?.id ?? "closed"}`}
        projectId={projectId}
        contract={contractDialog === "new" ? null : contractDialog}
        commitments={finance.commitments}
        suppliers={suppliers}
        open={contractDialog !== null}
        onClose={() => setContractDialog(null)}
        onSaved={invalidate}
      />
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Landmark }) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="px-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="size-3.5" />
          {label}
        </p>
        <p className="mt-1 font-mono text-lg">{value}</p>
      </CardContent>
    </Card>
  )
}

function BudgetLineDialog({
  projectId,
  line,
  open,
  onClose,
  onSaved,
}: {
  projectId: number
  line: BudgetLine | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState(line?.code ?? "")
  const [description, setDescription] = useState(line?.description ?? "")
  const [source, setSource] = useState(line?.source ?? "")
  const [planned, setPlanned] = useState(String(line?.planned ?? 0))

  const mutation = useMutation({
    mutationFn: (payload: BudgetLinePayload) =>
      line ? api.updateBudgetLine(line.id, payload) : api.createBudgetLine(projectId, payload),
    onSuccess: () => {
      toast.success(line ? "Dotação atualizada." : "Dotação criada.")
      onClose()
      onSaved()
    },
    onError: (error) => toast.error(error.message),
  })

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{line ? "Editar dotação" : "Nova dotação"}</DialogTitle>
          <DialogDescription>Vincule a origem orçamentária e o valor previsto.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="line-code">Código</FieldLabel>
            <Input id="line-code" defaultValue={line?.code ?? ""} onChange={(event) => setCode(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="line-description">Descrição</FieldLabel>
            <Input id="line-description" defaultValue={line?.description ?? ""} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="line-source">Fonte</FieldLabel>
            <Input id="line-source" defaultValue={line?.source ?? ""} onChange={(event) => setSource(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="line-planned">Valor previsto</FieldLabel>
            <Input id="line-planned" type="number" min="0" step="0.01" defaultValue={line?.planned ?? 0} onChange={(event) => setPlanned(event.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate({ code, description, source, planned: Number(planned) })}
            disabled={mutation.isPending}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CommitmentDialog({
  projectId,
  commitment,
  budgetLines,
  suppliers,
  open,
  onClose,
  onSaved,
}: {
  projectId: number
  commitment: Commitment | null
  budgetLines: BudgetLine[]
  suppliers: { id: number; name: string }[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [number, setNumber] = useState(commitment?.number ?? "")
  const [description, setDescription] = useState(commitment?.description ?? "")
  const [amount, setAmount] = useState(String(commitment?.amount ?? 0))
  const [status, setStatus] = useState<string>(commitment?.status ?? "EMPENHADO")
  const [issuedAt, setIssuedAt] = useState(toInputDate(commitment?.issued_at))
  const [budgetLineId, setBudgetLineId] = useState(commitment?.budget_line_id ? String(commitment.budget_line_id) : "none")
  const [supplierId, setSupplierId] = useState(commitment?.supplier_id ? String(commitment.supplier_id) : "none")

  const mutation = useMutation({
    mutationFn: (payload: CommitmentPayload) =>
      commitment ? api.updateCommitment(commitment.id, payload) : api.createCommitment(projectId, payload),
    onSuccess: () => {
      toast.success(commitment ? "Empenho atualizado." : "Empenho criado.")
      onClose()
      onSaved()
    },
    onError: (error) => toast.error(error.message),
  })

  function submit() {
    mutation.mutate({
      number,
      description,
      amount: Number(amount),
      status,
      issued_at: issuedAt || null,
      budget_line_id: budgetLineId === "none" ? null : Number(budgetLineId),
      supplier_id: supplierId === "none" ? null : Number(supplierId),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{commitment ? "Editar empenho" : "Novo empenho"}</DialogTitle>
          <DialogDescription>Registre o compromisso e vincule dotação e fornecedor.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="commitment-number">Número</FieldLabel>
            <Input id="commitment-number" defaultValue={commitment?.number ?? ""} onChange={(event) => setNumber(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="commitment-amount">Valor</FieldLabel>
            <Input id="commitment-amount" type="number" min="0" step="0.01" defaultValue={commitment?.amount ?? 0} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="commitment-description">Descrição</FieldLabel>
            <Textarea id="commitment-description" defaultValue={commitment?.description ?? ""} onChange={(event) => setDescription(event.target.value)} rows={2} />
          </Field>
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {commitmentStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="commitment-issued">Emissão</FieldLabel>
            <Input id="commitment-issued" type="date" defaultValue={toInputDate(commitment?.issued_at)} onChange={(event) => setIssuedAt(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Dotação</FieldLabel>
            <Select value={budgetLineId} onValueChange={setBudgetLineId}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Sem dotação</SelectItem>
                  {budgetLines.map((line) => <SelectItem key={line.id} value={String(line.id)}>{line.code}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Fornecedor</FieldLabel>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Sem fornecedor</SelectItem>
                  {suppliers.map((supplier) => <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.name}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={mutation.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PaymentDialog({
  commitment,
  open,
  onClose,
  onSaved,
}: {
  commitment: Commitment | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState("0")
  const [paidAt, setPaidAt] = useState("")
  const [note, setNote] = useState("")

  const mutation = useMutation({
    mutationFn: () => api.createPayment(commitment!.id, { amount: Number(amount), paid_at: paidAt || null, note }),
    onSuccess: () => {
      toast.success("Pagamento registrado.")
      onClose()
      onSaved()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>{commitment?.description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="payment-amount">Valor</FieldLabel>
            <Input id="payment-amount" type="number" min="0" step="0.01" defaultValue="0" onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="payment-date">Data</FieldLabel>
            <Input id="payment-date" type="date" onChange={(event) => setPaidAt(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="payment-note">Observação</FieldLabel>
            <Input id="payment-note" onChange={(event) => setNote(event.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ContractDialog({
  projectId,
  contract,
  commitments,
  suppliers,
  open,
  onClose,
  onSaved,
}: {
  projectId: number
  contract: Contract | null
  commitments: Commitment[]
  suppliers: { id: number; name: string }[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [number, setNumber] = useState(contract?.number ?? "")
  const [object, setObject] = useState(contract?.object ?? "")
  const [value, setValue] = useState(String(contract?.value ?? 0))
  const [status, setStatus] = useState<string>(contract?.status ?? "VIGENTE")
  const [startDate, setStartDate] = useState(toInputDate(contract?.start_date))
  const [endDate, setEndDate] = useState(toInputDate(contract?.end_date))
  const [supplierId, setSupplierId] = useState(contract?.supplier_id ? String(contract.supplier_id) : "none")
  const [commitmentId, setCommitmentId] = useState(contract?.commitment_id ? String(contract.commitment_id) : "none")

  const mutation = useMutation({
    mutationFn: (payload: ContractPayload) =>
      contract ? api.updateContract(contract.id, payload) : api.createContract(projectId, payload),
    onSuccess: () => {
      toast.success(contract ? "Contrato atualizado." : "Contrato criado.")
      onClose()
      onSaved()
    },
    onError: (error) => toast.error(error.message),
  })

  function submit() {
    mutation.mutate({
      number,
      object,
      value: Number(value),
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      signed_at: null,
      supplier_id: supplierId === "none" ? null : Number(supplierId),
      commitment_id: commitmentId === "none" ? null : Number(commitmentId),
      parent_id: null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contract ? "Editar contrato" : "Novo contrato"}</DialogTitle>
          <DialogDescription>Registre o instrumento contratual e sua vigência.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="contract-number">Número</FieldLabel>
            <Input id="contract-number" defaultValue={contract?.number ?? ""} onChange={(event) => setNumber(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="contract-value">Valor</FieldLabel>
            <Input id="contract-value" type="number" min="0" step="0.01" defaultValue={contract?.value ?? 0} onChange={(event) => setValue(event.target.value)} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="contract-object">Objeto</FieldLabel>
            <Textarea id="contract-object" defaultValue={contract?.object ?? ""} onChange={(event) => setObject(event.target.value)} rows={2} />
          </Field>
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {contractStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Fornecedor</FieldLabel>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Sem fornecedor</SelectItem>
                  {suppliers.map((supplier) => <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.name}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="contract-start">Início</FieldLabel>
            <Input id="contract-start" type="date" defaultValue={toInputDate(contract?.start_date)} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="contract-end">Fim</FieldLabel>
            <Input id="contract-end" type="date" defaultValue={toInputDate(contract?.end_date)} onChange={(event) => setEndDate(event.target.value)} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Empenho vinculado</FieldLabel>
            <Select value={commitmentId} onValueChange={setCommitmentId}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Sem empenho</SelectItem>
                  {commitments.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.number || item.description}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={mutation.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Truck } from "lucide-react"
import { api, type SupplierPayload } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Supplier } from "@/types"

export function SuppliersTab() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Supplier | null | "new">(null)

  const { data, isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: api.suppliers })

  const removeActive = useMutation({
    mutationFn: (supplier: Supplier) =>
      api.updateSupplier(supplier.id, {
        name: supplier.name,
        document: supplier.document,
        category: supplier.category,
        email: supplier.email,
        phone: supplier.phone,
        active: !supplier.active,
      }),
    onSuccess: () => {
      toast.success("Fornecedor atualizado.")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
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
          Novo fornecedor
        </Button>
      </div>
      {items.length === 0 ? (
        <Empty className="border border-border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Truck /></EmptyMedia>
            <EmptyTitle>Nenhum fornecedor cadastrado</EmptyTitle>
            <EmptyDescription>Cadastre fornecedores para vincular empenhos e contratos.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fornecedor</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="w-24 text-center">Ativo</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((supplier) => (
                <TableRow key={supplier.id} className={!supplier.active ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="font-mono text-xs">{supplier.document || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{supplier.category || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {supplier.email || supplier.phone || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={supplier.active}
                      onCheckedChange={() => removeActive.mutate(supplier)}
                      aria-label={`Ativar ou inativar ${supplier.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(supplier)}>Editar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SupplierDialog
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        supplier={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["suppliers"] })}
      />
    </div>
  )
}

function SupplierDialog({
  supplier,
  open,
  onClose,
  onSaved,
}: {
  supplier: Supplier | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(supplier?.name ?? "")
  const [document, setDocument] = useState(supplier?.document ?? "")
  const [category, setCategory] = useState(supplier?.category ?? "")
  const [email, setEmail] = useState(supplier?.email ?? "")
  const [phone, setPhone] = useState(supplier?.phone ?? "")
  const [active, setActive] = useState(supplier?.active ?? true)

  const mutation = useMutation({
    mutationFn: (payload: SupplierPayload) =>
      supplier ? api.updateSupplier(supplier.id, payload) : api.createSupplier(payload),
    onSuccess: () => {
      toast.success(supplier ? "Fornecedor atualizado." : "Fornecedor criado.")
      onClose()
      onSaved()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          <DialogDescription>Dados usados em empenhos, contratos e relatórios.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="supplier-name">Nome</FieldLabel>
            <Input id="supplier-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="supplier-document">CNPJ/CPF</FieldLabel>
            <Input id="supplier-document" value={document} onChange={(event) => setDocument(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="supplier-category">Categoria</FieldLabel>
            <Input id="supplier-category" value={category} onChange={(event) => setCategory(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="supplier-email">E-mail</FieldLabel>
            <Input id="supplier-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="supplier-phone">Telefone</FieldLabel>
            <Input id="supplier-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          <label className="flex items-center justify-between gap-3 border border-border px-4 py-3 sm:col-span-2">
            <span className="text-sm">Fornecedor ativo</span>
            <Switch checked={active} onCheckedChange={setActive} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate({ name, document, category, email, phone, active })}
            disabled={mutation.isPending}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

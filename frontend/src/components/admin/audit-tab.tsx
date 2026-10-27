import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Download, ScrollText, Search } from "lucide-react"
import { api, downloadAuditCsv } from "@/lib/api"
import { auditActionOptions } from "@/lib/audit"
import { formatDateTime } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const entityOptions = [
  { value: "all", label: "Todas as entidades" },
  { value: "projeto", label: "Projeto" },
  { value: "usuario", label: "Usuário" },
  { value: "secretaria", label: "Secretaria" },
  { value: "cargo", label: "Cargo" },
  { value: "prefeitura", label: "Prefeitura" },
]

export function AuditTab() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [entity, setEntity] = useState("all")
  const [action, setAction] = useState("all")
  const [userId, setUserId] = useState(() => searchParams.get("user") ?? "all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const usersQuery = useQuery({
    queryKey: ["users", "audit"],
    queryFn: () => api.users(),
    staleTime: 5 * 60 * 1000,
  })

  const filters = {
    search: debouncedSearch || undefined,
    entity: entity === "all" ? undefined : entity,
    action: action === "all" ? undefined : action,
    user_id: userId === "all" ? undefined : Number(userId),
    from: from || undefined,
    to: to || undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ["logs", filters, page],
    queryFn: () => api.logs({ ...filters, page }),
  })

  async function handleExport() {
    setExporting(true)
    try {
      await downloadAuditCsv(filters)
      toast.success("Auditoria exportada.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar a auditoria.")
    } finally {
      setExporting(false)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.page_size || 50))) : 1
  const logs = data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por usuário ou detalhe"
            className="pl-9"
            aria-label="Buscar na auditoria"
          />
        </div>
        <Select value={entity} onValueChange={(value) => { setEntity(value); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Filtrar por entidade">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {entityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={(value) => { setAction(value); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Filtrar por ação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todas as ações</SelectItem>
              {auditActionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={userId} onValueChange={(value) => { setUserId(value); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Filtrar por usuário">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todos os usuários</SelectItem>
              {usersQuery.data?.items.map((user) => (
                <SelectItem key={user.id} value={String(user.id)}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1) }} className="w-full sm:w-40" aria-label="Data inicial" />
        <Input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1) }} className="w-full sm:w-40" aria-label="Data final" />
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="w-full sm:w-auto">
          <Download data-icon="inline-start" />
          {exporting ? "Exportando…" : "Exportar CSV"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : logs.length ? (
        <>
          <div className="flex flex-col gap-2 xl:hidden">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">{log.action}</span>
                  <span className="font-mono text-[0.65rem] tabular text-muted-foreground">{formatDateTime(log.created_at)}</span>
                </div>
                <p className="mt-1.5 text-xs font-medium">{log.user_name}</p>
                <p className="mt-1 text-xs break-words text-muted-foreground">{log.details}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.65rem] text-muted-foreground">
                  <span>{log.entity} #{log.entity_id}</span>
                  {log.ip ? <span>{log.ip}</span> : null}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card xl:block">
            <Table className="min-w-[56rem]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-40">Quando</TableHead>
                  <TableHead className="w-40">Usuário</TableHead>
                  <TableHead className="w-44">Ação</TableHead>
                  <TableHead>Detalhe</TableHead>
                  <TableHead className="hidden 2xl:table-cell">Entidade</TableHead>
                  <TableHead className="hidden 2xl:table-cell">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-[0.68rem] tabular text-muted-foreground">{formatDateTime(log.created_at)}</TableCell>
                    <TableCell className="truncate text-xs">{log.user_name}</TableCell>
                    <TableCell className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">{log.action}</TableCell>
                    <TableCell className="text-xs">{log.details}</TableCell>
                    <TableCell className="hidden font-mono text-[0.65rem] text-muted-foreground 2xl:table-cell">
                      {log.entity} #{log.entity_id}
                    </TableCell>
                    <TableCell className="hidden font-mono text-[0.65rem] text-muted-foreground 2xl:table-cell">{log.ip || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {data?.total ?? 0} registro(s) · página {data?.page ?? page} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                <ChevronLeft data-icon="inline-start" />
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
                Próxima
                <ChevronRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Empty className="border border-border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollText />
            </EmptyMedia>
            <EmptyTitle>Nenhum registro</EmptyTitle>
            <EmptyDescription>Não há eventos de auditoria para os filtros aplicados.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}

import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { FileSpreadsheet, FileText, Search } from "lucide-react"
import { api, downloadReport } from "@/lib/api"
import { formatDate, projectStatusLabels, priorityLabels } from "@/lib/format"
import { PageHeader } from "@/components/page-header"
import { PeriodFields } from "@/components/period-fields"
import { ReportsAutomation } from "@/components/reports-automation"
import { ProjectStatusBadge } from "@/components/badges"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export default function ReportsPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [priority, setPriority] = useState("all")
  const [secretariatId, setSecretariatId] = useState("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [overdue, setOverdue] = useState(false)
  const [includeCanceled, setIncludeCanceled] = useState(false)
  const [downloading, setDownloading] = useState<"xlsx" | "pdf" | null>(null)
  const filterIncludesCanceled = includeCanceled || status === "CANCELADO"

  const filters = {
    search: search || undefined,
    status: status === "all" ? undefined : status,
    priority: priority === "all" ? undefined : priority,
    secretariat_id: secretariatId === "all" ? undefined : Number(secretariatId),
    from: from || undefined,
    to: to || undefined,
    overdue: overdue || undefined,
    include_canceled: filterIncludesCanceled || undefined,
  }

  const secretariatsQuery = useQuery({ queryKey: ["secretariats"], queryFn: api.secretariats, staleTime: 5 * 60 * 1000 })
  const previewQuery = useQuery({
    queryKey: ["reports-preview", filters],
    queryFn: () => api.projects({ ...filters, page: 1, page_size: 10, sort: "updated" }),
  })
  const summaryQuery = useQuery({
    queryKey: ["reports-summary", filters],
    queryFn: () => api.reportSummary(filters),
  })
  const previewItems = previewQuery.data?.items ?? []

  async function handleDownload(format: "xlsx" | "pdf") {
    setDownloading(format)
    try {
      await downloadReport({ ...filters, format })
      toast.success("Relatório gerado.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o relatório.")
    } finally {
      setDownloading(null)
    }
  }

  function applyFilters(values: Record<string, unknown>) {
    if (typeof values.search === "string") setSearch(values.search)
    if (typeof values.status === "string") setStatus(values.status)
    if (typeof values.priority === "string") setPriority(values.priority)
    if (typeof values.secretariat_id === "number") setSecretariatId(String(values.secretariat_id))
    else setSecretariatId("all")
    if (typeof values.from === "string") setFrom(values.from)
    else setFrom("")
    if (typeof values.to === "string") setTo(values.to)
    else setTo("")
    setOverdue(values.overdue === true)
    setIncludeCanceled(values.include_canceled === true)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relatórios"
        description="Extraia a carteira de projetos em planilha Excel com os filtros aplicados. Ideal para reuniões de acompanhamento e prestação de contas."
      />

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="text-base">Filtros do relatório</CardTitle>
            <CardDescription>Os mesmos filtros valem para a prévia e para o arquivo exportado.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="report-search" className="text-sm font-medium">
                Busca
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="report-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome ou código"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Situação</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(projectStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Prioridade</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Secretaria</label>
              <Select value={secretariatId} onValueChange={setSecretariatId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todas</SelectItem>
                    {secretariatsQuery.data?.items.map((secretariat) => (
                      <SelectItem key={secretariat.id} value={String(secretariat.id)}>
                        {secretariat.acronym} · {secretariat.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <PeriodFields
              idPrefix="reports"
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />

            <label htmlFor="report-overdue" className="flex items-center gap-2 text-sm">
              <Checkbox id="report-overdue" checked={overdue} onCheckedChange={(value) => setOverdue(value === true)} />
              Somente projetos em atraso
            </label>

            <label htmlFor="report-canceled" className="flex items-center gap-2 text-sm">
              <Checkbox
                id="report-canceled"
                checked={filterIncludesCanceled}
                disabled={status === "CANCELADO"}
                onCheckedChange={(value) => setIncludeCanceled(value === true)}
              />
              Incluir projetos cancelados
            </label>

            <div className="mt-1 grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleDownload("xlsx")}
                disabled={Boolean(downloading) || previewQuery.isLoading || previewItems.length === 0}
              >
                <FileSpreadsheet data-icon="inline-start" />
                {downloading === "xlsx" ? "Gerando..." : "XLSX"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownload("pdf")}
                disabled={Boolean(downloading) || previewQuery.isLoading || previewItems.length === 0}
              >
                <FileText data-icon="inline-start" />
                {downloading === "pdf" ? "Gerando..." : "PDF"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A exportação inclui código, nome, situação, prioridade, secretaria, prazos, progresso e orçamento.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="size-4 text-muted-foreground" />
              Prévia dos resultados
            </CardTitle>
            <CardDescription>
              {previewQuery.data?.total ?? 0} {(previewQuery.data?.total ?? 0) === 1 ? "projeto" : "projetos"} no filtro atual;
              exibindo os primeiros 10.
            </CardDescription>
            {summaryQuery.data ? (
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                Resumo: {summaryQuery.data.projects} projetos · {summaryQuery.data.activities} atividades ·{" "}
                {summaryQuery.data.risks} riscos
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            {previewQuery.isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-11 w-full" />
                ))}
              </div>
            ) : previewItems.length ? (
              <ul className="divide-y divide-border">
                {previewItems.map((project) => (
                  <li key={project.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
                        {project.code}
                      </span>
                      <Link to={`/projetos/${project.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary">
                        {project.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-3 sm:ml-auto">
                      <span className="hidden w-10 text-xs text-muted-foreground md:inline">
                        {project.responsible_secretariat?.acronym ?? "—"}
                      </span>
                      <ProjectStatusBadge status={project.status} />
                      <span className="w-20 text-right font-mono text-xs tabular text-muted-foreground">
                        {formatDate(project.planned_end)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum projeto corresponde aos filtros.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <ReportsAutomation filters={filters} onApply={applyFilters} />
    </div>
  )
}

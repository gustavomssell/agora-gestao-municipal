import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CalendarClock, Filter, Plus, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"

type ReportFilters = Record<string, string | number | boolean | undefined>

const frequencies = [
  { value: "DAILY", label: "Diário" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensal" },
]

export function ReportsAutomation({
  filters,
  onApply,
}: {
  filters: ReportFilters
  onApply: (filters: Record<string, unknown>) => void
}) {
  const queryClient = useQueryClient()
  const [savedOpen, setSavedOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [name, setName] = useState("")
  const [frequency, setFrequency] = useState("WEEKLY")

  const { data, isLoading } = useQuery({ queryKey: ["saved-reports"], queryFn: api.savedReports })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["saved-reports"] })
  }

  const saveMutation = useMutation({
    mutationFn: () => api.createSavedReport({ name, filters }),
    onSuccess: () => {
      toast.success("Filtro salvo.")
      setSavedOpen(false)
      setName("")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  const scheduleMutation = useMutation({
    mutationFn: () => api.createSchedule({ name, filters, frequency, active: true }),
    onSuccess: () => {
      toast.success("Agendamento criado.")
      setScheduleOpen(false)
      setName("")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  const deleteSaved = useMutation({
    mutationFn: (id: number) => api.deleteSavedReport(id),
    onSuccess: () => {
      toast.success("Filtro removido.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  const toggleSchedule = useMutation({
    mutationFn: ({ id, active, itemName, itemFilters, itemFrequency }: { id: number; active: boolean; itemName: string; itemFilters: string; itemFrequency: string }) =>
      api.updateSchedule(id, { name: itemName, filters: parseFilters(itemFilters), frequency: itemFrequency, active }),
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(error.message),
  })

  const deleteSchedule = useMutation({
    mutationFn: (id: number) => api.deleteSchedule(id),
    onSuccess: () => {
      toast.success("Agendamento removido.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const reports = data?.reports ?? []
  const schedules = data?.schedules ?? []

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4 text-muted-foreground" />
            Filtros salvos
          </CardTitle>
          <CardDescription>Reaplique combinações usadas com frequência.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button size="sm" variant="outline" className="w-fit" onClick={() => setSavedOpen(true)}>
            <Plus data-icon="inline-start" />
            Salvar filtro atual
          </Button>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum filtro salvo.</p>
          ) : (
            <ul className="divide-y divide-border">
              {reports.map((report) => (
                <li key={report.id} className="flex items-center gap-2 py-2">
                  <button className="min-w-0 flex-1 text-left text-sm hover:text-primary" onClick={() => onApply(parseFilters(report.filters))}>
                    {report.name}
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => onApply(parseFilters(report.filters))}>Aplicar</Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => deleteSaved.mutate(report.id)} aria-label="Excluir filtro">
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-muted-foreground" />
            Agendamentos
          </CardTitle>
          <CardDescription>Envie um resumo periódico para você mesmo pelo sistema.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button size="sm" variant="outline" className="w-fit" onClick={() => setScheduleOpen(true)}>
            <Plus data-icon="inline-start" />
            Agendar relatório
          </Button>
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum relatório agendado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {schedules.map((schedule) => (
                <li key={schedule.id} className="flex flex-wrap items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{schedule.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {frequencies.find((item) => item.value === schedule.frequency)?.label ?? schedule.frequency}
                      {schedule.next_run ? ` · próxima ${formatDateTime(schedule.next_run)}` : ""}
                    </p>
                  </div>
                  <Switch
                    checked={schedule.active}
                    onCheckedChange={(active) => toggleSchedule.mutate({ id: schedule.id, active, itemName: schedule.name, itemFilters: schedule.filters, itemFrequency: schedule.frequency })}
                    aria-label={`Ativar agendamento ${schedule.name}`}
                  />
                  <Button size="icon-sm" variant="ghost" onClick={() => deleteSchedule.mutate(schedule.id)} aria-label="Excluir agendamento">
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={savedOpen} onOpenChange={setSavedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar filtro</DialogTitle>
            <DialogDescription>Os filtros atuais serão armazenados para reutilização.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="saved-report-name">Nome</FieldLabel>
            <Input id="saved-report-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSavedOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !name.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar relatório</DialogTitle>
            <DialogDescription>O sistema gera uma notificação com o resumo no período definido.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="schedule-name">Nome</FieldLabel>
              <Input id="schedule-name" value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Frequência</FieldLabel>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {frequencies.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancelar</Button>
            <Button onClick={() => scheduleMutation.mutate()} disabled={scheduleMutation.isPending || !name.trim()}>Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function parseFilters(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

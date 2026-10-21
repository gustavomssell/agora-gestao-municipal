import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, BookOpen, ClipboardList, FileText, FolderKanban, Search, ScrollText, Truck, UserRound, Users, type LucideIcon } from "lucide-react"
import type { SearchLinked } from "@/types"
import { api } from "@/lib/api"
import { roleLabels } from "@/lib/roles"
import { Button } from "@/components/ui/button"
import { ProjectStatusBadge } from "@/components/badges"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export function GlobalSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const enabled = open && debouncedQuery.length >= 2
  const { data, isFetching } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: () => api.search(debouncedQuery),
    enabled,
    staleTime: 30 * 1000,
  })

  const projects = data?.projects ?? []
  const users = data?.users ?? []
  const activities = data?.activities ?? []
  const risks = data?.risks ?? []
  const lessons = data?.lessons ?? []
  const documents = data?.documents ?? []
  const stakeholders = data?.stakeholders ?? []
  const suppliers = data?.suppliers ?? []
  const contracts = data?.contracts ?? []
  const hasResults =
    projects.length + users.length + activities.length + risks.length + lessons.length + documents.length +
      stakeholders.length + suppliers.length + contracts.length >
    0

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setQuery("")
      setDebouncedQuery("")
    }
  }

  function go(to: string) {
    handleOpenChange(false)
    navigate(to)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-56 justify-start gap-2 border-border/70 bg-transparent font-normal text-muted-foreground hover:text-foreground lg:flex"
      >
        <Search className="size-4" />
        Buscar no sistema
        <kbd className="ml-auto rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.6rem] tracking-wide">
          Ctrl K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="size-10 sm:size-8 lg:hidden"
        aria-label="Buscar no sistema"
      >
        <Search />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Busca global"
        description="Busque projetos, atividades, riscos, documentos, pessoas e fornecedores."
        className="sm:max-w-xl"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar projeto por nome ou código, ou pessoa por nome ou e-mail…"
          />
          {debouncedQuery.length < 2 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Digite pelo menos 2 caracteres para buscar.
            </p>
          ) : (
            <CommandList>
              <CommandEmpty>{isFetching ? "Buscando…" : "Nenhum resultado encontrado."}</CommandEmpty>
              {projects.length > 0 ? (
                <CommandGroup heading="Projetos">
                  {projects.map((project) => (
                    <CommandItem
                      key={`project-${project.id}`}
                      value={`project-${project.id}`}
                      onSelect={() => go(`/projetos/${project.id}`)}
                      className="gap-3"
                    >
                      <FolderKanban className="text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{project.name}</span>
                        <span className="block font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                          {project.code} · {project.responsible_secretariat?.acronym ?? "—"}
                        </span>
                      </span>
                      <ProjectStatusBadge status={project.status} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {users.length > 0 ? (
                <CommandGroup heading="Pessoas">
                  {users.map((user) => (
                    <CommandItem
                      key={`user-${user.id}`}
                      value={`user-${user.id}`}
                      onSelect={() => go(`/administracao?tab=usuarios&search=${encodeURIComponent(user.email)}`)}
                      className="gap-3"
                    >
                      <UserRound className="text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{user.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {roleLabels[user.role]}
                        {user.secretariat ? ` · ${user.secretariat.acronym}` : ""}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {activities.length > 0 ? <LinkedGroup heading="Atividades" prefix="activity" icon={ClipboardList} items={activities} onSelect={go} /> : null}
              {risks.length > 0 ? <LinkedGroup heading="Riscos" prefix="risk" icon={AlertTriangle} items={risks} onSelect={go} /> : null}
              {lessons.length > 0 ? <LinkedGroup heading="Lições" prefix="lesson" icon={BookOpen} items={lessons} onSelect={go} /> : null}
              {documents.length > 0 ? <LinkedGroup heading="Documentos" prefix="document" icon={FileText} items={documents} onSelect={go} /> : null}
              {stakeholders.length > 0 ? <LinkedGroup heading="Partes interessadas" prefix="stakeholder" icon={Users} items={stakeholders} onSelect={go} /> : null}
              {contracts.length > 0 ? <LinkedGroup heading="Contratos" prefix="contract" icon={ScrollText} items={contracts} onSelect={go} /> : null}
              {suppliers.length > 0 ? (
                <CommandGroup heading="Fornecedores">
                  {suppliers.map((supplier) => (
                    <CommandItem
                      key={`supplier-${supplier.id}`}
                      value={`supplier-${supplier.id}`}
                      onSelect={() => go("/administracao?tab=fornecedores")}
                      className="gap-3"
                    >
                      <Truck className="text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{supplier.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {supplier.document || "Sem documento"} · {supplier.category || "Sem categoria"}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {hasResults ? (
                <p className="px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                  Enter abre o resultado · ↑↓ navega · Esc fecha
                </p>
              ) : null}
            </CommandList>
          )}
        </Command>
      </CommandDialog>
    </>
  )
}

function LinkedGroup({
  heading,
  prefix,
  icon: Icon,
  items,
  onSelect,
}: {
  heading: string
  prefix: string
  icon: LucideIcon
  items: SearchLinked[]
  onSelect: (to: string) => void
}) {
  return (
    <CommandGroup heading={heading}>
      {items.map((item) => (
        <CommandItem
          key={`${prefix}-${item.id}`}
          value={`${prefix}-${item.id}`}
          onSelect={() => onSelect(`/projetos/${item.project_id}`)}
          className="gap-3"
        >
          <Icon className="text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">{item.title}</span>
            <span className="block truncate font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
              {item.project_code} · {item.project_name}
              {item.detail ? ` · ${item.detail}` : ""}
            </span>
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}

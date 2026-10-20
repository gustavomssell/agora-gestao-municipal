import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { BookOpenCheck, Search } from "lucide-react"
import { api } from "@/lib/api"
import { formatDate, initials } from "@/lib/format"
import { PageHeader } from "@/components/page-header"
import { SecretariatMark } from "@/components/secretariat-mark"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export default function LessonsPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [category, setCategory] = useState("")
  const [secretariatId, setSecretariatId] = useState("all")

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const secretariatsQuery = useQuery({ queryKey: ["secretariats"], queryFn: api.secretariats, staleTime: 5 * 60 * 1000 })
  const { data, isLoading } = useQuery({
    queryKey: ["lessons", debouncedSearch, category, secretariatId],
    queryFn: () =>
      api.lessons({
        search: debouncedSearch || undefined,
        category: category || undefined,
        secretariat_id: secretariatId === "all" ? undefined : Number(secretariatId),
      }),
  })

  const lessons = data?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Lições aprendidas"
        description="Conhecimento acumulado entre secretarias. O que funcionou e o que deve mudar nos próximos projetos da prefeitura."
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por título ou descrição"
            className="pl-9"
            aria-label="Buscar lições"
          />
        </div>
        <Input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Categoria"
          className="w-44"
          aria-label="Filtrar por categoria"
        />
        <Select value={secretariatId} onValueChange={setSecretariatId}>
          <SelectTrigger className="w-52" aria-label="Filtrar por secretaria">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todas secretarias</SelectItem>
              {secretariatsQuery.data?.items.map((secretariat) => (
                <SelectItem key={secretariat.id} value={String(secretariat.id)}>
                  {secretariat.acronym} · {secretariat.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <Empty className="border border-border bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenCheck />
            </EmptyMedia>
            <EmptyTitle>Nenhuma lição encontrada</EmptyTitle>
            <EmptyDescription>As lições são registradas na aba correspondente de cada projeto.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="divide-y divide-border">
            {lessons.map((lesson) => (
              <article key={lesson.id} className="flex gap-4 p-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs text-muted-foreground">
                  {initials(lesson.created_by?.name ?? "Sistema")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-base font-medium leading-snug">{lesson.title}</h2>
                    {lesson.category ? (
                      <span className="border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted-foreground">
                        {lesson.category}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{lesson.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-muted-foreground">
                    {lesson.project ? (
                      <span className="flex min-w-0 items-center gap-1.5">
                        {lesson.project.responsible_secretariat ? (
                          <SecretariatMark
                            name={lesson.project.responsible_secretariat.name}
                            acronym={lesson.project.responsible_secretariat.acronym}
                            color={lesson.project.responsible_secretariat.color}
                            size="xs"
                          />
                        ) : null}
                        <Link to={`/projetos/${lesson.project.id}`} className="truncate hover:text-foreground">
                          {lesson.project.code} · {lesson.project.name}
                        </Link>
                      </span>
                    ) : null}
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.08em]">
                      {lesson.created_by?.name ?? "—"} · {formatDate(lesson.created_at)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {lessons.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {lessons.length} {lessons.length === 1 ? "lição registrada" : "lições registradas"} no seu escopo.{" "}
          <Button variant="link" asChild className="h-auto p-0 text-xs">
            <Link to="/projetos">Abrir um projeto para registrar nova lição</Link>
          </Button>
        </p>
      ) : null}
    </div>
  )
}

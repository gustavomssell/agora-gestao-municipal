import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, X } from "lucide-react"
import { api } from "@/lib/api"
import { swotLabels } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { SwotQuadrant } from "@/types"

const quadrants: { key: SwotQuadrant; hint: string; accent: string }[] = [
  { key: "FORCA", hint: "Recursos e capacidades internas que ajudam.", accent: "border-t-status-done" },
  { key: "FRAQUEZA", hint: "Limitações internas que atrapalham.", accent: "border-t-status-late" },
  { key: "OPORTUNIDADE", hint: "Fatores externos favoráveis.", accent: "border-t-status-progress" },
  { key: "AMEACA", hint: "Fatores externos que podem prejudicar.", accent: "border-t-status-warn" },
]

interface SwotTabProps {
  projectId: number
  canEdit: boolean
}

export function SwotTab({ projectId, canEdit }: SwotTabProps) {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<SwotQuadrant, string>>({
    FORCA: "",
    FRAQUEZA: "",
    OPORTUNIDADE: "",
    AMEACA: "",
  })

  const { data, isLoading } = useQuery({ queryKey: ["swot", projectId], queryFn: () => api.swot(projectId) })

  const addMutation = useMutation({
    mutationFn: ({ quadrant, description }: { quadrant: SwotQuadrant; description: string }) =>
      api.createSwot(projectId, quadrant, description),
    onSuccess: (_, variables) => {
      setDrafts((current) => ({ ...current, [variables.quadrant]: "" }))
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.deleteSwot(id),
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(error.message),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["swot", projectId] })
    queryClient.invalidateQueries({ queryKey: ["history", projectId] })
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-48 w-full" />
        ))}
      </div>
    )
  }

  const items = data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Análise SWOT do projeto · <span className="font-mono text-foreground">{items.length}</span> item(ns)
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {quadrants.map((quadrant) => {
          const quadrantItems = items.filter((item) => item.quadrant === quadrant.key)
          return (
            <section key={quadrant.key} className={cn("flex flex-col border border-t-2 border-border bg-card", quadrant.accent)}>
              <header className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-3">
                <h3 className="font-serif text-lg leading-none">{swotLabels[quadrant.key]}</h3>
                <span className="font-mono text-[0.62rem] tabular text-muted-foreground">{quadrantItems.length}</span>
              </header>
              <p className="px-4 pt-3 text-xs text-muted-foreground">{quadrant.hint}</p>
              <ul className="flex flex-1 flex-col gap-2 px-4 py-3">
                {quadrantItems.length === 0 ? (
                  <li className="py-3 text-xs italic text-muted-foreground">Nenhum item ainda.</li>
                ) : (
                  quadrantItems.map((item) => (
                    <li key={item.id} className="group flex items-start gap-2 border-b border-dashed border-border pb-2 last:border-0">
                      <span className="mt-1 size-1 shrink-0 rounded-full bg-signal" />
                      <p className="flex-1 text-sm leading-relaxed">{item.description}</p>
                      {canEdit ? (
                        <button
                          type="button"
                          aria-label="Remover item"
                          className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          onClick={() => removeMutation.mutate(item.id)}
                        >
                          <X className="size-3.5" />
                        </button>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
              {canEdit ? (
                <form
                  className="flex items-center gap-1 border-t border-border p-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const description = drafts[quadrant.key].trim()
                    if (description.length < 3) return
                    addMutation.mutate({ quadrant: quadrant.key, description })
                  }}
                >
                  <input
                    value={drafts[quadrant.key]}
                    onChange={(event) => setDrafts((current) => ({ ...current, [quadrant.key]: event.target.value }))}
                    placeholder="Adicionar item…"
                    className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <Button type="submit" size="icon-sm" variant="ghost" disabled={drafts[quadrant.key].trim().length < 3}>
                    <Plus />
                  </Button>
                </form>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}

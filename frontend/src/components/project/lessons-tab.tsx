import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { BookOpenCheck, Plus, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { lessonSchema, type LessonFormValues } from "@/lib/schemas"
import { formatDate, initials } from "@/lib/format"
import { ROLES } from "@/lib/roles"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

interface LessonsTabProps {
  projectId: number
  canEdit: boolean
}

const emptyForm: LessonFormValues = { title: "", description: "", category: "Processo" }

export function LessonsTab({ projectId, canEdit }: LessonsTabProps) {
  const queryClient = useQueryClient()
  const { me } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: emptyForm,
  })
  const errors = form.formState.errors
  const pending = form.formState.isSubmitting

  const { data, isLoading } = useQuery({
    queryKey: ["project-lessons", projectId],
    queryFn: () => api.projectLessons(projectId),
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.deleteLesson(id),
    onSuccess: () => {
      toast.success("Lição removida.")
      queryClient.invalidateQueries({ queryKey: ["project-lessons", projectId] })
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
    },
    onError: (error) => toast.error(error.message),
  })

  function openCreate() {
    form.reset(emptyForm)
    setDialogOpen(true)
  }

  async function onSubmit(values: LessonFormValues) {
    try {
      await api.createLesson(projectId, {
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category.trim(),
      })
      toast.success("Lição registrada.")
      setDialogOpen(false)
      form.reset(emptyForm)
      queryClient.invalidateQueries({ queryKey: ["project-lessons", projectId] })
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      queryClient.invalidateQueries({ queryKey: ["history", projectId] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar a lição.")
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    )
  }

  const lessons = data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Lições aprendidas do projeto · <span className="font-mono text-foreground">{lessons.length}</span> registro(s)
        </p>
        {canEdit ? (
          <Button size="sm" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            Nova lição
          </Button>
        ) : null}
      </div>

      {lessons.length === 0 ? (
        <Empty className="border border-border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenCheck />
            </EmptyMedia>
            <EmptyTitle>Nenhuma lição registrada</EmptyTitle>
            <EmptyDescription>Documente o que funcionou e o que deve mudar nos próximos projetos.</EmptyDescription>
          </EmptyHeader>
          {canEdit ? (
            <EmptyContent>
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                Registrar lição
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {lessons.map((lesson) => (
            <Card key={lesson.id} className="gap-0 py-0">
              <CardContent className="flex gap-4 p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs text-muted-foreground">
                  {initials(lesson.created_by?.name ?? "Sistema")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{lesson.title}</h3>
                    {lesson.category ? (
                      <span className="border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted-foreground">
                        {lesson.category}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{lesson.description}</p>
                  <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                    {lesson.created_by?.name ?? "—"} · {formatDate(lesson.created_at)}
                  </p>
                </div>
                {canEdit || me?.user.role === ROLES.ADMIN || lesson.created_by_id === me?.user.id ? (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remover lição"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (window.confirm("Remover esta lição?")) removeMutation.mutate(lesson.id)
                    }}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Registrar lição aprendida</DialogTitle>
              <DialogDescription>Boas práticas e pontos de melhoria ficam disponíveis para toda a prefeitura.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Field data-invalid={Boolean(errors.title)}>
                <FieldLabel htmlFor="lesson-title">Título</FieldLabel>
                <Input
                  id="lesson-title"
                  aria-invalid={Boolean(errors.title)}
                  placeholder="Ex.: Comunicação prévia com moradores reduziu retrabalho"
                  {...form.register("title")}
                />
                <FieldError errors={[errors.title]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="lesson-category">Categoria</FieldLabel>
                <Input id="lesson-category" placeholder="Processo, contratação, comunicação…" {...form.register("category")} />
              </Field>
              <Field data-invalid={Boolean(errors.description)}>
                <FieldLabel htmlFor="lesson-description">Descrição</FieldLabel>
                <Textarea
                  id="lesson-description"
                  rows={4}
                  aria-invalid={Boolean(errors.description)}
                  placeholder="O que aconteceu, por que e o que fazer diferente."
                  {...form.register("description")}
                />
                <FieldError errors={[errors.description]} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

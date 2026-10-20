import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { api } from "@/lib/api"
import { PageHeader } from "@/components/page-header"
import { ProjectForm } from "@/components/project-form"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectEditPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.project(projectId),
    enabled: Number.isFinite(projectId),
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={data ? `Editar ${data.project.code}` : "Editar projeto"}
        description="As alterações ficam registradas no histórico do projeto e são propagadas em tempo real para a equipe."
        actions={
          <Button variant="outline" asChild>
            <Link to={`/projetos/${projectId}`}>
              <ArrowLeft data-icon="inline-start" />
              Voltar ao projeto
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar o projeto. Ele pode ter sido excluído ou estar fora do seu escopo.
        </p>
      ) : !data.permissions.can_edit ? (
        <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          Seu perfil pode visualizar este projeto, mas não editá-lo. A edição é exclusiva da secretaria responsável e da administração.
        </p>
      ) : (
        <ProjectForm mode="edit" project={data.project} />
      )}
    </div>
  )
}

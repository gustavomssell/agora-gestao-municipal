import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { ProjectForm } from "@/components/project-form"
import { Button } from "@/components/ui/button"

export default function ProjectNewPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Novo projeto"
        description="Cadastre o escopo institucional, os prazos e a responsabilidade. Após criar, você poderá detalhar atividades, riscos e anexos."
        actions={
          <Button variant="outline" asChild>
            <Link to="/projetos">
              <ArrowLeft data-icon="inline-start" />
              Voltar
            </Link>
          </Button>
        }
      />
      <ProjectForm mode="create" />
    </div>
  )
}

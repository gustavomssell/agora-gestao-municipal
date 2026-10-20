import { Link } from "react-router-dom"
import { Compass } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex size-12 items-center justify-center border border-border bg-card text-muted-foreground">
        <Compass className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Erro 404</p>
        <h1 className="text-2xl font-medium">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">O endereço solicitado não existe ou foi movido.</p>
      </div>
      <Button asChild>
        <Link to="/">Voltar ao painel</Link>
      </Button>
    </div>
  )
}

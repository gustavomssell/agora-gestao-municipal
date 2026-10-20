import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { ROLES } from "@/lib/roles"
import { AppShell } from "@/components/layout/app-shell"
import LoginPage from "@/pages/login"
import DashboardPage from "@/pages/dashboard"
import ProjectsPage from "@/pages/projects"
import ProjectNewPage from "@/pages/project-new"
import ProjectDetailPage from "@/pages/project-detail"
import ProjectEditPage from "@/pages/project-edit"
import KanbanPage from "@/pages/kanban"
import GanttPage from "@/pages/gantt"
import ReportsPage from "@/pages/reports"
import LessonsPage from "@/pages/lessons"
import AdminPage from "@/pages/admin"
import ManualPage from "@/pages/manual"
import ProfilePage from "@/pages/profile"
import PublicTransparencyPage from "@/pages/public-transparency"
import PublicProjectPage from "@/pages/public-project"
import NotFoundPage from "@/pages/not-found"

function FullScreenLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Carregando a sessão…</span>
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (isLoading) return <FullScreenLoader />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { me, isLoading } = useAuth()
  if (isLoading) return <FullScreenLoader />
  if (!me || me.user.role !== ROLES.ADMIN) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/transparencia/:slug" element={<PublicTransparencyPage />} />
      <Route path="/transparencia/:slug/projetos/:id" element={<PublicProjectPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="projetos" element={<ProjectsPage />} />
        <Route path="projetos/novo" element={<ProjectNewPage />} />
        <Route path="projetos/:id" element={<ProjectDetailPage />} />
        <Route path="projetos/:id/editar" element={<ProjectEditPage />} />
        <Route path="kanban" element={<KanbanPage />} />
        <Route path="cronograma" element={<GanttPage />} />
        <Route path="relatorios" element={<ReportsPage />} />
        <Route path="licoes" element={<LessonsPage />} />
        <Route
          path="administracao"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
        <Route path="manual" element={<ManualPage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

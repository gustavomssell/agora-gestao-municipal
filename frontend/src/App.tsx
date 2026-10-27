import { lazy, Suspense } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { ROLES } from "@/lib/roles"

const AppShell = lazy(() =>
  import("@/components/layout/app-shell").then((module) => ({ default: module.AppShell })),
)
const LoginPage = lazy(() => import("@/pages/login"))
const DashboardPage = lazy(() => import("@/pages/dashboard"))
const ProjectsPage = lazy(() => import("@/pages/projects"))
const ProjectNewPage = lazy(() => import("@/pages/project-new"))
const ProjectDetailPage = lazy(() => import("@/pages/project-detail"))
const ProjectEditPage = lazy(() => import("@/pages/project-edit"))
const KanbanPage = lazy(() => import("@/pages/kanban"))
const GanttPage = lazy(() => import("@/pages/gantt"))
const ReportsPage = lazy(() => import("@/pages/reports"))
const LessonsPage = lazy(() => import("@/pages/lessons"))
const AdminPage = lazy(() => import("@/pages/admin"))
const ManualPage = lazy(() => import("@/pages/manual"))
const ProfilePage = lazy(() => import("@/pages/profile"))
const PublicTransparencyPage = lazy(() => import("@/pages/public-transparency"))
const PublicProjectPage = lazy(() => import("@/pages/public-project"))
const NotFoundPage = lazy(() => import("@/pages/not-found"))

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
  const { me, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <FullScreenLoader />
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />
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
    <Suspense fallback={<FullScreenLoader />}>
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
    </Suspense>
  )
}

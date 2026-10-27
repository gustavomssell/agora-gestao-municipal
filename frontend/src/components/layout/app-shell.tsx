import { Suspense, useEffect, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  BookOpen,
  CalendarRange,
  ChevronDown,
  Columns3,
  FileSpreadsheet,
  FolderKanban,
  Globe,
  KeyRound,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useRealtime } from "@/lib/realtime"
import { useTheme } from "@/lib/theme-context"
import { ROLES, roleLabels } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import { GlobalSearch } from "@/components/global-search"
import { NotificationBell } from "@/components/notification-bell"
import { ThemeToggle } from "@/components/theme-toggle"
import { initials } from "@/lib/format"

const primaryNav = [
  { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/kanban", label: "Quadro", icon: Columns3 },
  { to: "/cronograma", label: "Cronograma", icon: CalendarRange },
]

const secondaryNav = [
  { to: "/relatorios", label: "Relatórios", icon: FileSpreadsheet },
  { to: "/licoes", label: "Lições aprendidas", icon: Lightbulb },
]

const systemNav = [
  { to: "/administracao", label: "Administração", icon: ShieldCheck, adminOnly: true },
  { to: "/manual", label: "Manual do sistema", icon: BookOpen },
  { to: "/perfil", label: "Meu perfil", icon: UserRound },
]

const pageTitles: { match: (path: string) => boolean; title: string; section: string }[] = [
  { match: (path) => path === "/", title: "Painel", section: "Visão geral" },
  { match: (path) => path === "/projetos", title: "Projetos", section: "Portfólio" },
  { match: (path) => path === "/projetos/novo", title: "Novo projeto", section: "Portfólio" },
  { match: (path) => /^\/projetos\/\d+\/editar$/.test(path), title: "Editar projeto", section: "Portfólio" },
  { match: (path) => /^\/projetos\/\d+$/.test(path), title: "Projeto", section: "Portfólio" },
  { match: (path) => path === "/kanban", title: "Quadro", section: "Operação" },
  { match: (path) => path === "/cronograma", title: "Cronograma", section: "Planejamento" },
  { match: (path) => path === "/relatorios", title: "Relatórios", section: "Prestação de contas" },
  { match: (path) => path === "/licoes", title: "Lições aprendidas", section: "Conhecimento" },
  { match: (path) => path === "/administracao", title: "Administração", section: "Configuração" },
  { match: (path) => path === "/manual", title: "Manual do sistema", section: "Ajuda" },
  { match: (path) => path === "/perfil", title: "Meu perfil", section: "Conta" },
]

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  onNavigate,
}: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm transition-colors",
          isActive
            ? "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
            : "border-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { me } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isAdmin = me?.user.role === ROLES.ADMIN

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="grid size-10 shrink-0 place-items-center rounded-sm border border-white/25 bg-white/5 font-heading text-xl text-sidebar-primary">
          Á
        </div>
        <div className="min-w-0">
          <p className="font-heading text-xl leading-none text-sidebar-foreground">Ágora</p>
          <p className="mt-1 truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-sidebar-foreground/60">
            gestão de projetos
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto py-2">
        <div className="flex flex-col">
          <p className="px-5 pb-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-sidebar-foreground/55">Operação</p>
          {primaryNav.map((item) => (
            <NavItem key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </div>
        <div className="flex flex-col">
          <p className="px-5 pb-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-sidebar-foreground/55">Consulta</p>
          {secondaryNav.map((item) => (
            <NavItem key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </div>
        <div className="flex flex-col">
          <p className="px-5 pb-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-sidebar-foreground/55">Sistema</p>
          {systemNav
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => (
              <NavItem key={item.to} {...item} onNavigate={onNavigate} />
            ))}
          {me?.tenant.slug ? (
            <a
              href={`/transparencia/${me.tenant.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-md px-5 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Globe className="size-4" />
              Portal público
            </a>
          ) : null}
        </div>
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="truncate text-sm text-sidebar-foreground">{me?.tenant.name}</p>
        <p className="mt-0.5 text-xs text-sidebar-foreground/60">
          {me?.tenant.city}
          {me?.tenant.state ? ` · ${me.tenant.state}` : ""}
        </p>
        <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-sidebar-foreground/55">
          Ambiente de demonstração
        </p>
        <button
          type="button"
          onClick={toggleTheme}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-md border border-sidebar-border/60 px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden"
        >
          <span className="flex items-center gap-2">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            Tema
          </span>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-sidebar-foreground/55">
            {theme === "dark" ? "Escuro" : "Claro"}
          </span>
        </button>
      </div>
    </div>
  )
}

function RealtimeStatus() {
  const { status } = useRealtime()
  const label = status === "online" ? "Ao vivo" : status === "connecting" ? "Conectando" : "Offline"
  return (
    <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex" title="Atualizações em tempo real">
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "online" ? "bg-status-done" : status === "connecting" ? "bg-status-warn" : "bg-status-muted",
        )}
      />
      {label}
    </span>
  )
}

function UserMenu() {
  const { me, logout } = useAuth()
  const navigate = useNavigate()
  const [passwordOpen, setPasswordOpen] = useState(false)

  if (!me) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto gap-2 px-2 py-1.5">
            <Avatar className="size-8 rounded-sm">
              <AvatarFallback className="rounded-sm bg-primary font-mono text-xs text-primary-foreground">
                {initials(me.user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden flex-col items-start leading-tight lg:flex">
              <span className="text-sm">{me.user.name}</span>
              <span className="text-xs text-muted-foreground">{roleLabels[me.user.role]}</span>
            </span>
            <ChevronDown className="hidden size-4 text-muted-foreground lg:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block text-sm">{me.user.name}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">{me.user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/perfil")}>
            <UserRound />
            Meu perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <KeyRound />
            Alterar senha
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={async () => {
              await logout()
              navigate("/login", { replace: true })
            }}
          >
            <LogOut />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  )
}

export function AppShell() {
  const location = useLocation()
  const { me } = useAuth()
  const { setBranding } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const current = pageTitles.find((item) => item.match(location.pathname))
  const title = current?.title ?? "Ágora"
  const section = current?.section ?? "Ágora"

  const primaryColor = me?.tenant?.primary_color
  const secondaryColor = me?.tenant?.secondary_color

  useEffect(() => {
    if (!primaryColor || !secondaryColor) return
    setBranding({ primary: primaryColor, secondary: secondaryColor })
  }, [primaryColor, secondaryColor, setBranding])

  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-sidebar md:block">
        <SidebarContent />
      </aside>

      <div className="flex min-h-svh flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/80 bg-background/85 px-3 backdrop-blur sm:gap-3 sm:px-4 md:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-10 md:hidden" aria-label="Abrir navegação">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-0 bg-sidebar p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navegação</SheetTitle>
              </SheetHeader>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate whitespace-nowrap font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
              {section}
            </span>
            <span className="truncate text-sm font-medium">{title}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <GlobalSearch />
            <RealtimeStatus />
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <NotificationBell />
            <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 md:px-8">
          <Suspense
            fallback={<div className="py-16 text-center text-sm text-muted-foreground">Carregando…</div>}
          >
            <Outlet />
          </Suspense>
        </main>

        <footer className="border-t border-border/60 px-4 py-4 md:px-8">
          <p className="text-xs text-muted-foreground">
            Ágora · Gestão de projetos municipais · dados demonstrativos
          </p>
        </footer>
      </div>
    </div>
  )
}


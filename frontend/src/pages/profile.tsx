import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Building2, CalendarClock, KeyRound, LogOut, Mail, Pencil, ShieldCheck, UserRound, type LucideIcon } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { formatDateTime, initials } from "@/lib/format"
import { roleLabels } from "@/lib/roles"
import { PageHeader } from "@/components/page-header"
import { RoleBadge } from "@/components/badges"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { NotificationPreferencesCard } from "@/components/profile/notification-preferences"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm break-words">{value}</p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { me, logout } = useAuth()
  const navigate = useNavigate()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [nameOpen, setNameOpen] = useState(false)

  if (!me) return null

  const { user, tenant, permissions } = me

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Meu perfil"
        description="Seus dados de acesso e o vínculo com a prefeitura. O nome pode ser ajustado por você; e-mail e cargo são definidos pela administração."
        actions={
          <>
            <Button variant="outline" onClick={() => setPasswordOpen(true)}>
              <KeyRound data-icon="inline-start" />
              Alterar senha
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await logout()
                navigate("/login", { replace: true })
              }}
            >
              <LogOut data-icon="inline-start" />
              Sair
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar className="size-14 rounded-sm">
                <AvatarFallback className="rounded-sm bg-primary font-mono text-lg text-primary-foreground">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-medium leading-tight">{user.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="size-3.5" aria-hidden />
                  {user.email}
                </p>
              </div>
              <RoleBadge role={user.role} />
              <Button size="icon-sm" variant="ghost" aria-label="Editar nome" onClick={() => setNameOpen(true)}>
                <Pencil />
              </Button>
            </div>

            <dl className="flex flex-col divide-y divide-border border-t border-border pt-3">
              <Detail icon={UserRound} label="Perfil de acesso" value={roleLabels[user.role]} />
              <Detail icon={Building2} label="Secretaria" value={user.secretariat?.name ?? "Sem secretaria vinculada"} />
              <Detail icon={ShieldCheck} label="Cargo" value={user.cargo?.name ?? "Sem cargo informado"} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vínculo e sessão</CardTitle>
            <CardDescription>{tenant.name}{tenant.city ? ` — ${tenant.city}` : ""}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="flex flex-col divide-y divide-border">
              <Detail icon={Building2} label="Prefeitura" value={`${tenant.name}${tenant.state ? ` — ${tenant.state}` : ""}`} />
              <Detail icon={CalendarClock} label="Último acesso" value={formatDateTime(user.last_login_at)} />
            </dl>

            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="size-3.5" aria-hidden />
                Segurança da conta
              </p>
              <p className="mt-1.5">
                Use uma senha exclusiva com ao menos 6 caracteres. A troca de prefeitura exige um novo login.
              </p>
              {permissions.read_only ? (
                <p className="mt-2">Seu perfil é somente leitura e não pode alterar projetos.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <NotificationPreferencesCard />

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      {nameOpen ? (
        <EditProfileDialog
          key={user.name}
          open
          onOpenChange={setNameOpen}
          currentName={user.name}
        />
      ) : null}
    </div>
  )
}

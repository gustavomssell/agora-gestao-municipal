import { Link } from "react-router-dom"
import { Check, Minus } from "lucide-react"
import { RoleBadge } from "@/components/badges"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ROLES, ROLE_VALUES, roleLabel } from "@/lib/roles"
import type { Role } from "@/types"

const roles: { role: Role; description: string }[] = [
  {
    role: ROLES.ADMIN,
    description: "Gerencia acessos, estrutura administrativa, identidade visual e auditoria. Vê e edita todos os projetos da prefeitura.",
  },
  {
    role: ROLES.GESTOR,
    description: "Acompanha e edita os projetos da própria secretaria e os compartilhados com ela. Pode criar projetos e encaminhar.",
  },
  {
    role: ROLES.EDITOR,
    description: "Opera os projetos da própria secretaria e os compartilhados, com as mesmas permissões de cadastro do Gestor.",
  },
  {
    role: ROLES.GOVERNO,
    description: "Consulta todo o portfólio, o cronograma e os relatórios em modo somente leitura, sem ações de escrita.",
  },
]

function grant(...allowed: Role[]): Record<Role, boolean> {
  const values = {} as Record<Role, boolean>
  for (const role of ROLE_VALUES) values[role] = allowed.includes(role)
  return values
}

const matrix: { resource: string; values: Record<Role, boolean> }[] = [
  { resource: "Ver todos os projetos", values: grant(ROLES.ADMIN, ROLES.GOVERNO) },
  { resource: "Ver projetos da secretaria e compartilhados", values: grant(ROLES.ADMIN, ROLES.GESTOR, ROLES.EDITOR, ROLES.GOVERNO) },
  { resource: "Criar projeto", values: grant(ROLES.ADMIN, ROLES.GESTOR, ROLES.EDITOR) },
  { resource: "Editar projeto da secretaria", values: grant(ROLES.ADMIN, ROLES.GESTOR, ROLES.EDITOR) },
  { resource: "Editar projeto de outra secretaria", values: grant(ROLES.ADMIN) },
  { resource: "Encaminhar projeto", values: grant(ROLES.ADMIN, ROLES.GESTOR, ROLES.EDITOR) },
  { resource: "Excluir projeto", values: grant(ROLES.ADMIN) },
  { resource: "Gerenciar usuários", values: grant(ROLES.ADMIN) },
  { resource: "Gerenciar secretarias", values: grant(ROLES.ADMIN) },
  { resource: "Gerenciar cargos", values: grant(ROLES.ADMIN) },
  { resource: "Gerenciar identidade visual", values: grant(ROLES.ADMIN) },
  { resource: "Exportar relatórios", values: grant(ROLES.ADMIN, ROLES.GESTOR, ROLES.EDITOR, ROLES.GOVERNO) },
  { resource: "Consultar auditoria", values: grant(ROLES.ADMIN) },
]

function PermissionMark({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
      <Check className="size-3.5 text-status-done" aria-hidden />
      Sim
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Minus className="size-3.5" aria-hidden />
      Não
    </span>
  )
}

export function ProfilesTab() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {roles.map((item) => (
          <Card key={item.role} size="sm">
            <CardHeader>
              <CardTitle>
                <RoleBadge role={item.role} />
              </CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link to="/manual" className="text-xs text-primary hover:underline">
                Consultar no manual
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table className="min-w-[44rem]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Recurso</TableHead>
              {ROLE_VALUES.map((role) => (
                <TableHead key={role} className="w-32 text-center">
                  {roleLabel(role)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.map((row) => (
              <TableRow key={row.resource}>
                <TableCell className="text-sm">{row.resource}</TableCell>
                {ROLE_VALUES.map((role) => (
                  <TableCell key={role} className="text-center">
                    <PermissionMark allowed={row.values[role]} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        A matriz é somente leitura. Os quatro perfis são fixos nesta POC; não é possível criar perfis personalizados.
      </p>
    </div>
  )
}

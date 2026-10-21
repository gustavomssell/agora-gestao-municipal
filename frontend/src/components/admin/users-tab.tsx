import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { History, Pencil, Plus, Search, UserRound } from "lucide-react"
import { api, type UserPayload } from "@/lib/api"
import { userSchema, type UserFormValues } from "@/lib/schemas"
import { roleLabels, ROLES } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { RoleBadge } from "@/components/badges"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { User } from "@/types"

const emptyForm: UserFormValues = {
  name: "",
  email: "",
  password: "",
  role: ROLES.EDITOR,
  secretariat_id: "none",
  cargo_id: "none",
  active: true,
}

export function UsersTab() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get("search") ?? ""
  const [search, setSearch] = useState(urlSearch)
  const [role, setRole] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [permissionCodes, setPermissionCodes] = useState<string[]>([])

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: emptyForm,
  })
  const errors = form.formState.errors
  const pending = form.formState.isSubmitting

  const { data, isLoading } = useQuery({
    queryKey: ["users", search, role],
    queryFn: () => api.users({ search: search || undefined, role: role === "all" ? undefined : role }),
  })
  const secretariatsQuery = useQuery({ queryKey: ["secretariats"], queryFn: api.secretariats, staleTime: 5 * 60 * 1000 })
  const cargosQuery = useQuery({ queryKey: ["cargos"], queryFn: api.cargos, staleTime: 5 * 60 * 1000 })
  const permissionsQuery = useQuery({
    queryKey: ["permissions"],
    queryFn: api.permissions,
    staleTime: 5 * 60 * 1000,
    enabled: dialogOpen,
  })

  const toggleMutation = useMutation({
    mutationFn: (user: User) =>
      api.updateUser(user.id, {
        name: user.name,
        email: user.email,
        role: user.role,
        secretariat_id: user.secretariat_id,
        cargo_id: user.cargo_id,
        active: !user.active,
      }),
    onSuccess: () => {
      toast.success("Situação do usuário atualizada.")
      invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["users"] })
    queryClient.invalidateQueries({ queryKey: ["logs"] })
  }

  function openCreate() {
    setEditing(null)
    setPermissionCodes([])
    form.reset(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(user: User) {
    setEditing(user)
    setPermissionCodes(user.permissions ?? [])
    form.reset({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      secretariat_id: user.secretariat_id ? String(user.secretariat_id) : "none",
      cargo_id: user.cargo_id ? String(user.cargo_id) : "none",
      active: user.active,
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: UserFormValues) {
    if (!editing && values.password.length < 6) {
      form.setError("password", { message: "A senha inicial deve ter ao menos 6 caracteres." })
      return
    }
    if (editing && values.password && values.password.length < 6) {
      form.setError("password", { message: "A nova senha deve ter ao menos 6 caracteres." })
      return
    }

    const payload: UserPayload = {
      name: values.name.trim(),
      email: values.email.trim(),
      role: values.role,
      secretariat_id: values.secretariat_id === "none" ? null : Number(values.secretariat_id),
      cargo_id: values.cargo_id === "none" ? null : Number(values.cargo_id),
      active: values.active,
    }
    if (values.password) payload.password = values.password
    if (editing) payload.permissions = permissionCodes

    try {
      if (editing) {
        await api.updateUser(editing.id, payload)
        toast.success("Usuário atualizado.")
      } else {
        await api.createUser(payload)
        toast.success("Usuário criado.")
      }
      setDialogOpen(false)
      invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o usuário.")
    }
  }

  const users = data?.items ?? []
  const permissionGroups = (permissionsQuery.data?.items ?? []).reduce<Record<string, { code: string; label: string; description: string }[]>>(
    (groups, permission) => {
      groups[permission.group] = [...(groups[permission.group] ?? []), permission]
      return groups
    },
    {},
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="pl-9"
            aria-label="Buscar usuários"
          />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-44" aria-label="Filtrar por perfil">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todos os perfis</SelectItem>
              {Object.entries(roleLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Novo usuário
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Empty className="border border-border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserRound />
            </EmptyMedia>
            <EmptyTitle>Nenhum usuário encontrado</EmptyTitle>
            <EmptyDescription>Ajuste a busca ou crie um novo acesso para a equipe.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
            <Table className="min-w-[42rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Usuário</TableHead>
                <TableHead className="hidden md:table-cell">Secretaria</TableHead>
                <TableHead className="hidden xl:table-cell">Cargo</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="w-24 text-center">Ativo</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className={!user.active ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium leading-snug">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-56 truncate text-xs text-muted-foreground md:table-cell">
                    {user.secretariat ? `${user.secretariat.acronym} · ${user.secretariat.name}` : "—"}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">{user.cargo?.name ?? "—"}</TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={user.active}
                      onCheckedChange={() => toggleMutation.mutate(user)}
                      aria-label={`Ativar ou inativar ${user.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Ver histórico de ${user.name}`}
                        onClick={() => navigate(`/administracao?tab=auditoria&user=${user.id}`)}
                      >
                        <History />
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label={`Editar ${user.name}`} onClick={() => openEdit(user)}>
                        <Pencil />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:hidden">
            {users.map((user) => (
              <div key={user.id} className={cn("flex flex-col gap-3 p-4", !user.active && "opacity-60")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium leading-snug">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <RoleBadge role={user.role} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    {user.secretariat?.acronym ?? "Sem secretaria"} · {user.cargo?.name ?? "Sem cargo"}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={user.active}
                      onCheckedChange={() => toggleMutation.mutate(user)}
                      aria-label={`Ativar ou inativar ${user.name}`}
                    />
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Ver histórico de ${user.name}`}
                      onClick={() => navigate(`/administracao?tab=auditoria&user=${user.id}`)}
                    >
                      <History />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Editar ${user.name}`} onClick={() => openEdit(user)}>
                      <Pencil />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Deixe a senha em branco para manter a atual."
                  : "O usuário acessa com a prefeitura, e-mail e senha informados."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="user-name">Nome completo</FieldLabel>
                <Input id="user-name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="user-email">E-mail</FieldLabel>
                <Input id="user-email" type="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={Boolean(errors.password)}>
                <FieldLabel htmlFor="user-password">{editing ? "Nova senha (opcional)" : "Senha inicial"}</FieldLabel>
                <Input
                  id="user-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.password)}
                  {...form.register("password")}
                />
                <FieldError errors={[errors.password]} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Perfil de acesso</FieldLabel>
                  <Controller
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {Object.entries(roleLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel>Secretaria</FieldLabel>
                  <Controller
                    control={form.control}
                    name="secretariat_id"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">Sem vínculo</SelectItem>
                            {secretariatsQuery.data?.items.map((secretariat) => (
                              <SelectItem key={secretariat.id} value={String(secretariat.id)}>
                                {secretariat.acronym} · {secretariat.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>Cargo</FieldLabel>
                <Controller
                  control={form.control}
                  name="cargo_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">Sem cargo</SelectItem>
                          {cargosQuery.data?.items.map((cargo) => (
                            <SelectItem key={cargo.id} value={String(cargo.id)}>
                              {cargo.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldDescription>Administradores veem todas as secretarias. Gestores, editores e governo ficam restritos ao vínculo.</FieldDescription>
              </Field>
              <Field orientation="horizontal" className="justify-between border border-border bg-background/50 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <FieldLabel htmlFor="user-active">Acesso ativo</FieldLabel>
                  <FieldDescription>Usuários inativos não conseguem autenticar.</FieldDescription>
                </div>
                <Controller
                  control={form.control}
                  name="active"
                  render={({ field }) => <Switch id="user-active" checked={field.value} onCheckedChange={field.onChange} />}
                />
              </Field>
              {editing ? (
                <div className="flex flex-col gap-3 border border-border bg-background/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Permissões granulares</p>
                    <p className="text-xs text-muted-foreground">
                      Ajuste o que este usuário pode fazer além do perfil {roleLabels[editing.role]}.
                    </p>
                  </div>
                  <div className="flex max-h-56 flex-col gap-3 overflow-y-auto pr-1">
                    {Object.entries(permissionGroups).map(([group, items]) => (
                      <div key={group} className="flex flex-col gap-1.5">
                        <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">{group}</p>
                        {items.map((permission) => (
                          <label key={permission.code} className="flex items-start gap-2 text-sm">
                            <Checkbox
                              className="mt-0.5"
                              checked={permissionCodes.includes(permission.code)}
                              onCheckedChange={(value) =>
                                setPermissionCodes((current) =>
                                  value
                                    ? Array.from(new Set([...current, permission.code]))
                                    : current.filter((code) => code !== permission.code),
                                )
                              }
                            />
                            <span className="min-w-0">
                              <span className="block leading-tight">{permission.label}</span>
                              <span className="block text-xs text-muted-foreground">{permission.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {editing ? "Salvar" : "Criar usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

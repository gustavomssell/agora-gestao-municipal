import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { ArrowRight, LockKeyhole, Mail } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme-context"
import { loginSchema, type LoginFormValues } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
  const { me, login } = useAuth()
  const { setBranding } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? "/"

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenant: "guapimirim",
      email: "",
      password: "",
    },
  })
  const errors = form.formState.errors
  const tenant = form.watch("tenant")

  const tenantsQuery = useQuery({ queryKey: ["public-tenants"], queryFn: api.publicTenants, staleTime: 5 * 60 * 1000 })
  const selectedTenant = tenantsQuery.data?.items.find((item) => item.slug === tenant)


  useEffect(() => {
    if (!selectedTenant) return
    setBranding({ primary: selectedTenant.primary_color, secondary: selectedTenant.secondary_color })
  }, [selectedTenant, setBranding])

  useEffect(() => {
    if (tenantsQuery.data?.items.length && !tenantsQuery.data.items.some((item) => item.slug === tenant)) {
      form.setValue("tenant", tenantsQuery.data.items[0].slug)
    }
  }, [tenantsQuery.data, tenant, form])

  if (me) return <Navigate to={from} replace />

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values)
      toast.success("Acesso liberado.")
      navigate(from, { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.")
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <div className="fixed right-3 top-3 z-20">
        <ThemeToggle />
      </div>
      <section className="page-grid relative hidden flex-col justify-between overflow-hidden bg-sidebar px-12 py-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-sm border border-white/25 bg-white/5 font-heading text-2xl text-sidebar-primary">
            Á
          </div>
          <div>
            <p className="font-heading text-2xl leading-none">Ágora</p>
            <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white/60">gestão de projetos</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <h1 className="font-heading text-5xl font-normal leading-[1.05] text-white">
            O estado do município,
            <br />
            projeto a projeto.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-white/70">
            Um só lugar para acompanhar prazos, orçamento, riscos e encaminhamentos entre secretarias — com histórico
            auditável de cada decisão.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/15 pt-6">
            <div>
              <p className="font-heading text-3xl text-white">07</p>
              <p className="mt-1 text-xs text-white/65">situações de projeto</p>
            </div>
            <div>
              <p className="font-heading text-3xl text-white">04</p>
              <p className="mt-1 text-xs text-white/65">perfis de acesso</p>
            </div>
            <div>
              <p className="font-heading text-3xl text-white">100%</p>
              <p className="mt-1 text-xs text-white/65">das ações auditadas</p>
            </div>
          </div>
        </div>

        <p className="max-w-md text-xs leading-relaxed text-white/55">
          Ambiente de demonstração com duas prefeituras, secretarias, usuários e portfólio fictícios. Nenhum dado real
          de município é utilizado.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-sm bg-primary font-heading text-xl text-primary-foreground">
                Á
              </div>
              <div>
                <p className="font-heading text-xl leading-none">Ágora</p>
                <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                  gestão de projetos
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-medium">Entrar no painel</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecione sua prefeitura e use as credenciais fornecidas pela administração.
          </p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8">
            <FieldGroup className="gap-5">
              <Field data-invalid={Boolean(errors.tenant)}>
                <FieldLabel htmlFor="tenant">Prefeitura</FieldLabel>
                <Controller
                  control={form.control}
                  name="tenant"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="tenant" className="w-full">
                        <SelectValue placeholder="Selecione a prefeitura" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {tenantsQuery.data?.items.map((item) => (
                            <SelectItem key={item.slug} value={item.slug}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldDescription>
                  {tenantsQuery.data?.items.find((item) => item.slug === tenant)?.city ?? "Cada prefeitura tem dados isolados."}
                </FieldDescription>
              </Field>

              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="email">E-mail institucional</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <Mail />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="email"
                    type="email"
                    autoComplete="username"
                    aria-invalid={Boolean(errors.email)}
                    {...form.register("email")}
                  />
                </InputGroup>
                <FieldError errors={[errors.email]} />
              </Field>

              <Field data-invalid={Boolean(errors.password)}>
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <LockKeyhole />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                    {...form.register("password")}
                  />
                </InputGroup>
                <FieldError errors={[errors.password]} />
              </Field>

              <Button type="submit" size="lg" className="mt-1 w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Entrando…" : "Entrar no painel"}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </FieldGroup>
          </form>
        </div>
      </section>
    </div>
  )
}


import { useEffect, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { Palette, RotateCcw } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme-context"
import { foregroundFor, normalizeHex } from "@/lib/color"
import { brandingSchema, type BrandingFormValues } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const fallback = { primary_color: "#123b33", secondary_color: "#c8a34a" }

export function BrandingTab() {
  const { me } = useAuth()
  const { setBranding } = useTheme()
  const queryClient = useQueryClient()
  const tenant = me?.tenant
  const savedBranding = useRef(tenant)

  useEffect(() => {
    savedBranding.current = tenant
  }, [tenant])

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: fallback,
  })
  const errors = form.formState.errors
  const primary = useWatch({ control: form.control, name: "primary_color" })
  const secondary = useWatch({ control: form.control, name: "secondary_color" })

  useEffect(() => {
    if (!tenant) return
    if (form.formState.isDirty) return
    form.reset({ primary_color: tenant.primary_color, secondary_color: tenant.secondary_color })
  }, [tenant, form])

  useEffect(() => {
    setBranding({ primary, secondary })
  }, [primary, secondary, setBranding])

  useEffect(() => {
    return () => {
      const current = savedBranding.current
      if (current) setBranding({ primary: current.primary_color, secondary: current.secondary_color })
    }
  }, [setBranding])

  const mutation = useMutation({
    mutationFn: (values: BrandingFormValues) => api.updateBranding(values),
    onSuccess: (data) => {
      toast.success("Identidade visual atualizada.")
      form.reset({ primary_color: data.tenant.primary_color, secondary_color: data.tenant.secondary_color })
      queryClient.setQueryData(["me"], (current: typeof me) => (current ? { ...current, tenant: data.tenant } : current))
      queryClient.invalidateQueries({ queryKey: ["me"] })
      queryClient.invalidateQueries({ queryKey: ["public-tenants"] })
    },
    onError: (error) => toast.error(error.message),
  })

  const primarySwatch = normalizeHex(primary) ?? fallback.primary_color
  const secondarySwatch = normalizeHex(secondary) ?? fallback.secondary_color

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="size-4 text-muted-foreground" />
            Identidade visual
          </CardTitle>
          <CardDescription>
            As cores valem para toda a prefeitura: menu, botões, destaques e gráficos. Cada município mantém a própria
            identidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.primary_color)}>
                <FieldLabel htmlFor="branding-primary">Cor primária</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    id="branding-primary"
                    type="color"
                    value={primarySwatch}
                    onChange={(event) => form.setValue("primary_color", event.target.value, { shouldValidate: true })}
                    className="size-10 cursor-pointer rounded-sm border border-border bg-background p-0.5"
                    aria-label="Selecionar cor primária"
                  />
                  <Input className="font-mono text-xs uppercase" aria-invalid={Boolean(errors.primary_color)} {...form.register("primary_color")} />
                </div>
                <FieldError errors={[errors.primary_color]} />
              </Field>
              <Field data-invalid={Boolean(errors.secondary_color)}>
                <FieldLabel htmlFor="branding-secondary">Cor secundária</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    id="branding-secondary"
                    type="color"
                    value={secondarySwatch}
                    onChange={(event) => form.setValue("secondary_color", event.target.value, { shouldValidate: true })}
                    className="size-10 cursor-pointer rounded-sm border border-border bg-background p-0.5"
                    aria-label="Selecionar cor secundária"
                  />
                  <Input
                    className="font-mono text-xs uppercase"
                    aria-invalid={Boolean(errors.secondary_color)}
                    {...form.register("secondary_color")}
                  />
                </div>
                <FieldError errors={[errors.secondary_color]} />
              </Field>
            </div>

            <FieldDescription>
              A cor primária conduz o menu e as ações principais; a secundária marca destaques, selos e destaques do
              painel.
            </FieldDescription>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={mutation.isPending || !form.formState.isDirty}>
                {mutation.isPending ? "Salvando…" : "Salvar identidade"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending || !form.formState.isDirty}
                onClick={() => {
                  if (!tenant) return
                  form.reset({ primary_color: tenant.primary_color, secondary_color: tenant.secondary_color })
                }}
              >
                <RotateCcw data-icon="inline-start" />
                Restaurar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Prévia</CardTitle>
          <CardDescription>{tenant?.name ?? "Prefeitura"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <div
              className="flex items-center gap-2 px-3 py-2.5"
              style={{ backgroundColor: primarySwatch, color: foregroundFor(primarySwatch) }}
            >
              <span className="grid size-6 place-items-center rounded-sm bg-white/15 font-heading text-sm">Á</span>
              <span className="font-heading text-sm">{tenant?.city ?? "Ágora"}</span>
            </div>
            <div className="flex flex-col gap-3 bg-background p-3">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-sm px-3 py-1.5 text-xs font-medium"
                  style={{ backgroundColor: primarySwatch, color: foregroundFor(primarySwatch) }}
                >
                  Ação principal
                </span>
                <span
                  className="rounded-sm border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: secondarySwatch, color: secondarySwatch }}
                >
                  Ação secundária
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.12em]"
                  style={{ backgroundColor: secondarySwatch, color: foregroundFor(secondarySwatch) }}
                >
                  Destaque
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: primarySwatch }} />
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            A prévia é aplicada ao painel em tempo real. Salve para registrar a alteração na auditoria e replicar aos
            demais usuários.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


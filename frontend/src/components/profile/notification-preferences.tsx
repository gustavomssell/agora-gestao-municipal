import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Mail, MessageCircle, Phone } from "lucide-react"
import { api } from "@/lib/api"
import type { NotificationPreferences } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"

export function NotificationPreferencesCard() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: api.notificationPreferences,
  })
  const [phone, setPhone] = useState<string | null>(null)
  const [notifyEmail, setNotifyEmail] = useState<boolean | null>(null)
  const [notifyWhatsApp, setNotifyWhatsApp] = useState<boolean | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: NotificationPreferences) => api.updateNotificationPreferences(payload),
    onSuccess: () => {
      toast.success("Preferências atualizadas.")
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] })
      queryClient.invalidateQueries({ queryKey: ["me"] })
    },
    onError: (error) => toast.error(error.message),
  })

  if (isLoading) return <Skeleton className="h-56 w-full" />
  if (!data) return null

  const phoneValue = phone ?? data.phone
  const emailValue = notifyEmail ?? data.notify_email
  const whatsappValue = notifyWhatsApp ?? data.notify_whatsapp

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="size-4 text-muted-foreground" />
          Notificações externas
        </CardTitle>
        <CardDescription>
          Escolha também receber avisos por e-mail ou WhatsApp, além das notificações no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="preference-phone">Telefone (WhatsApp)</FieldLabel>
          <Input
            id="preference-phone"
            value={phoneValue}
            placeholder="+55 21 99999-0000"
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>
        <label className="flex items-center justify-between gap-3 border border-border bg-background/50 px-4 py-3">
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Mail className="size-3.5" />
              E-mail
            </span>
            <FieldDescription>
              {data.email_configured ? "Servidor de e-mail configurado." : "SMTP não configurado neste ambiente."}
            </FieldDescription>
          </span>
          <Switch checked={emailValue} onCheckedChange={setNotifyEmail} />
        </label>
        <label className="flex items-center justify-between gap-3 border border-border bg-background/50 px-4 py-3">
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Phone className="size-3.5" />
              WhatsApp
            </span>
            <FieldDescription>
              {data.whatsapp_configured ? "Webhook de WhatsApp configurado." : "Webhook de WhatsApp não configurado."}
            </FieldDescription>
          </span>
          <Switch checked={whatsappValue} onCheckedChange={setNotifyWhatsApp} />
        </label>
        <Button
          className="w-fit"
          onClick={() =>
            mutation.mutate({
              phone: phoneValue,
              notify_email: emailValue,
              notify_whatsapp: whatsappValue,
            })
          }
          disabled={mutation.isPending}
        >
          Salvar preferências
        </Button>
      </CardContent>
    </Card>
  )
}

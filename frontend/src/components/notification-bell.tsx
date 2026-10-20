import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, CheckCheck } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/lib/api"
import { fromNow } from "@/lib/format"
import { cn } from "@/lib/utils"

export function NotificationBell() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
      }
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [queryClient])

  const unread = data?.unread_count ?? 0

  async function open(notificationId: number, link: string, read: boolean) {
    try {
      if (!read) await api.markNotificationRead(notificationId)
      if (link) navigate(link)
    } catch {
      toast.error("Não foi possível abrir a notificação.")
    }
  }

  async function markAll() {
    try {
      await api.markAllNotificationsRead()
      toast.success("Notificações marcadas como lidas.")
    } catch {
      toast.error("Não foi possível atualizar as notificações.")
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}>
          <Bell />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 font-mono text-[0.55rem] leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Notificações</p>
            <p className="text-xs text-muted-foreground">{unread > 0 ? `${unread} não lida(s)` : "Tudo em dia"}</p>
          </div>
          {unread > 0 ? (
            <Button variant="ghost" size="sm" onClick={markAll} className="text-xs">
              <CheckCheck data-icon="inline-start" />
              Marcar lidas
            </Button>
          ) : null}
        </div>
        <ScrollArea className="h-80">
          {data?.items.length ? (
            <ul className="flex flex-col">
              {data.items.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => open(notification.id, notification.link, Boolean(notification.read_at))}
                    className={cn(
                      "flex w-full flex-col gap-1 border-b border-border/60 px-4 py-3 text-left transition hover:bg-muted/60",
                      !notification.read_at && "border-l-2 border-l-signal bg-signal/5",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium leading-tight">{notification.title}</span>
                      <span className="shrink-0 font-mono text-[0.62rem] text-muted-foreground">{fromNow(notification.created_at)}</span>
                    </span>
                    <span className="text-xs leading-relaxed text-muted-foreground">{notification.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
              <Bell className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground">Você será avisado sobre prazos, status e encaminhamentos.</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

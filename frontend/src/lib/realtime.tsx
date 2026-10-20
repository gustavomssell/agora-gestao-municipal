import { useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { WS_URL } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { Notification, RealtimeEvent } from "@/types"

type RealtimeStatus = "connecting" | "online" | "offline"

const RealtimeContext = createContext<{ status: RealtimeStatus }>({ status: "offline" })

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token, me } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<RealtimeStatus>("offline")
  const reconnectAttempt = useRef(0)
  const connectedBefore = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus("offline")
      return
    }

    let socket: WebSocket | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const invalidate = (keys: string[]) => {
      for (const key of keys) queryClient.invalidateQueries({ queryKey: [key] })
    }

    const connect = () => {
      if (disposed) return
      setStatus("connecting")
      socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`)

      socket.onopen = () => {
        reconnectAttempt.current = 0
        setStatus("online")
        if (connectedBefore.current) {
          queryClient.invalidateQueries()
        }
        connectedBefore.current = true
      }

      socket.onmessage = (event) => {
        let data: RealtimeEvent
        try {
          data = JSON.parse(event.data) as RealtimeEvent
        } catch {
          return
        }
        switch (data.type) {
          case "project.changed":
            invalidate([
              "projects",
              "project",
              "dashboard",
              "kanban",
              "gantt",
              "history",
              "lessons",
              "project-lessons",
              "activities",
              "risks",
              "actions",
              "swot",
              "attachments",
            ])
            break
          case "settings.changed":
            invalidate(["secretariats", "cargos", "users", "logs", "me"])
            break
          case "notification.created": {
            invalidate(["notifications"])
            const notification = data.payload as Notification | undefined
            if (!data.user_id || data.user_id === me?.user.id) {
              toast(notification?.title ?? "Nova notificação", {
                description: notification?.message,
              })
            }
            break
          }
          case "notification.read":
            invalidate(["notifications"])
            break
        }
      }

      socket.onclose = () => {
        if (disposed) return
        setStatus("offline")
        const delay = Math.min(30000, 1000 * 2 ** reconnectAttempt.current)
        reconnectAttempt.current += 1
        timeout = setTimeout(connect, delay)
      }

      socket.onerror = () => socket?.close()
    }

    connect()

    return () => {
      disposed = true
      if (timeout) clearTimeout(timeout)
      socket?.close()
    }
  }, [token, me?.user.id, queryClient])

  return <RealtimeContext.Provider value={{ status }}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  return useContext(RealtimeContext)
}

import { useQueryClient } from "@tanstack/react-query"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import { useQuery } from "@tanstack/react-query"
import { api, clearCSRFToken, setCSRFToken, type LoginPayload } from "@/lib/api"
import type { MeResponse } from "@/types"

interface AuthContextValue {
  me: MeResponse | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<MeResponse>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const logoutInFlight = useRef(false)

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!meQuery.data) return
    api
      .csrf()
      .then((response) => setCSRFToken(response.csrf_token))
      .catch(() => {})
  }, [meQuery.data])

  const logout = useCallback(async () => {
    if (logoutInFlight.current) return
    logoutInFlight.current = true
    await api.logout().catch(() => undefined)
    clearCSRFToken()
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" })
    queryClient.setQueryData(["me"], null)
    logoutInFlight.current = false
  }, [queryClient])

  useEffect(() => {
    const handler = () => {
      if (meQuery.data) void logout()
    }
    window.addEventListener("agora:unauthorized", handler)
    return () => window.removeEventListener("agora:unauthorized", handler)
  }, [logout, meQuery.data])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await api.login(payload)
      setCSRFToken(response.csrf_token)
      const me = await api.me()
      queryClient.setQueryData(["me"], me)
      return me
    },
    [queryClient],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      me: meQuery.data ?? null,
      isLoading: meQuery.isLoading,
      login,
      logout,
    }),
    [meQuery.data, meQuery.isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return context
}

export function useCurrentUser() {
  const { me } = useAuth()
  return me?.user ?? null
}

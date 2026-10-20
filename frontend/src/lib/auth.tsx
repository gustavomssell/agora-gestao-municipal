import { useQueryClient } from "@tanstack/react-query"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useQuery } from "@tanstack/react-query"
import { api, clearToken, getToken, setToken, type LoginPayload } from "@/lib/api"
import type { MeResponse } from "@/types"

interface AuthContextValue {
  token: string | null
  me: MeResponse | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<MeResponse>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setTokenState] = useState<string | null>(() => getToken())

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    const handler = () => logout()
    window.addEventListener("agora:unauthorized", handler)
    return () => window.removeEventListener("agora:unauthorized", handler)
  }, [logout])

  useEffect(() => {
    if (meQuery.isError && token) logout()
  }, [meQuery.isError, token, logout])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await api.login(payload)
      setToken(response.token)
      setTokenState(response.token)
      const me = await queryClient.fetchQuery({ queryKey: ["me"], queryFn: api.me })
      return me
    },
    [queryClient],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      me: meQuery.data ?? null,
      isLoading: Boolean(token) && meQuery.isLoading,
      login,
      logout,
    }),
    [token, meQuery.data, meQuery.isLoading, login, logout],
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

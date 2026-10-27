import type {
  Action5W2H,
  ActivitiesResponse,
  Activity,
  ActivityDependency,
  Attachment,
  AuditLog,
  BudgetLine,
  Cargo,
  Commitment,
  Contract,
  Dashboard,
  DeadlineChange,
  FinanceResponse,
  KanbanColumn,
  Lesson,
  LoginResponse,
  MeResponse,
  Milestone,
  Notification,
  NotificationPreferences,
  Paged,
  Payment,
  PermissionInfo,
  Project,
  ProjectApproval,
  ProjectDetailResponse,
  ProjectDocument,
  ProjectHistory,
  ProjectIndicator,
  ProjectTemplate,
  ProjectTransfer,
  PublicProjectDetail,
  PublicTransparency,
  ReportSchedule,
  ReportSummary,
  Risk,
  SavedReport,
  SearchResponse,
  Secretariat,
  Stakeholder,
  Supplier,
  SwotItem,
  SwotQuadrant,
  Tenant,
  User,
} from "@/types"

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8090/api"
const ABSOLUTE_API_URL = new URL(API_URL, window.location.origin).toString().replace(/\/$/, "")
export const WS_URL = ABSOLUTE_API_URL.replace(/^http/, "ws").replace(/\/api$/, "") + "/api/ws"
const CSRF_KEY = "agora.csrf"

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export function getCSRFToken(): string | null {
  return sessionStorage.getItem(CSRF_KEY)
}

export function setCSRFToken(token: string) {
  sessionStorage.setItem(CSRF_KEY, token)
}

export function clearCSRFToken() {
  sessionStorage.removeItem(CSRF_KEY)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase()
  const mutating = method !== "GET" && method !== "HEAD" && method !== "OPTIONS"
  const csrfToken = mutating ? getCSRFToken() : null
  const headers: HeadersInit = {
    ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    ...init.headers,
  }
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, credentials: "include", headers })
  } catch {
    throw new ApiError("Não foi possível falar com o servidor. Verifique a conexão.", 0)
  }
  if (response.status === 401 && path !== "/auth/login" && path !== "/auth/me") {
    window.dispatchEvent(new CustomEvent("agora:unauthorized"))
  }
  if (!response.ok) {
    let message = "Não foi possível concluir a operação."
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      if (response.status === 413) message = "O arquivo excede o limite de 10 MB."
    }
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const out = search.toString()
  return out ? `?${out}` : ""
}

export interface LoginPayload {
  tenant: string
  email: string
  password: string
}

export interface ProjectPayload {
  name: string
  justification: string
  objectives: string
  requirements: string
  risk_assessment: string
  government_plan: boolean
  government_plan_detail: string
  priority: string
  responsible_secretariat_id: number
  secretariat_ids: number[]
  planned_start: string | null
  planned_end: string | null
  budget_planned: number
  budget_executed: number
  ppa?: string
  ldo?: string
  loa?: string
  baseline_start?: string | null
  baseline_end?: string | null
  baseline_budget?: number
  template_id?: number | null
  deadline_justification?: string
}

export interface SupplierPayload {
  name: string
  document: string
  category: string
  email: string
  phone: string
  active?: boolean
}

export interface BudgetLinePayload {
  code: string
  description: string
  source: string
  planned: number
}

export interface CommitmentPayload {
  budget_line_id: number | null
  supplier_id: number | null
  number: string
  description: string
  amount: number
  status: string
  issued_at: string | null
}

export interface PaymentPayload {
  amount: number
  paid_at: string | null
  note: string
}

export interface ContractPayload {
  commitment_id: number | null
  supplier_id: number | null
  parent_id: number | null
  number: string
  object: string
  value: number
  status: string
  start_date: string | null
  end_date: string | null
  signed_at: string | null
}

export interface DocumentPayload {
  name: string
  category: string
  required: boolean
  status: string
  attachment_id: number | null
  note: string
}

export interface StakeholderPayload {
  name: string
  kind: string
  organization: string
  email: string
  phone: string
  role: string
  influence: number
  interest: number
  notes: string
}

export interface MilestonePayload {
  name: string
  description: string
  due_date: string | null
  status: string
}

export interface IndicatorPayload {
  name: string
  unit: string
  target: number
  current: number
  notes: string
}

export interface TemplatePayload {
  name: string
  description: string
  priority: string
  duration_days: number
  activities: { title: string; description?: string; duration_days?: number }[]
  active?: boolean
}

export interface SavedReportPayload {
  name: string
  filters: Record<string, unknown>
}

export interface SchedulePayload extends SavedReportPayload {
  frequency: string
  active?: boolean
}

export interface ActivityPayload {
  title: string
  description: string
  planned_start: string | null
  planned_end: string | null
  action?: "start" | "complete" | "reopen"
  status?: string
  deadline_justification?: string
}

export interface RiskPayload {
  description: string
  category: string
  gravity: number
  urgency: number
  tendency: number
  status?: string
  response?: string
  owner?: string
}

export interface ActionPayload {
  risk_id?: number | null
  what: string
  why: string
  where: string
  when: string
  who: string
  how: string
  how_much: string
  status?: string
}

export interface LessonPayload {
  title: string
  description: string
  category: string
}

export interface UserPayload {
  name: string
  email: string
  password?: string
  role: string
  secretariat_id: number | null
  cargo_id: number | null
  active?: boolean
  permissions?: string[]
}

export const api = {
  publicTenants: () => request<{ items: Tenant[] }>("/public/tenants"),
  publicTransparency: (
    slug: string,
    params: { status?: string; secretariat_id?: number; search?: string } = {},
  ) => request<PublicTransparency>(`/public/${slug}/transparency${query(params)}`),
  publicProject: (slug: string, id: number) =>
    request<PublicProjectDetail>(`/public/${slug}/transparency/projects/${id}`),

  login: (payload: LoginPayload) =>
    request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  csrf: () => request<{ csrf_token: string }>("/auth/csrf"),
  me: () => request<MeResponse>("/auth/me"),
  notificationPreferences: () => request<NotificationPreferences>("/auth/notification-preferences"),
  updateNotificationPreferences: (payload: NotificationPreferences) =>
    request<NotificationPreferences>("/auth/notification-preferences", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateProfile: (name: string) =>
    request<{ user: User }>("/auth/profile", { method: "PUT", body: JSON.stringify({ name }) }),
  changePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),

  updateBranding: (payload: { primary_color: string; secondary_color: string }) =>
    request<{ tenant: Tenant }>("/settings/branding", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  dashboard: (params: { period?: string; secretariat_id?: number; mine?: boolean } = {}) =>
    request<Dashboard>(`/dashboard${query(params)}`),
  search: (q: string) => request<SearchResponse>(`/search${query({ q })}`),

  suppliers: () => request<{ items: Supplier[] }>("/suppliers"),
  createSupplier: (payload: SupplierPayload) =>
    request<{ supplier: Supplier }>("/suppliers", { method: "POST", body: JSON.stringify(payload) }),
  updateSupplier: (id: number, payload: SupplierPayload) =>
    request<{ supplier: Supplier }>(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  templates: () => request<{ items: ProjectTemplate[] }>("/templates"),
  createTemplate: (payload: TemplatePayload) =>
    request<{ template: ProjectTemplate }>("/templates", { method: "POST", body: JSON.stringify(payload) }),
  updateTemplate: (id: number, payload: TemplatePayload) =>
    request<{ template: ProjectTemplate }>(`/templates/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteTemplate: (id: number) => request<{ message: string }>(`/templates/${id}`, { method: "DELETE" }),
  reportSummary: (
    params: {
      search?: string
      status?: string
      priority?: string
      secretariat_id?: number
      overdue?: boolean
      include_canceled?: boolean
      from?: string
      to?: string
    } = {},
  ) => request<ReportSummary>(`/reports/summary${query(params)}`),
  savedReports: () => request<{ reports: SavedReport[]; schedules: ReportSchedule[] }>("/reports/saved"),
  createSavedReport: (payload: SavedReportPayload) =>
    request<SavedReport>("/reports/saved", { method: "POST", body: JSON.stringify(payload) }),
  deleteSavedReport: (id: number) => request<{ message: string }>(`/reports/saved/${id}`, { method: "DELETE" }),
  createSchedule: (payload: SchedulePayload) =>
    request<ReportSchedule>("/reports/schedules", { method: "POST", body: JSON.stringify(payload) }),
  updateSchedule: (id: number, payload: SchedulePayload) =>
    request<ReportSchedule>(`/reports/schedules/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSchedule: (id: number) => request<{ message: string }>(`/reports/schedules/${id}`, { method: "DELETE" }),

  permissions: () => request<{ items: PermissionInfo[] }>("/permissions"),

  projects: (
    params: {
      search?: string
      status?: string
      priority?: string
      secretariat_id?: number
      overdue?: boolean
      include_canceled?: boolean
      from?: string
      to?: string
      page?: number
      page_size?: number
      sort?: string
    } = {},
  ) => request<Paged<Project>>(`/projects${query(params)}`),
  project: (id: number) => request<ProjectDetailResponse>(`/projects/${id}`),
  createProject: (payload: ProjectPayload) =>
    request<{ project: Project }>("/projects", { method: "POST", body: JSON.stringify(payload) }),
  updateProject: (id: number, payload: ProjectPayload) =>
    request<{ project: Project }>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteProject: (id: number) => request<{ message: string }>(`/projects/${id}`, { method: "DELETE" }),
  changeStatus: (id: number, status: string, note: string) =>
    request<{ message: string }>(`/projects/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    }),
  transferProject: (id: number, to_secretariat_id: number, note: string) =>
    request<{ message: string }>(`/projects/${id}/transfer`, {
      method: "POST",
      body: JSON.stringify({ to_secretariat_id, note }),
    }),
  projectHistory: (id: number, logLimit = 200) =>
    request<ProjectHistory>(`/projects/${id}/history${query({ log_limit: logLimit })}`),
  kanban: (params: { search?: string; secretariat_id?: number; priority?: string } = {}) =>
    request<{ columns: KanbanColumn[] }>(`/projects/kanban${query(params)}`),
  gantt: (params: { secretariat_id?: number } = {}) => request<Paged<Project>>(`/projects/gantt${query(params)}`),

  approvals: (projectId: number) =>
    request<{ items: ProjectApproval[]; can_decide: boolean }>(`/projects/${projectId}/approvals`),
  decideApproval: (id: number, payload: { status: string; comment: string; signature: string }) =>
    request<{ approval: ProjectApproval }>(`/approvals/${id}/decide`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resetApproval: (id: number) =>
    request<{ message: string }>(`/approvals/${id}/reset`, { method: "POST" }),

  finance: (projectId: number) => request<FinanceResponse>(`/projects/${projectId}/finance`),
  createBudgetLine: (projectId: number, payload: BudgetLinePayload) =>
    request<{ budget_line: BudgetLine }>(`/projects/${projectId}/budget-lines`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateBudgetLine: (id: number, payload: BudgetLinePayload) =>
    request<{ budget_line: BudgetLine }>(`/budget-lines/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteBudgetLine: (id: number) => request<{ message: string }>(`/budget-lines/${id}`, { method: "DELETE" }),
  createCommitment: (projectId: number, payload: CommitmentPayload) =>
    request<{ commitment: Commitment }>(`/projects/${projectId}/commitments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCommitment: (id: number, payload: CommitmentPayload) =>
    request<{ commitment: Commitment }>(`/commitments/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCommitment: (id: number) => request<{ message: string }>(`/commitments/${id}`, { method: "DELETE" }),
  createPayment: (commitmentId: number, payload: PaymentPayload) =>
    request<{ payment: Payment }>(`/commitments/${commitmentId}/payments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deletePayment: (id: number) => request<{ message: string }>(`/payments/${id}`, { method: "DELETE" }),
  createContract: (projectId: number, payload: ContractPayload) =>
    request<{ contract: Contract }>(`/projects/${projectId}/contracts`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateContract: (id: number, payload: ContractPayload) =>
    request<{ contract: Contract }>(`/contracts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteContract: (id: number) => request<{ message: string }>(`/contracts/${id}`, { method: "DELETE" }),

  documents: (projectId: number) =>
    request<{ items: ProjectDocument[]; can_edit: boolean }>(`/projects/${projectId}/documents`),
  createDocument: (projectId: number, payload: DocumentPayload) =>
    request<{ document: ProjectDocument }>(`/projects/${projectId}/documents`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateDocument: (id: number, payload: DocumentPayload) =>
    request<{ document: ProjectDocument }>(`/documents/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteDocument: (id: number) => request<{ message: string }>(`/documents/${id}`, { method: "DELETE" }),

  dependencies: (projectId: number) =>
    request<{ items: ActivityDependency[]; can_edit: boolean }>(`/projects/${projectId}/dependencies`),
  createDependency: (projectId: number, payload: { predecessor_id: number; successor_id: number }) =>
    request<{ dependency: ActivityDependency }>(`/projects/${projectId}/dependencies`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteDependency: (id: number) => request<{ message: string }>(`/dependencies/${id}`, { method: "DELETE" }),

  milestones: (projectId: number) =>
    request<{ items: Milestone[]; can_edit: boolean }>(`/projects/${projectId}/milestones`),
  createMilestone: (projectId: number, payload: MilestonePayload) =>
    request<{ milestone: Milestone }>(`/projects/${projectId}/milestones`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateMilestone: (id: number, payload: MilestonePayload) =>
    request<{ milestone: Milestone }>(`/milestones/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteMilestone: (id: number) => request<{ message: string }>(`/milestones/${id}`, { method: "DELETE" }),

  indicators: (projectId: number) =>
    request<{ items: ProjectIndicator[]; can_edit: boolean }>(`/projects/${projectId}/indicators`),
  createIndicator: (projectId: number, payload: IndicatorPayload) =>
    request<{ indicator: ProjectIndicator }>(`/projects/${projectId}/indicators`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateIndicator: (id: number, payload: IndicatorPayload) =>
    request<{ indicator: ProjectIndicator }>(`/indicators/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteIndicator: (id: number) => request<{ message: string }>(`/indicators/${id}`, { method: "DELETE" }),

  stakeholders: (projectId: number) =>
    request<{ items: Stakeholder[]; can_edit: boolean }>(`/projects/${projectId}/stakeholders`),
  createStakeholder: (projectId: number, payload: StakeholderPayload) =>
    request<{ stakeholder: Stakeholder }>(`/projects/${projectId}/stakeholders`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateStakeholder: (id: number, payload: StakeholderPayload) =>
    request<{ stakeholder: Stakeholder }>(`/stakeholders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteStakeholder: (id: number) => request<{ message: string }>(`/stakeholders/${id}`, { method: "DELETE" }),

  activities: (projectId: number) => request<ActivitiesResponse>(`/projects/${projectId}/activities`),
  createActivity: (projectId: number, payload: ActivityPayload) =>
    request<{ activity: Activity }>(`/projects/${projectId}/activities`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateActivity: (id: number, payload: ActivityPayload) =>
    request<{ activity: Activity }>(`/activities/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteActivity: (id: number) => request<{ message: string }>(`/activities/${id}`, { method: "DELETE" }),

  risks: (projectId: number) => request<{ items: Risk[] }>(`/projects/${projectId}/risks`),
  createRisk: (projectId: number, payload: RiskPayload) =>
    request<{ risk: Risk }>(`/projects/${projectId}/risks`, { method: "POST", body: JSON.stringify(payload) }),
  updateRisk: (id: number, payload: RiskPayload) =>
    request<{ risk: Risk }>(`/risks/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteRisk: (id: number) => request<{ message: string }>(`/risks/${id}`, { method: "DELETE" }),

  actions: (projectId: number) => request<{ items: Action5W2H[] }>(`/projects/${projectId}/actions`),
  createAction: (projectId: number, payload: ActionPayload) =>
    request<{ action: Action5W2H }>(`/projects/${projectId}/actions`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAction: (id: number, payload: ActionPayload) =>
    request<{ action: Action5W2H }>(`/actions/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteAction: (id: number) => request<{ message: string }>(`/actions/${id}`, { method: "DELETE" }),

  swot: (projectId: number) => request<{ items: SwotItem[] }>(`/projects/${projectId}/swot`),
  createSwot: (projectId: number, quadrant: SwotQuadrant, description: string) =>
    request<{ item: SwotItem }>(`/projects/${projectId}/swot`, {
      method: "POST",
      body: JSON.stringify({ quadrant, description }),
    }),
  deleteSwot: (id: number) => request<{ message: string }>(`/swot/${id}`, { method: "DELETE" }),

  projectLessons: (projectId: number) => request<{ items: Lesson[] }>(`/projects/${projectId}/lessons`),
  lessons: (params: { search?: string; category?: string; secretariat_id?: number } = {}) =>
    request<Paged<Lesson>>(`/lessons${query(params)}`),
  createLesson: (projectId: number, payload: LessonPayload) =>
    request<{ lesson: Lesson }>(`/projects/${projectId}/lessons`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteLesson: (id: number) => request<{ message: string }>(`/lessons/${id}`, { method: "DELETE" }),

  attachments: (projectId: number) => request<{ items: Attachment[] }>(`/projects/${projectId}/attachments`),
  activityAttachments: (activityId: number) =>
    request<{ items: Attachment[] }>(`/activities/${activityId}/attachments`),
  uploadAttachment: (projectId: number, file: File) => {
    const body = new FormData()
    body.append("file", file)
    return request<{ attachment: Attachment }>(`/projects/${projectId}/attachments`, { method: "POST", body })
  },
  uploadActivityAttachment: (activityId: number, file: File) => {
    const body = new FormData()
    body.append("file", file)
    return request<{ attachment: Attachment }>(`/activities/${activityId}/attachments`, { method: "POST", body })
  },
  deleteAttachment: (id: number) => request<{ message: string }>(`/attachments/${id}`, { method: "DELETE" }),

  notifications: () => request<{ items: Notification[]; unread_count: number }>("/notifications"),
  markNotificationRead: (id: number) =>
    request<{ message: string }>(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () =>
    request<{ message: string }>("/notifications/read-all", { method: "POST" }),

  secretariats: () => request<{ items: Secretariat[] }>("/secretariats"),
  createSecretariat: (payload: { name: string; acronym: string; color: string; active?: boolean }) =>
    request<{ secretariat: Secretariat }>("/secretariats", { method: "POST", body: JSON.stringify(payload) }),
  updateSecretariat: (id: number, payload: { name: string; acronym: string; color: string; active?: boolean }) =>
    request<{ secretariat: Secretariat }>(`/secretariats/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSecretariat: (id: number) => request<{ message: string }>(`/secretariats/${id}`, { method: "DELETE" }),

  cargos: () => request<{ items: Cargo[] }>("/cargos"),
  createCargo: (payload: { name: string; description: string; active?: boolean }) =>
    request<{ cargo: Cargo }>("/cargos", { method: "POST", body: JSON.stringify(payload) }),
  updateCargo: (id: number, payload: { name: string; description: string; active?: boolean }) =>
    request<{ cargo: Cargo }>(`/cargos/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCargo: (id: number) => request<{ message: string }>(`/cargos/${id}`, { method: "DELETE" }),

  users: (params: { search?: string; role?: string; secretariat_id?: number; active?: boolean } = {}) =>
    request<{ items: User[] }>(`/users${query(params)}`),
  createUser: (payload: UserPayload) =>
    request<{ user: User }>("/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id: number, payload: UserPayload) =>
    request<{ user: User }>(`/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  logs: (params: { search?: string; action?: string; entity?: string; user_id?: number; from?: string; to?: string; page?: number } = {}) =>
    request<{ items: AuditLog[]; total: number; page: number; page_size: number }>(`/logs${query(params)}`),
}

export async function downloadReport(
  params: {
    search?: string
    status?: string
    priority?: string
    secretariat_id?: number
    overdue?: boolean
    include_canceled?: boolean
    from?: string
    to?: string
    format?: "xlsx" | "pdf"
  } = {},
) {
  const { format: requestedFormat, ...filters } = params
  const format = requestedFormat ?? "xlsx"
  const response = await fetch(`${API_URL}/reports/projects.${format}${query(filters)}`, {
    credentials: "include",
  })
  if (!response.ok) {
    throw new ApiError("Não foi possível gerar o relatório.", response.status)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `agora-relatorio-${new Date().toISOString().slice(0, 10)}.${format}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function downloadAuditCsv(
  params: { search?: string; action?: string; entity?: string; user_id?: number; from?: string; to?: string } = {},
) {
  const response = await fetch(`${API_URL}/logs/export${query(params)}`, {
    credentials: "include",
  })
  if (!response.ok) throw new ApiError("Não foi possível exportar a auditoria.", response.status)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `agora-auditoria-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function downloadAttachment(attachment: Attachment) {
  const response = await fetch(`${API_URL}/attachments/${attachment.id}/download`, {
    credentials: "include",
  })
  if (!response.ok) throw new ApiError("Não foi possível baixar o arquivo.", response.status)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = attachment.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export type { ProjectTransfer, DeadlineChange, AuditLog }

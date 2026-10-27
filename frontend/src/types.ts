import type { Role } from "@/lib/roles"

export type { Role } from "@/lib/roles"

export type ProjectStatus =
  | "NAO_INICIADO"
  | "EM_ANDAMENTO"
  | "EM_ATRASO"
  | "AGUARDANDO_APROVACAO"
  | "CONCLUIDO"
  | "CONCLUIDO_COM_ATRASO"
  | "CANCELADO"
  | "SUSPENSO"

export type ActivityStatus =
  | "NAO_INICIADA"
  | "EM_ANDAMENTO"
  | "EM_ATRASO"
  | "CONCLUIDA"
  | "CONCLUIDA_COM_ATRASO"
  | "CANCELADA"
  | "SUSPENSA"

export type Priority = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"

export type SwotQuadrant = "FORCA" | "FRAQUEZA" | "OPORTUNIDADE" | "AMEACA"

export interface Tenant {
  id: number
  name: string
  slug: string
  city: string
  state: string
  primary_color: string
  secondary_color: string
}

export interface Secretariat {
  id: number
  tenant_id: number
  name: string
  acronym: string
  color: string
  active: boolean
  user_count?: number
  project_count?: number
}

export interface Cargo {
  id: number
  tenant_id: number
  name: string
  description: string
  active: boolean
  user_count?: number
}

export interface User {
  id: number
  name: string
  email: string
  role: Role
  active: boolean
  secretariat_id: number | null
  secretariat?: Secretariat | null
  cargo_id: number | null
  cargo?: Cargo | null
  phone: string
  notify_email: boolean
  notify_whatsapp: boolean
  permissions: string[]
  last_login_at: string | null
  created_at: string
}

export interface SearchProject {
  id: number
  code: string
  name: string
  status: ProjectStatus
  responsible_secretariat?: Secretariat
}

export interface SearchLinked {
  id: number
  project_id: number
  project_code: string
  project_name: string
  title: string
  detail?: string
  status?: string
}

export interface SearchSupplier {
  id: number
  name: string
  document: string
  category: string
  email: string
  phone: string
  active: boolean
}

export interface SearchResponse {
  projects: SearchProject[]
  users: User[]
  activities: SearchLinked[]
  risks: SearchLinked[]
  lessons: SearchLinked[]
  documents: SearchLinked[]
  stakeholders: SearchLinked[]
  suppliers: SearchSupplier[]
  contracts: SearchLinked[]
}

export interface Permissions {
  can_create_project: boolean
  can_delete_project: boolean
  can_manage_users: boolean
  can_manage_settings: boolean
  can_transfer: boolean
  read_only: boolean
  codes: string[]
}

export interface Project {
  id: number
  tenant_id: number
  code: string
  name: string
  justification: string
  objectives: string
  requirements: string
  risk_assessment: string
  government_plan: boolean
  government_plan_detail: string
  priority: Priority
  status: ProjectStatus
  responsible_secretariat_id: number
  responsible_secretariat?: Secretariat
  secretariats?: Secretariat[]
  planned_start: string | null
  planned_end: string | null
  real_start: string | null
  real_end: string | null
  budget_planned: number
  budget_executed: number
  ppa?: string
  ldo?: string
  loa?: string
  baseline_start?: string | null
  baseline_end?: string | null
  baseline_budget?: number
  template_id?: number | null
  created_by_id: number
  created_by?: User
  created_at: string
  updated_at: string
  progress: number
  activity_count: number
  completed_count: number
}

export interface ProjectPermissions {
  can_edit: boolean
  can_manage: boolean
  can_transfer: boolean
  can_delete: boolean
  read_only: boolean
}

export interface ActivitiesResponse {
  items: Activity[]
}

export interface Activity {
  id: number
  tenant_id: number
  project_id: number
  title: string
  description: string
  status: ActivityStatus
  planned_start: string | null
  planned_end: string | null
  real_start: string | null
  real_end: string | null
  order: number
  is_late: boolean
  created_at: string
  updated_at: string
}

export interface Risk {
  id: number
  project_id: number
  description: string
  category: string
  gravity: number
  urgency: number
  tendency: number
  score: number
  level: string
  status: string
  response: string
  owner: string
  created_at: string
  updated_at: string
}

export interface Action5W2H {
  id: number
  project_id: number
  risk_id: number | null
  what: string
  why: string
  where: string
  when: string
  who: string
  how: string
  how_much: string
  status: string
  created_at: string
  updated_at: string
}

export interface SwotItem {
  id: number
  project_id: number
  quadrant: SwotQuadrant
  description: string
  created_at: string
}

export interface Lesson {
  id: number
  tenant_id: number
  project_id: number
  project?: Project
  title: string
  description: string
  category: string
  created_by_id: number
  created_by?: User
  created_at: string
}

export interface Attachment {
  id: number
  project_id: number
  activity_id?: number | null
  name: string
  mime_type: string
  size: number
  category?: string
  description?: string
  version?: number
  expires_at?: string | null
  uploaded_by_id: number
  uploaded_by?: User
  created_at: string
}

export type ApprovalStage = "TECNICA" | "ORCAMENTARIA" | "JURIDICA"
export type ApprovalStatus = "PENDENTE" | "APROVADO" | "REJEITADO"

export interface ProjectApproval {
  id: number
  tenant_id: number
  project_id: number
  stage: ApprovalStage
  status: ApprovalStatus
  comment: string
  signature: string
  approver_id: number | null
  approver?: User | null
  decided_at: string | null
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: number
  tenant_id: number
  name: string
  document: string
  category: string
  email: string
  phone: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface BudgetLine {
  id: number
  tenant_id: number
  project_id: number
  code: string
  description: string
  source: string
  planned: number
  created_at: string
  updated_at: string
}

export interface Payment {
  id: number
  tenant_id: number
  project_id: number
  commitment_id: number
  amount: number
  paid_at: string | null
  note: string
  created_by_id: number
  created_at: string
}

export interface Contract {
  id: number
  tenant_id: number
  project_id: number
  commitment_id: number | null
  supplier_id: number | null
  supplier?: Supplier | null
  parent_id: number | null
  number: string
  object: string
  value: number
  status: "VIGENTE" | "ENCERRADO" | "RESCINDIDO" | "ADITIVO"
  start_date: string | null
  end_date: string | null
  signed_at: string | null
  created_at: string
  updated_at: string
}

export interface Commitment {
  id: number
  tenant_id: number
  project_id: number
  budget_line_id: number | null
  budget_line?: BudgetLine | null
  supplier_id: number | null
  supplier?: Supplier | null
  number: string
  description: string
  amount: number
  status: "EMPENHADO" | "LIQUIDADO" | "PAGO" | "CANCELADO"
  issued_at: string | null
  created_by_id: number
  created_at: string
  updated_at: string
  payments?: Payment[]
  contract?: Contract | null
}

export interface FinanceResponse {
  budget_lines: BudgetLine[]
  commitments: Commitment[]
  contracts: Contract[]
  totals: { planned: number; committed: number; paid: number }
  can_edit: boolean
}

export type DocumentStatus = "PENDENTE" | "RECEBIDO" | "DISPENSADO" | "VENCIDO"

export interface ProjectDocument {
  id: number
  tenant_id: number
  project_id: number
  name: string
  category: string
  required: boolean
  status: DocumentStatus
  attachment_id: number | null
  attachment?: Attachment | null
  note: string
  created_at: string
  updated_at: string
}

export interface Stakeholder {
  id: number
  tenant_id: number
  project_id: number
  name: string
  kind: "EQUIPE" | "BENEFICIARIO" | "ORGAO" | "FORNECEDOR" | "COMUNIDADE" | "OUTRO"
  organization: string
  email: string
  phone: string
  role: string
  influence: number
  interest: number
  notes: string
  created_at: string
  updated_at: string
}

export interface ActivityDependency {
  id: number
  project_id: number
  predecessor_id: number
  predecessor_title: string
  successor_id: number
  successor_title: string
}

export interface Milestone {
  id: number
  tenant_id: number
  project_id: number
  name: string
  description: string
  due_date: string | null
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO" | "ATRASADO" | "CANCELADO"
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ProjectIndicator {
  id: number
  tenant_id: number
  project_id: number
  name: string
  unit: string
  target: number
  current: number
  notes: string
  created_at: string
  updated_at: string
}

export interface ProjectTemplate {
  id: number
  tenant_id: number
  name: string
  description: string
  priority: Priority
  duration_days: number
  activities: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface SavedReport {
  id: number
  tenant_id: number
  user_id: number
  name: string
  filters: string
  created_at: string
}

export interface ReportSchedule {
  id: number
  tenant_id: number
  user_id: number
  name: string
  frequency: "DAILY" | "WEEKLY" | "MONTHLY"
  filters: string
  active: boolean
  next_run: string | null
  last_run: string | null
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  phone: string
  notify_email: boolean
  notify_whatsapp: boolean
  email_configured?: boolean
  whatsapp_configured?: boolean
}

export interface PermissionInfo {
  code: string
  label: string
  group: string
  description: string
}

export interface PublicProject {
  id: number
  code: string
  name: string
  status: ProjectStatus
  priority: Priority
  responsible_secretariat?: Secretariat
  secretariats?: Secretariat[]
  planned_start: string | null
  planned_end: string | null
  real_end: string | null
  budget_planned: number
  budget_executed: number
  progress: number
  government_plan: boolean
  government_plan_detail: string
  justification: string
  objectives: string
  updated_at: string
}

export interface PublicTransparency {
  tenant: Tenant
  summary: { total: number; active: number; late: number; completed: number; awaiting_approval: number }
  projects: PublicProject[]
  secretariats: Secretariat[]
}

export interface PublicProjectDetail {
  tenant: Tenant
  project: PublicProject
  activities: Activity[]
  milestones: Milestone[]
  contracts: Contract[]
  payments: Payment[]
  commitments: Commitment[]
}

export interface ProjectTransfer {
  id: number
  project_id: number
  from_secretariat_id: number | null
  from_secretariat?: Secretariat
  to_secretariat_id: number
  to_secretariat?: Secretariat
  changed_by_id: number
  changed_by?: User
  note: string
  created_at: string
}

export interface DeadlineChange {
  id: number
  project_id: number
  entity_type: string
  entity_id: number
  entity_name: string
  field: string
  old_value: string
  new_value: string
  justification: string
  changed_by_id: number
  changed_by?: User
  created_at: string
}

export interface ProjectHistory {
  logs: AuditLog[]
  logs_total: number
  deadline_changes: DeadlineChange[]
  transfers: ProjectTransfer[]
}

export interface AuditLog {
  id: number
  tenant_id: number
  user_id: number
  user_name: string
  action: string
  entity: string
  entity_id: number
  details: string
  ip: string
  created_at: string
}

export interface Notification {
  id: number
  tenant_id: number
  user_id: number
  title: string
  message: string
  type: string
  link: string
  read_at: string | null
  created_at: string
}

export interface DashboardSummary {
  total: number
  active: number
  in_progress: number
  awaiting_approval: number
  late: number
  completed: number
  completed_late: number
  completed_period: number
  not_started: number
  suspended: number
  canceled: number
  budget_planned: number
  budget_executed: number
  average_progress: number
  activities_total: number
  activities_done: number
  activities_late: number
  government_total: number
  government_aligned: number
}

export interface SecretariatAggregate {
  id: number
  name: string
  acronym: string
  color: string
  total: number
  late: number
  completed: number
  in_progress: number
  awaiting_approval: number
  progress: number
  budget_planned: number
  budget_executed: number
}

export interface Dashboard {
  summary: DashboardSummary
  by_status: { status: ProjectStatus; count: number }[]
  by_priority: { priority: Priority; count: number }[]
  by_secretariat: SecretariatAggregate[]
  upcoming: Project[]
  late_projects: Project[]
  recent_logs: AuditLog[]
  period: string
}

export interface KanbanColumn {
  key: "nao_iniciado" | "em_andamento" | "aguardando_aprovacao" | "concluido"
  title: string
  items: Project[]
}

export interface Paged<T> {
  items: T[]
  total: number
  page?: number
  page_size?: number
}

export interface ReportSummary {
  projects: number
  activities: number
  risks: number
}

export interface LoginResponse {
  csrf_token: string
  user: User
  tenant: Tenant
}

export interface MeResponse {
  user: User
  tenant: Tenant
  permissions: Permissions
}

export interface ProjectDetailResponse {
  project: Project
  permissions: ProjectPermissions
}

export interface RealtimeEvent {
  type: "project.changed" | "settings.changed" | "notification.created" | "notification.read"
  action?: string
  tenant_id: number
  user_id?: number
  project_id?: number
  payload?: unknown
  at: string
}

package models

import (
	"encoding/json"
	"time"
)

const (
	PermProjectsView     = "projects.view"
	PermProjectsCreate   = "projects.create"
	PermProjectsEdit     = "projects.edit"
	PermProjectsDelete   = "projects.delete"
	PermProjectsTransfer = "projects.transfer"
	PermRisksEdit        = "risks.edit"
	PermApprovalsView    = "approvals.view"
	PermApprovalsDecide  = "approvals.decide"
	PermFinanceView      = "finance.view"
	PermFinanceEdit      = "finance.edit"
	PermDocumentsEdit    = "documents.edit"
	PermPlanningEdit     = "planning.edit"
	PermStakeholdersEdit = "stakeholders.edit"
	PermReportsExport    = "reports.export"
	PermSearchGlobal     = "search.global"
	PermSuppliersManage  = "suppliers.manage"
	PermTemplatesManage  = "templates.manage"
	PermAdminUsers       = "admin.users"
	PermAdminSettings    = "admin.settings"
	PermAdminAudit       = "admin.audit"
	PermPortalManage     = "portal.manage"
)

type PermissionInfo struct {
	Code        string `json:"code"`
	Label       string `json:"label"`
	Group       string `json:"group"`
	Description string `json:"description"`
}

var AllPermissions = []PermissionInfo{
	{PermProjectsView, "Ver projetos", "Projetos", "Acessar o portfólio e o detalhe dos projetos visíveis."},
	{PermProjectsCreate, "Criar projetos", "Projetos", "Cadastrar projetos na própria secretaria."},
	{PermProjectsEdit, "Editar projetos", "Projetos", "Editar dados e atividades de projetos da própria secretaria."},
	{PermProjectsDelete, "Excluir projetos", "Projetos", "Remover projetos do portfólio."},
	{PermProjectsTransfer, "Encaminhar projetos", "Projetos", "Transferir a secretaria responsável."},
	{PermRisksEdit, "Editar riscos", "Projetos", "Registrar riscos, 5W2H e SWOT."},
	{PermApprovalsView, "Ver aprovações", "Governança", "Consultar o fluxo de aprovação."},
	{PermApprovalsDecide, "Decidir aprovações", "Governança", "Aprovar, rejeitar e assinar etapas."},
	{PermFinanceView, "Ver financeiro", "Financeiro", "Consultar dotações, contratos e pagamentos."},
	{PermFinanceEdit, "Editar financeiro", "Financeiro", "Cadastrar dotações, empenhos, contratos e pagamentos."},
	{PermDocumentsEdit, "Editar documentos", "Documentos", "Enviar anexos e atualizar o checklist documental."},
	{PermPlanningEdit, "Editar planejamento", "Planejamento", "Gerenciar marcos, dependências e indicadores."},
	{PermStakeholdersEdit, "Editar partes interessadas", "Projetos", "Gerenciar equipe, beneficiários e órgãos externos."},
	{PermReportsExport, "Exportar relatórios", "Relatórios", "Baixar XLSX, PDF e CSV."},
	{PermSearchGlobal, "Busca global", "Relatórios", "Pesquisar em projetos, atividades, riscos e documentos."},
	{PermSuppliersManage, "Gerenciar fornecedores", "Financeiro", "Cadastrar e editar fornecedores."},
	{PermTemplatesManage, "Gerenciar modelos", "Administração", "Criar modelos de projeto e de atividades."},
	{PermAdminUsers, "Gerenciar usuários", "Administração", "Criar usuários e ajustar permissões."},
	{PermAdminSettings, "Gerenciar configurações", "Administração", "Secretarias, cargos e identidade visual."},
	{PermAdminAudit, "Consultar auditoria", "Administração", "Acessar e exportar a trilha de auditoria."},
	{PermPortalManage, "Gerenciar transparência", "Administração", "Publicar e revisar dados do portal público."},
}

var rolePermissions = map[string][]string{
	RoleAdmin: {
		PermProjectsView, PermProjectsCreate, PermProjectsEdit, PermProjectsDelete, PermProjectsTransfer,
		PermRisksEdit, PermApprovalsView, PermApprovalsDecide, PermFinanceView, PermFinanceEdit,
		PermDocumentsEdit, PermPlanningEdit, PermStakeholdersEdit, PermReportsExport, PermSearchGlobal,
		PermSuppliersManage, PermTemplatesManage, PermAdminUsers, PermAdminSettings, PermAdminAudit, PermPortalManage,
	},
	RoleGestor: {
		PermProjectsView, PermProjectsCreate, PermProjectsEdit, PermProjectsTransfer, PermRisksEdit,
		PermApprovalsView, PermApprovalsDecide, PermFinanceView, PermFinanceEdit, PermDocumentsEdit,
		PermPlanningEdit, PermStakeholdersEdit, PermReportsExport, PermSearchGlobal,
	},
	RoleEditor: {
		PermProjectsView, PermProjectsCreate, PermProjectsEdit, PermRisksEdit, PermApprovalsView,
		PermFinanceView, PermDocumentsEdit, PermPlanningEdit, PermStakeholdersEdit, PermReportsExport,
		PermSearchGlobal,
	},
	RoleGoverno: {
		PermProjectsView, PermApprovalsView, PermFinanceView, PermReportsExport, PermSearchGlobal,
	},
}

func (u *User) PermissionOverrides() map[string]bool {
	values := map[string]bool{}
	if u == nil || u.Permissions == "" {
		return values
	}
	_ = json.Unmarshal([]byte(u.Permissions), &values)
	return values
}

func (u *User) HasPermission(code string) bool {
	if u == nil {
		return false
	}
	if u.Role == RoleAdmin {
		return true
	}
	if value, ok := u.PermissionOverrides()[code]; ok {
		return value
	}
	for _, candidate := range rolePermissions[u.Role] {
		if candidate == code {
			return true
		}
	}
	return false
}

func (u *User) PermissionCodes() []string {
	codes := make([]string, 0, len(AllPermissions))
	for _, permission := range AllPermissions {
		if u.HasPermission(permission.Code) {
			codes = append(codes, permission.Code)
		}
	}
	return codes
}

func (u *User) CanWrite() bool {
	return u.HasPermission(PermProjectsCreate) || u.HasPermission(PermProjectsEdit)
}

func (u *User) IsGoverno() bool { return u != nil && u.Role == RoleGoverno }

func IsValidPermission(code string) bool {
	for _, permission := range AllPermissions {
		if permission.Code == code {
			return true
		}
	}
	return false
}

func EncodePermissionOverrides(values map[string]bool) string {
	if len(values) == 0 {
		return ""
	}
	raw, _ := json.Marshal(values)
	return string(raw)
}

type ProjectApproval struct {
	ID         uint       `gorm:"primaryKey" json:"id"`
	TenantID   uint       `gorm:"index;not null" json:"tenant_id"`
	ProjectID  uint       `gorm:"index;not null" json:"project_id"`
	Stage      string     `gorm:"size:30;not null" json:"stage"`
	Status     string     `gorm:"size:20;default:PENDENTE" json:"status"`
	Comment    string     `gorm:"type:text" json:"comment"`
	Signature  string     `gorm:"size:160" json:"signature"`
	ApproverID *uint      `gorm:"index" json:"approver_id"`
	Approver   *User      `gorm:"foreignKey:ApproverID" json:"approver,omitempty"`
	DecidedAt  *time.Time `json:"decided_at"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type Supplier struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TenantID  uint      `gorm:"index;not null" json:"tenant_id"`
	Name      string    `gorm:"size:180;not null" json:"name"`
	Document  string    `gorm:"size:30" json:"document"`
	Category  string    `gorm:"size:60" json:"category"`
	Email     string    `gorm:"size:160" json:"email"`
	Phone     string    `gorm:"size:40" json:"phone"`
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type BudgetLine struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	TenantID    uint      `gorm:"index;not null" json:"tenant_id"`
	ProjectID   uint      `gorm:"index;not null" json:"project_id"`
	Code        string    `gorm:"size:60;not null" json:"code"`
	Description string    `gorm:"size:200" json:"description"`
	Source      string    `gorm:"size:80" json:"source"`
	Planned     float64   `gorm:"default:0" json:"planned"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Commitment struct {
	ID           uint        `gorm:"primaryKey" json:"id"`
	TenantID     uint        `gorm:"index;not null" json:"tenant_id"`
	ProjectID    uint        `gorm:"index;not null" json:"project_id"`
	BudgetLineID *uint       `gorm:"index" json:"budget_line_id"`
	BudgetLine   *BudgetLine `gorm:"foreignKey:BudgetLineID" json:"budget_line,omitempty"`
	SupplierID   *uint       `gorm:"index" json:"supplier_id"`
	Supplier     *Supplier   `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Number       string      `gorm:"size:80" json:"number"`
	Description  string      `gorm:"type:text" json:"description"`
	Amount       float64     `gorm:"default:0" json:"amount"`
	Status       string      `gorm:"size:20;default:EMPENHADO" json:"status"`
	IssuedAt     *time.Time  `json:"issued_at"`
	CreatedByID  uint        `json:"created_by_id"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
	Payments     []Payment   `gorm:"foreignKey:CommitmentID" json:"payments,omitempty"`
	Contract     *Contract   `gorm:"foreignKey:CommitmentID" json:"contract,omitempty"`
}

type Contract struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	TenantID     uint       `gorm:"index;not null" json:"tenant_id"`
	ProjectID    uint       `gorm:"index;not null" json:"project_id"`
	CommitmentID *uint      `gorm:"index" json:"commitment_id"`
	SupplierID   *uint      `gorm:"index" json:"supplier_id"`
	Supplier     *Supplier  `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	ParentID     *uint      `gorm:"index" json:"parent_id"`
	Number       string     `gorm:"size:80;not null" json:"number"`
	Object       string     `gorm:"type:text" json:"object"`
	Value        float64    `gorm:"default:0" json:"value"`
	Status       string     `gorm:"size:20;default:VIGENTE" json:"status"`
	StartDate    *time.Time `json:"start_date"`
	EndDate      *time.Time `json:"end_date"`
	SignedAt     *time.Time `json:"signed_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type Payment struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	TenantID     uint       `gorm:"index;not null" json:"tenant_id"`
	ProjectID    uint       `gorm:"index;not null" json:"project_id"`
	CommitmentID uint       `gorm:"index;not null" json:"commitment_id"`
	Amount       float64    `gorm:"default:0" json:"amount"`
	PaidAt       *time.Time `json:"paid_at"`
	Note         string     `gorm:"size:200" json:"note"`
	CreatedByID  uint       `json:"created_by_id"`
	CreatedAt    time.Time  `json:"created_at"`
}

type ProjectDocument struct {
	ID           uint        `gorm:"primaryKey" json:"id"`
	TenantID     uint        `gorm:"index;not null" json:"tenant_id"`
	ProjectID    uint        `gorm:"index;not null" json:"project_id"`
	Name         string      `gorm:"size:180;not null" json:"name"`
	Category     string      `gorm:"size:60" json:"category"`
	Required     bool        `gorm:"default:false" json:"required"`
	Status       string      `gorm:"size:20;default:PENDENTE" json:"status"`
	AttachmentID *uint       `gorm:"index" json:"attachment_id"`
	Attachment   *Attachment `gorm:"foreignKey:AttachmentID" json:"attachment,omitempty"`
	Note         string      `gorm:"type:text" json:"note"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

type Stakeholder struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TenantID     uint      `gorm:"index;not null" json:"tenant_id"`
	ProjectID    uint      `gorm:"index;not null" json:"project_id"`
	Name         string    `gorm:"size:180;not null" json:"name"`
	Kind         string    `gorm:"size:40;default:EQUIPE" json:"kind"`
	Organization string    `gorm:"size:180" json:"organization"`
	Email        string    `gorm:"size:160" json:"email"`
	Phone        string    `gorm:"size:40" json:"phone"`
	Role         string    `gorm:"size:120" json:"role"`
	Influence    int       `gorm:"default:3" json:"influence"`
	Interest     int       `gorm:"default:3" json:"interest"`
	Notes        string    `gorm:"type:text" json:"notes"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type ActivityDependency struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	TenantID      uint      `gorm:"index;not null" json:"tenant_id"`
	ProjectID     uint      `gorm:"index;not null" json:"project_id"`
	PredecessorID uint      `gorm:"index;not null" json:"predecessor_id"`
	SuccessorID   uint      `gorm:"index;not null" json:"successor_id"`
	CreatedAt     time.Time `json:"created_at"`
}

type Milestone struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	TenantID    uint       `gorm:"index;not null" json:"tenant_id"`
	ProjectID   uint       `gorm:"index;not null" json:"project_id"`
	Name        string     `gorm:"size:180;not null" json:"name"`
	Description string     `gorm:"type:text" json:"description"`
	DueDate     *time.Time `json:"due_date"`
	Status      string     `gorm:"size:20;default:PENDENTE" json:"status"`
	CompletedAt *time.Time `json:"completed_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type ProjectIndicator struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TenantID  uint      `gorm:"index;not null" json:"tenant_id"`
	ProjectID uint      `gorm:"index;not null" json:"project_id"`
	Name      string    `gorm:"size:180;not null" json:"name"`
	Unit      string    `gorm:"size:30" json:"unit"`
	Target    float64   `gorm:"default:0" json:"target"`
	Current   float64   `gorm:"default:0" json:"current"`
	Notes     string    `gorm:"type:text" json:"notes"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ProjectTemplate struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TenantID     uint      `gorm:"index;not null" json:"tenant_id"`
	Name         string    `gorm:"size:180;not null" json:"name"`
	Description  string    `gorm:"type:text" json:"description"`
	Priority     string    `gorm:"size:16;default:MEDIA" json:"priority"`
	DurationDays int       `gorm:"default:90" json:"duration_days"`
	Activities   string    `gorm:"type:text" json:"activities"`
	Active       bool      `gorm:"default:true" json:"active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type SavedReport struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TenantID  uint      `gorm:"index;not null" json:"tenant_id"`
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	Name      string    `gorm:"size:120;not null" json:"name"`
	Filters   string    `gorm:"type:text" json:"filters"`
	CreatedAt time.Time `json:"created_at"`
}

type ReportSchedule struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	TenantID  uint       `gorm:"index;not null" json:"tenant_id"`
	UserID    uint       `gorm:"index;not null" json:"user_id"`
	Name      string     `gorm:"size:120;not null" json:"name"`
	Frequency string     `gorm:"size:20;default:WEEKLY" json:"frequency"`
	Filters   string     `gorm:"type:text" json:"filters"`
	Active    bool       `gorm:"default:true" json:"active"`
	NextRun   *time.Time `json:"next_run"`
	LastRun   *time.Time `json:"last_run"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type NotificationDelivery struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	TenantID       uint      `gorm:"index;not null" json:"tenant_id"`
	NotificationID uint      `gorm:"index;not null" json:"notification_id"`
	UserID         uint      `gorm:"index" json:"user_id"`
	Channel        string    `gorm:"size:20" json:"channel"`
	Status         string    `gorm:"size:20" json:"status"`
	Error          string    `gorm:"type:text" json:"error"`
	CreatedAt      time.Time `json:"created_at"`
}

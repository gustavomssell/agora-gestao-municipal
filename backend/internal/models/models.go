package models

import (
	"time"

	"gorm.io/gorm"
)

const (
	RoleAdmin   = "ADMIN"
	RoleGestor  = "GESTOR"
	RoleEditor  = "EDITOR"
	RoleGoverno = "GOVERNO"
)

const (
	PriorityBaixa   = "BAIXA"
	PriorityMedia   = "MEDIA"
	PriorityAlta    = "ALTA"
	PriorityCritica = "CRITICA"
)

const (
	StatusNaoIniciado         = "NAO_INICIADO"
	StatusEmAndamento         = "EM_ANDAMENTO"
	StatusEmAtraso            = "EM_ATRASO"
	StatusAguardandoAprovacao = "AGUARDANDO_APROVACAO"
	StatusConcluido           = "CONCLUIDO"
	StatusConcluidoAtraso     = "CONCLUIDO_COM_ATRASO"
	StatusCancelado           = "CANCELADO"
	StatusSuspenso            = "SUSPENSO"
)

var ProjectStatuses = []string{
	StatusNaoIniciado, StatusEmAndamento, StatusEmAtraso, StatusAguardandoAprovacao,
	StatusConcluido, StatusConcluidoAtraso, StatusCancelado, StatusSuspenso,
}

var ApprovalStages = []string{"TECNICA", "ORCAMENTARIA", "JURIDICA"}

const (
	ActivityNaoIniciada     = "NAO_INICIADA"
	ActivityEmAndamento     = "EM_ANDAMENTO"
	ActivityEmAtraso        = "EM_ATRASO"
	ActivityConcluida       = "CONCLUIDA"
	ActivityConcluidaAtraso = "CONCLUIDA_COM_ATRASO"
	ActivityCancelada       = "CANCELADA"
	ActivitySuspensa        = "SUSPENSA"
)

const (
	SwotForca        = "FORCA"
	SwotFraqueza     = "FRAQUEZA"
	SwotOportunidade = "OPORTUNIDADE"
	SwotAmeaca       = "AMEACA"
)

type Tenant struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	Name           string    `gorm:"size:160;not null" json:"name"`
	Slug           string    `gorm:"size:80;uniqueIndex;not null" json:"slug"`
	City           string    `gorm:"size:120" json:"city"`
	State          string    `gorm:"size:2" json:"state"`
	PrimaryColor   string    `gorm:"size:16;default:#123b33" json:"primary_color"`
	SecondaryColor string    `gorm:"size:16;default:#c8a34a" json:"secondary_color"`
	Active         bool      `gorm:"default:true" json:"active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Secretariat struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TenantID  uint      `gorm:"index;not null" json:"tenant_id"`
	Name      string    `gorm:"size:160;not null" json:"name"`
	Acronym   string    `gorm:"size:24" json:"acronym"`
	Color     string    `gorm:"size:16" json:"color"`
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Cargo struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	TenantID    uint      `gorm:"index;not null" json:"tenant_id"`
	Name        string    `gorm:"size:80;not null" json:"name"`
	Description string    `gorm:"size:200" json:"description"`
	Active      bool      `gorm:"default:true" json:"active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type User struct {
	ID             uint         `gorm:"primaryKey" json:"id"`
	TenantID       uint         `gorm:"uniqueIndex:idx_user_tenant_email;not null" json:"tenant_id"`
	SecretariatID  *uint        `gorm:"index" json:"secretariat_id"`
	Secretariat    *Secretariat `gorm:"foreignKey:SecretariatID" json:"secretariat,omitempty"`
	CargoID        *uint        `gorm:"index" json:"cargo_id"`
	Cargo          *Cargo       `gorm:"foreignKey:CargoID" json:"cargo,omitempty"`
	Name           string       `gorm:"size:160;not null" json:"name"`
	Email          string       `gorm:"size:160;uniqueIndex:idx_user_tenant_email;not null" json:"email"`
	PasswordHash   string       `gorm:"size:255;not null" json:"-"`
	Role           string       `gorm:"size:20;not null" json:"role"`
	Active         bool         `gorm:"default:true" json:"active"`
	Permissions    string       `gorm:"type:text" json:"-"`
	Phone          string       `gorm:"size:40" json:"phone"`
	NotifyEmail    bool         `gorm:"default:true" json:"notify_email"`
	NotifyWhatsApp bool         `gorm:"default:false" json:"notify_whatsapp"`
	FailedAttempts int          `gorm:"default:0" json:"-"`
	LockedUntil    *time.Time   `json:"-"`
	LastLoginAt    *time.Time   `json:"last_login_at"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
}

func (u *User) IsAdmin() bool { return u.Role == RoleAdmin }

type Project struct {
	ID                       uint           `gorm:"primaryKey" json:"id"`
	TenantID                 uint           `gorm:"index;not null" json:"tenant_id"`
	Code                     string         `gorm:"size:32;index" json:"code"`
	Name                     string         `gorm:"size:200;not null" json:"name"`
	Justification            string         `gorm:"type:text" json:"justification"`
	Objectives               string         `gorm:"type:text" json:"objectives"`
	Requirements             string         `gorm:"type:text" json:"requirements"`
	RiskAssessment           string         `gorm:"type:text" json:"risk_assessment"`
	GovernmentPlan           bool           `gorm:"default:false" json:"government_plan"`
	GovernmentPlanDetail     string         `gorm:"type:text" json:"government_plan_detail"`
	Priority                 string         `gorm:"size:16;default:MEDIA" json:"priority"`
	Status                   string         `gorm:"size:32;default:NAO_INICIADO" json:"status"`
	ResponsibleSecretariatID uint           `gorm:"index;not null" json:"responsible_secretariat_id"`
	ResponsibleSecretariat   *Secretariat   `gorm:"foreignKey:ResponsibleSecretariatID" json:"responsible_secretariat,omitempty"`
	Secretariats             []Secretariat  `gorm:"many2many:project_secretariats;" json:"secretariats,omitempty"`
	PlannedStart             *time.Time     `json:"planned_start"`
	PlannedEnd               *time.Time     `json:"planned_end"`
	RealStart                *time.Time     `json:"real_start"`
	RealEnd                  *time.Time     `json:"real_end"`
	BudgetPlanned            float64        `gorm:"default:0" json:"budget_planned"`
	BudgetExecuted           float64        `gorm:"default:0" json:"budget_executed"`
	BaselineStart            *time.Time     `json:"baseline_start"`
	BaselineEnd              *time.Time     `json:"baseline_end"`
	BaselineBudget           float64        `gorm:"default:0" json:"baseline_budget"`
	PPA                      string         `gorm:"size:80" json:"ppa"`
	LDO                      string         `gorm:"size:80" json:"ldo"`
	LOA                      string         `gorm:"size:80" json:"loa"`
	TemplateID               *uint          `gorm:"index" json:"template_id"`
	CreatedByID              uint           `gorm:"index" json:"created_by_id"`
	CreatedBy                *User          `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
	CreatedAt                time.Time      `json:"created_at"`
	UpdatedAt                time.Time      `json:"updated_at"`
	DeletedAt                gorm.DeletedAt `gorm:"index" json:"-"`

	Progress       float64 `gorm:"-" json:"progress"`
	ActivityCount  int64   `gorm:"-" json:"activity_count"`
	CompletedCount int64   `gorm:"-" json:"completed_count"`
}

type Activity struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	TenantID     uint           `gorm:"index;not null" json:"tenant_id"`
	ProjectID    uint           `gorm:"index;not null" json:"project_id"`
	Title        string         `gorm:"size:200;not null" json:"title"`
	Description  string         `gorm:"type:text" json:"description"`
	Status       string         `gorm:"size:32;default:NAO_INICIADA" json:"status"`
	PlannedStart *time.Time     `json:"planned_start"`
	PlannedEnd   *time.Time     `json:"planned_end"`
	RealStart    *time.Time     `json:"real_start"`
	RealEnd      *time.Time     `json:"real_end"`
	Order        int            `gorm:"default:0" json:"order"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	IsLate bool `gorm:"-" json:"is_late"`
}

type ProjectTransfer struct {
	ID                uint         `gorm:"primaryKey" json:"id"`
	TenantID          uint         `gorm:"index;not null" json:"tenant_id"`
	ProjectID         uint         `gorm:"index;not null" json:"project_id"`
	FromSecretariatID *uint        `json:"from_secretariat_id"`
	FromSecretariat   *Secretariat `gorm:"foreignKey:FromSecretariatID" json:"from_secretariat,omitempty"`
	ToSecretariatID   uint         `json:"to_secretariat_id"`
	ToSecretariat     *Secretariat `gorm:"foreignKey:ToSecretariatID" json:"to_secretariat,omitempty"`
	ChangedByID       uint         `json:"changed_by_id"`
	ChangedBy         *User        `gorm:"foreignKey:ChangedByID" json:"changed_by,omitempty"`
	Note              string       `gorm:"type:text" json:"note"`
	CreatedAt         time.Time    `json:"created_at"`
}

type DeadlineChange struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	TenantID      uint      `gorm:"index;not null" json:"tenant_id"`
	ProjectID     uint      `gorm:"index;not null" json:"project_id"`
	EntityType    string    `gorm:"size:20" json:"entity_type"`
	EntityID      uint      `json:"entity_id"`
	EntityName    string    `gorm:"size:200" json:"entity_name"`
	Field         string    `gorm:"size:40" json:"field"`
	OldValue      string    `gorm:"size:40" json:"old_value"`
	NewValue      string    `gorm:"size:40" json:"new_value"`
	Justification string    `gorm:"type:text" json:"justification"`
	ChangedByID   uint      `json:"changed_by_id"`
	ChangedBy     *User     `gorm:"foreignKey:ChangedByID" json:"changed_by,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type Risk struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	TenantID    uint      `gorm:"index;not null" json:"tenant_id"`
	ProjectID   uint      `gorm:"index;not null" json:"project_id"`
	Description string    `gorm:"type:text;not null" json:"description"`
	Category    string    `gorm:"size:40" json:"category"`
	Gravity     int       `gorm:"default:1" json:"gravity"`
	Urgency     int       `gorm:"default:1" json:"urgency"`
	Tendency    int       `gorm:"default:1" json:"tendency"`
	Score       int       `gorm:"default:1" json:"score"`
	Level       string    `gorm:"size:20" json:"level"`
	Status      string    `gorm:"size:20;default:ABERTO" json:"status"`
	Response    string    `gorm:"type:text" json:"response"`
	Owner       string    `gorm:"size:120" json:"owner"`
	CreatedByID uint      `json:"created_by_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Action5W2H struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TenantID  uint      `gorm:"index;not null" json:"tenant_id"`
	ProjectID uint      `gorm:"index;not null" json:"project_id"`
	RiskID    *uint     `gorm:"index" json:"risk_id"`
	What      string    `gorm:"type:text" json:"what"`
	Why       string    `gorm:"type:text" json:"why"`
	Where     string    `gorm:"size:200" json:"where"`
	When      string    `gorm:"size:40" json:"when"`
	Who       string    `gorm:"size:160" json:"who"`
	How       string    `gorm:"type:text" json:"how"`
	HowMuch   string    `gorm:"size:80" json:"how_much"`
	Status    string    `gorm:"size:20;default:PLANEJADA" json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SwotItem struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	TenantID    uint      `gorm:"index;not null" json:"tenant_id"`
	ProjectID   uint      `gorm:"index;not null" json:"project_id"`
	Quadrant    string    `gorm:"size:20;not null" json:"quadrant"`
	Description string    `gorm:"type:text;not null" json:"description"`
	CreatedByID uint      `json:"created_by_id"`
	CreatedAt   time.Time `json:"created_at"`
}

type Lesson struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	TenantID    uint      `gorm:"index;not null" json:"tenant_id"`
	ProjectID   uint      `gorm:"index;not null" json:"project_id"`
	Project     *Project  `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Title       string    `gorm:"size:200;not null" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	Category    string    `gorm:"size:40" json:"category"`
	CreatedByID uint      `json:"created_by_id"`
	CreatedBy   *User     `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type Attachment struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	TenantID     uint       `gorm:"index;not null" json:"tenant_id"`
	ProjectID    uint       `gorm:"index;not null" json:"project_id"`
	ActivityID   *uint      `gorm:"index" json:"activity_id,omitempty"`
	Name         string     `gorm:"size:255;not null" json:"name"`
	StoredName   string     `gorm:"size:255;not null" json:"-"`
	MimeType     string     `gorm:"size:120" json:"mime_type"`
	Size         int64      `json:"size"`
	Category     string     `gorm:"size:60" json:"category"`
	Description  string     `gorm:"size:400" json:"description"`
	Version      int        `gorm:"default:1" json:"version"`
	ExpiresAt    *time.Time `json:"expires_at"`
	UploadedByID uint       `json:"uploaded_by_id"`
	UploadedBy   *User      `gorm:"foreignKey:UploadedByID" json:"uploaded_by,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

type Notification struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	TenantID  uint       `gorm:"index;not null" json:"tenant_id"`
	UserID    uint       `gorm:"index;not null" json:"user_id"`
	Title     string     `gorm:"size:200" json:"title"`
	Message   string     `gorm:"type:text" json:"message"`
	Type      string     `gorm:"size:40" json:"type"`
	Link      string     `gorm:"size:255" json:"link"`
	ReadAt    *time.Time `json:"read_at"`
	CreatedAt time.Time  `json:"created_at"`
}

type AuditLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TenantID  uint      `gorm:"index;not null" json:"tenant_id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	UserName  string    `gorm:"size:160" json:"user_name"`
	Action    string    `gorm:"size:60;index" json:"action"`
	Entity    string    `gorm:"size:40;index" json:"entity"`
	EntityID  uint      `gorm:"index" json:"entity_id"`
	Details   string    `gorm:"type:text" json:"details"`
	IP        string    `gorm:"size:60" json:"ip"`
	CreatedAt time.Time `json:"created_at"`
}

package handlers

import (
	"net/http"
	"strings"
	"time"

	"agora/backend/internal/models"
	"agora/backend/internal/service"

	"github.com/go-chi/chi/v5"
)

type publicProjectDTO struct {
	ID                     uint                 `json:"id"`
	Code                   string               `json:"code"`
	Name                   string               `json:"name"`
	Status                 string               `json:"status"`
	Priority               string               `json:"priority"`
	ResponsibleSecretariat *models.Secretariat  `json:"responsible_secretariat,omitempty"`
	Secretariats           []models.Secretariat `json:"secretariats,omitempty"`
	PlannedStart           *string              `json:"planned_start"`
	PlannedEnd             *string              `json:"planned_end"`
	RealEnd                *string              `json:"real_end"`
	BudgetPlanned          float64              `json:"budget_planned"`
	BudgetExecuted         float64              `json:"budget_executed"`
	Progress               float64              `json:"progress"`
	GovernmentPlan         bool                 `json:"government_plan"`
	GovernmentPlanDetail   string               `json:"government_plan_detail"`
	Justification          string               `json:"justification"`
	Objectives             string               `json:"objectives"`
	UpdatedAt              string               `json:"updated_at"`
}

func (h *Handler) PublicTransparency(w http.ResponseWriter, r *http.Request) {
	tenant, ok := h.publicTenantBySlug(w, chi.URLParam(r, "slug"))
	if !ok {
		return
	}
	_ = service.RefreshTenantProjectStatuses(h.DB, tenant.ID)
	q := h.DB.Preload("ResponsibleSecretariat").Preload("Secretariats").
		Where("tenant_id = ?", tenant.ID)
	if status := strings.TrimSpace(r.URL.Query().Get("status")); status != "" {
		q = q.Where("status = ?", status)
	}
	if secretariatID := queryUint(r, "secretariat_id"); secretariatID > 0 {
		sub := h.DB.Table("project_secretariats").Select("project_id").Where("secretariat_id = ?", secretariatID)
		q = q.Where("responsible_secretariat_id = ? OR id IN (?)", secretariatID, sub)
	}
	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		q = q.Where("lower(name) LIKE ? OR lower(code) LIKE ?", like, like)
	}
	var projects []models.Project
	if err := q.Order("updated_at desc").Limit(200).Find(&projects).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível carregar os projetos")
		return
	}
	service.FillProjectProgress(h.DB, projects)
	items := make([]publicProjectDTO, 0, len(projects))
	summary := map[string]int{"total": 0, "active": 0, "late": 0, "completed": 0, "awaiting_approval": 0}
	for i := range projects {
		project := &projects[i]
		items = append(items, toPublicProject(project))
		if project.Status == models.StatusCancelado {
			continue
		}
		summary["total"]++
		switch project.Status {
		case models.StatusEmAndamento, models.StatusEmAtraso, models.StatusNaoIniciado, models.StatusAguardandoAprovacao:
			summary["active"]++
		}
		if project.Status == models.StatusEmAtraso {
			summary["late"]++
		}
		if project.Status == models.StatusAguardandoAprovacao {
			summary["awaiting_approval"]++
		}
		if project.Status == models.StatusConcluido || project.Status == models.StatusConcluidoAtraso {
			summary["completed"]++
		}
	}
	var secretariats []models.Secretariat
	h.DB.Where("tenant_id = ? AND active = ?", tenant.ID, true).Order("name asc").Find(&secretariats)
	respond(w, http.StatusOK, map[string]any{
		"tenant":       publicTenant(tenant),
		"summary":      summary,
		"projects":     items,
		"secretariats": secretariats,
	})
}

func (h *Handler) PublicProjectDetail(w http.ResponseWriter, r *http.Request) {
	tenant, ok := h.publicTenantBySlug(w, chi.URLParam(r, "slug"))
	if !ok {
		return
	}
	var project models.Project
	if err := h.DB.Preload("ResponsibleSecretariat").Preload("Secretariats").
		Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), tenant.ID).
		First(&project).Error; err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	_ = service.RefreshProjectStatus(h.DB, project.ID)
	if err := h.DB.Preload("ResponsibleSecretariat").Preload("Secretariats").
		First(&project, project.ID).Error; err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	items := []models.Project{project}
	service.FillProjectProgress(h.DB, items)
	project = items[0]

	var activities []models.Activity
	h.DB.Where("project_id = ?", project.ID).Order("planned_start asc, id asc").Find(&activities)
	for i := range activities {
		activities[i].IsLate = service.IsActivityLate(&activities[i], time.Now())
	}
	var milestones []models.Milestone
	h.DB.Where("project_id = ?", project.ID).Order("due_date asc, id asc").Find(&milestones)
	var contracts []models.Contract
	h.DB.Preload("Supplier").Where("project_id = ?", project.ID).Order("id desc").Find(&contracts)
	var payments []models.Payment
	h.DB.Where("project_id = ?", project.ID).Order("paid_at desc").Find(&payments)
	var commitments []models.Commitment
	h.DB.Where("project_id = ?", project.ID).Order("id desc").Find(&commitments)

	respond(w, http.StatusOK, map[string]any{
		"tenant":      publicTenant(tenant),
		"project":     toPublicProject(&project),
		"activities":  activities,
		"milestones":  milestones,
		"contracts":   contracts,
		"payments":    payments,
		"commitments": commitments,
	})
}

func toPublicProject(project *models.Project) publicProjectDTO {
	return publicProjectDTO{
		ID: project.ID, Code: project.Code, Name: project.Name, Status: project.Status,
		Priority: project.Priority, ResponsibleSecretariat: project.ResponsibleSecretariat,
		Secretariats: project.Secretariats, PlannedStart: publicDate(project.PlannedStart),
		PlannedEnd: publicDate(project.PlannedEnd), RealEnd: publicDate(project.RealEnd),
		BudgetPlanned: project.BudgetPlanned, BudgetExecuted: project.BudgetExecuted,
		Progress: project.Progress, GovernmentPlan: project.GovernmentPlan,
		GovernmentPlanDetail: project.GovernmentPlanDetail, Justification: project.Justification,
		Objectives: project.Objectives, UpdatedAt: project.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func publicDate(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.Format("2006-01-02")
	return &formatted
}

func (h *Handler) publicTenantBySlug(w http.ResponseWriter, slug string) (*models.Tenant, bool) {
	var tenant models.Tenant
	if err := h.DB.Where("slug = ? AND active = ?", strings.ToLower(strings.TrimSpace(slug)), true).
		First(&tenant).Error; err != nil {
		fail(w, http.StatusNotFound, "prefeitura não encontrada")
		return nil, false
	}
	return &tenant, true
}

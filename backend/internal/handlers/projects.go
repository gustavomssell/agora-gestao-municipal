package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"
	"agora/backend/internal/service"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

var validStatuses = models.ProjectStatuses

var validPriorities = []string{
	models.PriorityBaixa, models.PriorityMedia, models.PriorityAlta, models.PriorityCritica,
}

type projectRequest struct {
	Name                     string  `json:"name"`
	Justification            string  `json:"justification"`
	Objectives               string  `json:"objectives"`
	Requirements             string  `json:"requirements"`
	RiskAssessment           string  `json:"risk_assessment"`
	GovernmentPlan           bool    `json:"government_plan"`
	GovernmentPlanDetail     string  `json:"government_plan_detail"`
	Priority                 string  `json:"priority"`
	ResponsibleSecretariatID uint    `json:"responsible_secretariat_id"`
	SecretariatIDs           []uint  `json:"secretariat_ids"`
	PlannedStart             *string `json:"planned_start"`
	PlannedEnd               *string `json:"planned_end"`
	BudgetPlanned            float64 `json:"budget_planned"`
	BudgetExecuted           float64 `json:"budget_executed"`
	DeadlineJustification    string  `json:"deadline_justification"`
	PPA                      string  `json:"ppa"`
	LDO                      string  `json:"ldo"`
	LOA                      string  `json:"loa"`
	BaselineStart            *string `json:"baseline_start"`
	BaselineEnd              *string `json:"baseline_end"`
	BaselineBudget           float64 `json:"baseline_budget"`
	TemplateID               uint    `json:"template_id"`
}

func (h *Handler) ListProjects(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	_ = service.RefreshTenantProjectStatuses(h.DB, user.TenantID)
	q := h.projectScope(user)

	window, err := requestPeriodWindow(r)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	q = applyProjectPeriod(q, window)

	search := strings.TrimSpace(r.URL.Query().Get("search"))
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		q = q.Where("(lower(projects.name) LIKE ? OR lower(projects.code) LIKE ?)", like, like)
	}
	if status := r.URL.Query().Get("status"); status != "" {
		statuses := strings.Split(status, ",")
		q = q.Where("projects.status IN ?", statuses)
	}
	if priority := r.URL.Query().Get("priority"); priority != "" {
		q = q.Where("projects.priority = ?", priority)
	}
	if secID := queryUint(r, "secretariat_id"); secID > 0 {
		sub := h.DB.Table("project_secretariats").Select("project_id").Where("secretariat_id = ?", secID)
		q = q.Where("(projects.responsible_secretariat_id = ? OR projects.id IN (?))", secID, sub)
	}
	if r.URL.Query().Get("overdue") == "true" {
		q = q.Where("projects.status IN ?", []string{models.StatusEmAtraso, models.StatusConcluidoAtraso})
	}
	if r.URL.Query().Get("include_canceled") != "true" {
		q = q.Where("projects.status NOT IN ?", []string{models.StatusCancelado})
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível carregar os projetos")
		return
	}

	page := queryInt(r, "page", 1)
	if page < 1 {
		page = 1
	}
	pageSize := queryInt(r, "page_size", 50)
	if pageSize < 1 || pageSize > 200 {
		pageSize = 50
	}

	sortKey := r.URL.Query().Get("sort")
	order := "projects.updated_at desc"
	switch sortKey {
	case "name":
		order = "projects.name asc"
	case "end":
		order = "projects.planned_end asc"
	case "start":
		order = "projects.planned_start asc"
	case "priority":
		order = "CASE projects.priority WHEN 'CRITICA' THEN 0 WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END asc"
	case "created":
		order = "projects.created_at desc"
	}

	var projects []models.Project
	if err := q.Preload("ResponsibleSecretariat").
		Preload("Secretariats").
		Preload("CreatedBy").
		Order(order).
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&projects).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível carregar os projetos")
		return
	}
	service.FillProjectProgress(h.DB, projects)

	if sortKey == "progress" {
		sort.SliceStable(projects, func(i, j int) bool { return projects[i].Progress > projects[j].Progress })
	}

	respond(w, http.StatusOK, map[string]any{
		"items":     projects,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *Handler) GetProject(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	id := parseID(chi.URLParam(r, "id"))
	if id == 0 {
		fail(w, http.StatusBadRequest, "projeto inválido")
		return
	}
	project, err := h.loadVisibleProject(user, id)
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	_ = service.RefreshProjectStatus(h.DB, project.ID)
	project, err = h.loadVisibleProject(user, id)
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	items := []models.Project{*project}
	service.FillProjectProgress(h.DB, items)
	project = &items[0]
	respond(w, http.StatusOK, map[string]any{
		"project": project,
		"permissions": map[string]bool{
			"can_edit":     canEditProject(user, project),
			"can_manage":   canManageProject(user, project),
			"can_transfer": canTransferProject(user, project),
			"can_delete":   user.IsAdmin(),
			"read_only":    user.IsGoverno(),
		},
	})
}

func (h *Handler) CreateProject(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	if !user.CanWrite() {
		fail(w, http.StatusForbidden, "seu perfil não pode cadastrar projetos")
		return
	}
	var req projectRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Justification = strings.TrimSpace(req.Justification)
	req.Objectives = strings.TrimSpace(req.Objectives)
	req.Requirements = strings.TrimSpace(req.Requirements)
	req.RiskAssessment = strings.TrimSpace(req.RiskAssessment)
	req.GovernmentPlanDetail = strings.TrimSpace(req.GovernmentPlanDetail)
	req.PPA = strings.TrimSpace(req.PPA)
	req.LDO = strings.TrimSpace(req.LDO)
	req.LOA = strings.TrimSpace(req.LOA)

	switch {
	case req.Name == "":
		fail(w, http.StatusBadRequest, "informe o nome do projeto")
		return
	case req.ResponsibleSecretariatID == 0:
		fail(w, http.StatusBadRequest, "informe a secretaria responsável")
		return
	case req.Justification == "" || req.Objectives == "" || req.Requirements == "" || req.RiskAssessment == "":
		fail(w, http.StatusBadRequest, "justificativa, objetivos, requisitos e avaliação de risco são obrigatórios")
		return
	case req.GovernmentPlan && req.GovernmentPlanDetail == "":
		fail(w, http.StatusBadRequest, "informe qual proposta do plano de governo o projeto atende")
		return
	}
	if !contains(validPriorities, req.Priority) {
		req.Priority = models.PriorityMedia
	}
	if req.BudgetPlanned < 0 || req.BudgetExecuted < 0 {
		fail(w, http.StatusBadRequest, "os valores de orçamento não podem ser negativos")
		return
	}
	if user.Role != models.RoleAdmin {
		if user.SecretariatID == nil || req.ResponsibleSecretariatID != *user.SecretariatID {
			fail(w, http.StatusForbidden, "você só pode cadastrar projetos da sua secretaria")
			return
		}
	}

	plannedStart, err := parseDateValue(req.PlannedStart)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	plannedEnd, err := parseDateValue(req.PlannedEnd)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	if plannedStart != nil && plannedEnd != nil && plannedEnd.Before(*plannedStart) {
		fail(w, http.StatusBadRequest, "o término previsto não pode ser anterior ao início previsto")
		return
	}
	baselineStart, err := parseDateValue(req.BaselineStart)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	baselineEnd, err := parseDateValue(req.BaselineEnd)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	if baselineStart == nil {
		baselineStart = plannedStart
	}
	if baselineEnd == nil {
		baselineEnd = plannedEnd
	}
	baselineBudget := req.BaselineBudget
	if baselineBudget == 0 {
		baselineBudget = req.BudgetPlanned
	}
	if baselineStart != nil && baselineEnd != nil && baselineEnd.Before(*baselineStart) {
		fail(w, http.StatusBadRequest, "a linha de base não pode terminar antes do início")
		return
	}

	secretariats, err := h.resolveSecretariats(user.TenantID, req.ResponsibleSecretariatID, req.SecretariatIDs)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}

	var template *models.ProjectTemplate
	var templateID *uint
	if req.TemplateID > 0 {
		var found models.ProjectTemplate
		if err := h.DB.Where("id = ? AND tenant_id = ? AND active = ?", req.TemplateID, user.TenantID, true).
			First(&found).Error; err != nil {
			fail(w, http.StatusBadRequest, "modelo de projeto inválido")
			return
		}
		template = &found
		templateID = &req.TemplateID
		if !contains(validPriorities, req.Priority) {
			req.Priority = template.Priority
		}
		if plannedStart == nil {
			start := time.Now()
			plannedStart = &start
		}
		if plannedEnd == nil {
			end := plannedStart.AddDate(0, 0, template.DurationDays)
			plannedEnd = &end
		}
		if baselineStart == nil {
			baselineStart = plannedStart
		}
		if baselineEnd == nil {
			baselineEnd = plannedEnd
		}
	}

	project := models.Project{
		TenantID:                 user.TenantID,
		Name:                     req.Name,
		Justification:            req.Justification,
		Objectives:               req.Objectives,
		Requirements:             req.Requirements,
		RiskAssessment:           req.RiskAssessment,
		GovernmentPlan:           req.GovernmentPlan,
		GovernmentPlanDetail:     req.GovernmentPlanDetail,
		Priority:                 req.Priority,
		Status:                   models.StatusNaoIniciado,
		ResponsibleSecretariatID: req.ResponsibleSecretariatID,
		PlannedStart:             plannedStart,
		PlannedEnd:               plannedEnd,
		BudgetPlanned:            req.BudgetPlanned,
		BudgetExecuted:           req.BudgetExecuted,
		PPA:                      req.PPA,
		LDO:                      req.LDO,
		LOA:                      req.LOA,
		BaselineStart:            baselineStart,
		BaselineEnd:              baselineEnd,
		BaselineBudget:           baselineBudget,
		TemplateID:               templateID,
		CreatedByID:              user.ID,
		Secretariats:             secretariats,
	}
	if err := h.DB.Create(&project).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar o projeto")
		return
	}
	code := fmt.Sprintf("PRJ-%d-%04d", time.Now().Year(), project.ID)
	_ = h.DB.Model(&project).Update("code", code).Error
	project.Code = code
	if template != nil {
		h.applyProjectTemplate(&project, template)
	}
	h.ensureApprovalChecklist(&project)
	h.ensureDocumentChecklist(&project)
	_ = service.RecomputeProject(h.DB, project.ID)

	for _, s := range secretariats {
		if s.ID != req.ResponsibleSecretariatID {
			h.notifySecretariat(user.TenantID, s.ID, "Novo projeto compartilhado",
				fmt.Sprintf("O projeto %s foi compartilhado com sua secretaria.", project.Name), "PROJETO", fmt.Sprintf("/projetos/%d", project.ID))
		}
	}
	h.audit(r, "PROJETO_CRIADO", "projeto", project.ID, fmt.Sprintf("Projeto %s criado", project.Code))

	created, _ := h.loadVisibleProject(user, project.ID)
	items := []models.Project{*created}
	service.FillProjectProgress(h.DB, items)
	respond(w, http.StatusCreated, map[string]any{"project": items[0]})
}

func (h *Handler) UpdateProject(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	id := parseID(chi.URLParam(r, "id"))
	project, err := h.loadVisibleProject(user, id)
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode editar este projeto")
		return
	}
	var req projectRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Justification = strings.TrimSpace(req.Justification)
	req.Objectives = strings.TrimSpace(req.Objectives)
	req.Requirements = strings.TrimSpace(req.Requirements)
	req.RiskAssessment = strings.TrimSpace(req.RiskAssessment)
	req.GovernmentPlanDetail = strings.TrimSpace(req.GovernmentPlanDetail)
	req.PPA = strings.TrimSpace(req.PPA)
	req.LDO = strings.TrimSpace(req.LDO)
	req.LOA = strings.TrimSpace(req.LOA)

	if req.Name == "" {
		fail(w, http.StatusBadRequest, "informe o nome do projeto")
		return
	}
	if !contains(validPriorities, req.Priority) {
		req.Priority = project.Priority
	}
	if req.BudgetPlanned < 0 || req.BudgetExecuted < 0 {
		fail(w, http.StatusBadRequest, "os valores de orçamento não podem ser negativos")
		return
	}
	if req.GovernmentPlan && req.GovernmentPlanDetail == "" {
		fail(w, http.StatusBadRequest, "informe qual proposta do plano de governo o projeto atende")
		return
	}

	if !user.IsAdmin() {
		if req.Justification != project.Justification || req.Objectives != project.Objectives ||
			req.Requirements != project.Requirements || req.RiskAssessment != project.RiskAssessment ||
			req.GovernmentPlan != project.GovernmentPlan || req.GovernmentPlanDetail != project.GovernmentPlanDetail {
			fail(w, http.StatusForbidden, "justificativa, objetivos, requisitos, avaliação de risco e plano de governo não podem ser alterados após o cadastro")
			return
		}
	}

	plannedStart, err := parseDateValue(req.PlannedStart)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	plannedEnd, err := parseDateValue(req.PlannedEnd)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	if plannedStart != nil && plannedEnd != nil && plannedEnd.Before(*plannedStart) {
		fail(w, http.StatusBadRequest, "o término previsto não pode ser anterior ao início previsto")
		return
	}
	baselineStart, err := parseDateValue(req.BaselineStart)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	baselineEnd, err := parseDateValue(req.BaselineEnd)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	if baselineStart == nil {
		baselineStart = project.BaselineStart
	}
	if baselineEnd == nil {
		baselineEnd = project.BaselineEnd
	}
	baselineBudget := req.BaselineBudget
	if baselineBudget == 0 {
		baselineBudget = project.BaselineBudget
	}
	if baselineStart != nil && baselineEnd != nil && baselineEnd.Before(*baselineStart) {
		fail(w, http.StatusBadRequest, "a linha de base não pode terminar antes do início")
		return
	}

	startChanged := dateString(project.PlannedStart) != dateString(plannedStart)
	endChanged := dateString(project.PlannedEnd) != dateString(plannedEnd)
	oldPlannedStart := dateString(project.PlannedStart)
	oldPlannedEnd := dateString(project.PlannedEnd)
	if (startChanged || endChanged) && strings.TrimSpace(req.DeadlineJustification) == "" {
		fail(w, http.StatusBadRequest, "informe a justificativa para alterar os prazos do projeto")
		return
	}

	secretariats, err := h.resolveSecretariats(user.TenantID, project.ResponsibleSecretariatID, req.SecretariatIDs)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}

	updates := map[string]any{
		"name":                   req.Name,
		"priority":               req.Priority,
		"planned_start":          plannedStart,
		"planned_end":            plannedEnd,
		"budget_planned":         req.BudgetPlanned,
		"budget_executed":        req.BudgetExecuted,
		"justification":          req.Justification,
		"objectives":             req.Objectives,
		"requirements":           req.Requirements,
		"risk_assessment":        req.RiskAssessment,
		"government_plan":        req.GovernmentPlan,
		"government_plan_detail": req.GovernmentPlanDetail,
		"ppa":                    req.PPA,
		"ldo":                    req.LDO,
		"loa":                    req.LOA,
		"baseline_start":         baselineStart,
		"baseline_end":           baselineEnd,
		"baseline_budget":        baselineBudget,
	}
	if err := h.DB.Model(project).Updates(updates).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível atualizar o projeto")
		return
	}
	if err := h.DB.Model(project).Association("Secretariats").Replace(secretariats); err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível atualizar as secretarias envolvidas")
		return
	}

	if startChanged {
		h.recordDeadlineChange(r, project, "projeto", project.ID, project.Name, "planned_start",
			oldPlannedStart, dateString(plannedStart), req.DeadlineJustification)
	}
	if endChanged {
		h.recordDeadlineChange(r, project, "projeto", project.ID, project.Name, "planned_end",
			oldPlannedEnd, dateString(plannedEnd), req.DeadlineJustification)
	}
	if startChanged || endChanged {
		h.notifyProjectInvolved(project, user.ID, "Prazo de projeto alterado",
			fmt.Sprintf("Os prazos do projeto %s foram atualizados. Justificativa: %s", project.Name, req.DeadlineJustification),
			"PRAZO", fmt.Sprintf("/projetos/%d", project.ID))
	}

	h.audit(r, "PROJETO_ATUALIZADO", "projeto", project.ID, "Dados do projeto atualizados")
	_ = service.RecomputeProject(h.DB, project.ID)

	updated, _ := h.loadVisibleProject(user, project.ID)
	items := []models.Project{*updated}
	service.FillProjectProgress(h.DB, items)
	respond(w, http.StatusOK, map[string]any{"project": items[0]})
}

func (h *Handler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	if !user.IsAdmin() {
		fail(w, http.StatusForbidden, "somente o administrador pode excluir projetos")
		return
	}
	id := parseID(chi.URLParam(r, "id"))
	project, err := h.loadVisibleProject(user, id)
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	if err := h.DB.Delete(project).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível excluir o projeto")
		return
	}
	h.audit(r, "PROJETO_EXCLUIDO", "projeto", project.ID, fmt.Sprintf("Projeto %s (%s) excluído", project.Name, project.Code))
	respond(w, http.StatusOK, map[string]string{"message": "projeto excluído"})
}

type statusRequest struct {
	Status string `json:"status"`
	Note   string `json:"note"`
}

func (h *Handler) ChangeProjectStatus(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	id := parseID(chi.URLParam(r, "id"))
	project, err := h.loadVisibleProject(user, id)
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode alterar o status")
		return
	}
	var req statusRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	switch req.Status {
	case models.StatusCancelado, models.StatusSuspenso:
	case models.StatusEmAndamento:
		if project.Status != models.StatusCancelado && project.Status != models.StatusSuspenso {
			fail(w, http.StatusBadRequest, "o projeto já está em andamento")
			return
		}
	default:
		fail(w, http.StatusBadRequest, "status inválido; use cancelar, suspender ou retomar")
		return
	}
	if err := h.DB.Model(project).Update("status", req.Status).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível alterar o status")
		return
	}
	if req.Status == models.StatusEmAndamento {
		_ = service.RecomputeProject(h.DB, project.ID)
	}
	h.audit(r, "STATUS_ALTERADO", "projeto", project.ID, fmt.Sprintf("Status alterado para %s. %s", req.Status, req.Note))
	h.notifyProjectInvolved(project, user.ID, "Status do projeto alterado",
		fmt.Sprintf("O projeto %s agora está como %s.", project.Name, req.Status), "STATUS", fmt.Sprintf("/projetos/%d", project.ID))
	respond(w, http.StatusOK, map[string]string{"message": "status atualizado"})
}

type transferRequest struct {
	ToSecretariatID uint   `json:"to_secretariat_id"`
	Note            string `json:"note"`
}

func (h *Handler) TransferProject(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	id := parseID(chi.URLParam(r, "id"))
	project, err := h.loadVisibleProject(user, id)
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	if !canTransferProject(user, project) {
		fail(w, http.StatusForbidden, "seu perfil não pode encaminhar este projeto")
		return
	}
	var req transferRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Note = strings.TrimSpace(req.Note)
	if req.ToSecretariatID == 0 || req.Note == "" {
		fail(w, http.StatusBadRequest, "informe a secretaria de destino e a justificativa do encaminhamento")
		return
	}
	if req.ToSecretariatID == project.ResponsibleSecretariatID {
		fail(w, http.StatusBadRequest, "o projeto já está com essa secretaria")
		return
	}
	involvedIDs := []uint{req.ToSecretariatID}
	for _, s := range project.Secretariats {
		involvedIDs = append(involvedIDs, s.ID)
	}
	secretariats, err := h.resolveSecretariats(user.TenantID, req.ToSecretariatID, involvedIDs)
	if err != nil {
		fail(w, http.StatusBadRequest, "secretaria de destino inválida")
		return
	}
	var target models.Secretariat
	if err := h.DB.Where("id = ? AND tenant_id = ? AND active = ?", req.ToSecretariatID, user.TenantID, true).First(&target).Error; err != nil {
		fail(w, http.StatusBadRequest, "secretaria de destino inválida")
		return
	}

	from := project.ResponsibleSecretariatID
	transfer := models.ProjectTransfer{
		TenantID:          user.TenantID,
		ProjectID:         project.ID,
		FromSecretariatID: &from,
		ToSecretariatID:   req.ToSecretariatID,
		ChangedByID:       user.ID,
		Note:              req.Note,
	}
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Project{}).
			Where("id = ? AND tenant_id = ?", project.ID, user.TenantID).
			Update("responsible_secretariat_id", req.ToSecretariatID).Error; err != nil {
			return err
		}
		targetProject := models.Project{ID: project.ID}
		if err := tx.Model(&targetProject).Association("Secretariats").Replace(secretariats); err != nil {
			return err
		}
		return tx.Create(&transfer).Error
	})
	if err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível encaminhar o projeto")
		return
	}
	h.audit(r, "PROJETO_ENCAMINHADO", "projeto", project.ID,
		fmt.Sprintf("Encaminhado para %s. Justificativa: %s", target.Name, req.Note))
	h.notifySecretariat(user.TenantID, req.ToSecretariatID, "Projeto recebido",
		fmt.Sprintf("O projeto %s foi encaminhado para sua secretaria.", project.Name), "TRANSFERENCIA", fmt.Sprintf("/projetos/%d", project.ID))
	respond(w, http.StatusOK, map[string]string{"message": "projeto encaminhado"})
}

func (h *Handler) ProjectHistory(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	id := parseID(chi.URLParam(r, "id"))
	project, err := h.loadVisibleProject(user, id)
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	var logs []models.AuditLog = []models.AuditLog{}
	logLimit := queryInt(r, "log_limit", 200)
	if logLimit < 1 || logLimit > 1000 {
		logLimit = 200
	}
	logQuery := h.DB.Where("tenant_id = ? AND entity = ? AND entity_id = ?", user.TenantID, "projeto", project.ID)
	var logsTotal int64
	logQuery.Model(&models.AuditLog{}).Count(&logsTotal)
	logQuery.Order("created_at desc").Limit(logLimit).Find(&logs)
	var changes []models.DeadlineChange = []models.DeadlineChange{}
	h.DB.Preload("ChangedBy").Where("project_id = ?", project.ID).Order("created_at desc").Find(&changes)
	var transfers []models.ProjectTransfer = []models.ProjectTransfer{}
	h.DB.Preload("FromSecretariat").Preload("ToSecretariat").Preload("ChangedBy").
		Where("project_id = ?", project.ID).Order("created_at desc").Find(&transfers)
	respond(w, http.StatusOK, map[string]any{
		"logs":             logs,
		"logs_total":       logsTotal,
		"deadline_changes": changes,
		"transfers":        transfers,
	})
}

func (h *Handler) Kanban(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	_ = service.RefreshTenantProjectStatuses(h.DB, user.TenantID)
	q := h.projectScope(user).
		Preload("ResponsibleSecretariat").
		Preload("Secretariats").
		Preload("CreatedBy").
		Where("projects.status NOT IN ?", []string{models.StatusCancelado, models.StatusSuspenso})

	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		q = q.Where("lower(projects.name) LIKE ?", like)
	}
	if secID := queryUint(r, "secretariat_id"); secID > 0 {
		sub := h.DB.Table("project_secretariats").Select("project_id").Where("secretariat_id = ?", secID)
		q = q.Where("(projects.responsible_secretariat_id = ? OR projects.id IN (?))", secID, sub)
	}
	if priority := r.URL.Query().Get("priority"); priority != "" {
		q = q.Where("projects.priority = ?", priority)
	}
	var projects []models.Project
	if err := q.Order("projects.planned_end asc").Find(&projects).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível carregar o quadro")
		return
	}
	service.FillProjectProgress(h.DB, projects)

	columns := []map[string]any{
		{"key": "nao_iniciado", "title": "Não iniciado", "items": []models.Project{}},
		{"key": "em_andamento", "title": "Em andamento", "items": []models.Project{}},
		{"key": "aguardando_aprovacao", "title": "Aguardando aprovação", "items": []models.Project{}},
		{"key": "concluido", "title": "Concluído", "items": []models.Project{}},
	}
	for _, p := range projects {
		idx := 0
		switch p.Status {
		case models.StatusEmAndamento, models.StatusEmAtraso:
			idx = 1
		case models.StatusAguardandoAprovacao:
			idx = 2
		case models.StatusConcluido, models.StatusConcluidoAtraso:
			idx = 3
		}
		items := columns[idx]["items"].([]models.Project)
		columns[idx]["items"] = append(items, p)
	}
	respond(w, http.StatusOK, map[string]any{"columns": columns})
}

func (h *Handler) Gantt(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	_ = service.RefreshTenantProjectStatuses(h.DB, user.TenantID)
	var projects []models.Project
	q := h.projectScope(user).Preload("ResponsibleSecretariat").
		Where("projects.status NOT IN ?", []string{models.StatusCancelado}).
		Order("projects.planned_start asc")
	if secID := queryUint(r, "secretariat_id"); secID > 0 {
		q = q.Where("projects.responsible_secretariat_id = ?", secID)
	}
	if err := q.Find(&projects).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível carregar o cronograma")
		return
	}
	service.FillProjectProgress(h.DB, projects)
	respond(w, http.StatusOK, map[string]any{"items": projects, "total": len(projects)})
}

func (h *Handler) resolveSecretariats(tenantID, responsibleID uint, ids []uint) ([]models.Secretariat, error) {
	unique := map[uint]bool{responsibleID: true}
	for _, id := range ids {
		if id > 0 {
			unique[id] = true
		}
	}
	all := make([]uint, 0, len(unique))
	for id := range unique {
		all = append(all, id)
	}
	var secretariats []models.Secretariat
	if err := h.DB.Where("tenant_id = ? AND active = ? AND id IN ?", tenantID, true, all).Find(&secretariats).Error; err != nil {
		return nil, fmt.Errorf("não foi possível validar as secretarias")
	}
	if len(secretariats) != len(all) {
		return nil, fmt.Errorf("uma ou mais secretarias são inválidas")
	}
	return secretariats, nil
}

func (h *Handler) recordDeadlineChange(r *http.Request, project *models.Project, entityType string, entityID uint, name, field, oldValue, newValue, justification string) {
	user := middleware.CurrentUser(r)
	_ = h.DB.Create(&models.DeadlineChange{
		TenantID:      project.TenantID,
		ProjectID:     project.ID,
		EntityType:    entityType,
		EntityID:      entityID,
		EntityName:    name,
		Field:         field,
		OldValue:      oldValue,
		NewValue:      newValue,
		Justification: justification,
		ChangedByID:   user.ID,
	}).Error
	h.audit(r, "PRAZO_ALTERADO", "projeto", project.ID,
		fmt.Sprintf("Prazo de %s alterado: %s de %s para %s. Justificativa: %s", name, field, oldValue, newValue, justification))
}

func (h *Handler) applyProjectTemplate(project *models.Project, template *models.ProjectTemplate) {
	type templateActivity struct {
		Title        string `json:"title"`
		Description  string `json:"description"`
		DurationDays int    `json:"duration_days"`
	}
	var items []templateActivity
	if err := json.Unmarshal([]byte(template.Activities), &items); err != nil || len(items) == 0 {
		return
	}
	cursor := time.Now()
	if project.PlannedStart != nil {
		cursor = *project.PlannedStart
	}
	for i, item := range items {
		item.Title = strings.TrimSpace(item.Title)
		if item.Title == "" {
			continue
		}
		days := item.DurationDays
		if days <= 0 {
			days = 7
		}
		start := cursor
		end := start.AddDate(0, 0, days)
		activity := models.Activity{
			TenantID: project.TenantID, ProjectID: project.ID, Title: item.Title,
			Description: strings.TrimSpace(item.Description), Status: models.ActivityNaoIniciada,
			PlannedStart: &start, PlannedEnd: &end, Order: i,
		}
		h.DB.Create(&activity)
		cursor = end
	}
}

func parseID(s string) uint {
	var id uint
	_, err := fmt.Sscanf(s, "%d", &id)
	if err != nil {
		return 0
	}
	return id
}

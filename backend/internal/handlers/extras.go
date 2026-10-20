package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"

	"github.com/go-chi/chi/v5"
)

type riskRequest struct {
	Description string `json:"description"`
	Category    string `json:"category"`
	Gravity     int    `json:"gravity"`
	Urgency     int    `json:"urgency"`
	Tendency    int    `json:"tendency"`
	Status      string `json:"status"`
	Response    string `json:"response"`
	Owner       string `json:"owner"`
}

func gutLevel(score int) string {
	switch {
	case score >= 100:
		return "CRITICO"
	case score >= 60:
		return "ALTO"
	case score >= 30:
		return "MEDIO"
	default:
		return "BAIXO"
	}
}

func (h *Handler) ListRisks(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	var risks []models.Risk
	h.DB.Where("project_id = ?", project.ID).Order("score desc, id desc").Find(&risks)
	respond(w, http.StatusOK, map[string]any{"items": risks})
}

func (h *Handler) CreateRisk(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode registrar riscos")
		return
	}
	var req riskRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Description = strings.TrimSpace(req.Description)
	if req.Description == "" {
		fail(w, http.StatusBadRequest, "descreva o risco")
		return
	}
	if !validScale(req.Gravity) || !validScale(req.Urgency) || !validScale(req.Tendency) {
		fail(w, http.StatusBadRequest, "gravidade, urgência e tendência devem estar entre 1 e 5")
		return
	}
	risk := models.Risk{
		TenantID:    user.TenantID,
		ProjectID:   project.ID,
		Description: req.Description,
		Category:    strings.TrimSpace(req.Category),
		Gravity:     req.Gravity,
		Urgency:     req.Urgency,
		Tendency:    req.Tendency,
		Score:       req.Gravity * req.Urgency * req.Tendency,
		Response:    strings.TrimSpace(req.Response),
		Owner:       strings.TrimSpace(req.Owner),
		Status:      normalizeRiskStatus(req.Status),
		CreatedByID: user.ID,
	}
	risk.Level = gutLevel(risk.Score)
	if err := h.DB.Create(&risk).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível registrar o risco")
		return
	}
	h.audit(r, "RISCO_CRIADO", "projeto", project.ID, fmt.Sprintf("Risco \"%s\" criado (GUT %d)", risk.Description, risk.Score))
	respond(w, http.StatusCreated, map[string]any{"risk": risk})
}

func (h *Handler) UpdateRisk(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	risk, project, err := h.loadRiskForWrite(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusForbidden, err.Error())
		return
	}
	var req riskRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Description = strings.TrimSpace(req.Description)
	if req.Description == "" {
		fail(w, http.StatusBadRequest, "descreva o risco")
		return
	}
	if !validScale(req.Gravity) || !validScale(req.Urgency) || !validScale(req.Tendency) {
		fail(w, http.StatusBadRequest, "gravidade, urgência e tendência devem estar entre 1 e 5")
		return
	}
	risk.Description = req.Description
	risk.Category = strings.TrimSpace(req.Category)
	risk.Gravity = req.Gravity
	risk.Urgency = req.Urgency
	risk.Tendency = req.Tendency
	risk.Score = req.Gravity * req.Urgency * req.Tendency
	risk.Level = gutLevel(risk.Score)
	risk.Response = strings.TrimSpace(req.Response)
	risk.Owner = strings.TrimSpace(req.Owner)
	risk.Status = normalizeRiskStatus(req.Status)
	if err := h.DB.Save(risk).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível atualizar o risco")
		return
	}
	h.audit(r, "RISCO_ATUALIZADO", "projeto", project.ID, fmt.Sprintf("Risco \"%s\" atualizado (GUT %d)", risk.Description, risk.Score))
	respond(w, http.StatusOK, map[string]any{"risk": risk})
}

func (h *Handler) DeleteRisk(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	risk, project, err := h.loadRiskForWrite(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusForbidden, err.Error())
		return
	}
	h.DB.Model(&models.Action5W2H{}).Where("risk_id = ?", risk.ID).Update("risk_id", nil)
	if err := h.DB.Delete(risk).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível remover o risco")
		return
	}
	h.audit(r, "RISCO_EXCLUIDO", "projeto", project.ID, fmt.Sprintf("Risco \"%s\" excluído", risk.Description))
	respond(w, http.StatusOK, map[string]string{"message": "risco removido"})
}

func (h *Handler) loadRiskForWrite(user *models.User, id uint) (*models.Risk, *models.Project, error) {
	var risk models.Risk
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, user.TenantID).First(&risk).Error; err != nil {
		return nil, nil, fmt.Errorf("risco não encontrado")
	}
	project, err := h.loadVisibleProject(user, risk.ProjectID)
	if err != nil {
		return nil, nil, fmt.Errorf("risco não encontrado")
	}
	if !canEditProject(user, project) {
		return nil, nil, fmt.Errorf("somente a secretaria responsável pode editar riscos")
	}
	return &risk, project, nil
}

func validScale(v int) bool { return v >= 1 && v <= 5 }

func normalizeRiskStatus(s string) string {
	switch s {
	case "MITIGADO", "ENCERRADO", "ABERTO":
		return s
	default:
		return "ABERTO"
	}
}

type actionRequest struct {
	RiskID  *uint  `json:"risk_id"`
	What    string `json:"what"`
	Why     string `json:"why"`
	Where   string `json:"where"`
	When    string `json:"when"`
	Who     string `json:"who"`
	How     string `json:"how"`
	HowMuch string `json:"how_much"`
	Status  string `json:"status"`
}

func (h *Handler) ListActions(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	var actions []models.Action5W2H
	h.DB.Where("project_id = ?", project.ID).Order("id asc").Find(&actions)
	respond(w, http.StatusOK, map[string]any{"items": actions})
}

func (h *Handler) CreateAction(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode criar planos de ação")
		return
	}
	var req actionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.What) == "" || strings.TrimSpace(req.Why) == "" || strings.TrimSpace(req.How) == "" {
		fail(w, http.StatusBadRequest, "o quê, por quê e como são obrigatórios")
		return
	}
	if req.RiskID != nil {
		var count int64
		h.DB.Model(&models.Risk{}).Where("id = ? AND project_id = ?", *req.RiskID, project.ID).Count(&count)
		if count == 0 {
			fail(w, http.StatusBadRequest, "risco vinculado inválido")
			return
		}
	}
	action := models.Action5W2H{
		TenantID:  user.TenantID,
		ProjectID: project.ID,
		RiskID:    req.RiskID,
		What:      strings.TrimSpace(req.What),
		Why:       strings.TrimSpace(req.Why),
		Where:     strings.TrimSpace(req.Where),
		When:      strings.TrimSpace(req.When),
		Who:       strings.TrimSpace(req.Who),
		How:       strings.TrimSpace(req.How),
		HowMuch:   strings.TrimSpace(req.HowMuch),
		Status:    normalizeActionStatus(req.Status),
	}
	if err := h.DB.Create(&action).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar o plano de ação")
		return
	}
	h.audit(r, "ACAO_CRIADA", "projeto", project.ID, fmt.Sprintf("Plano 5W2H \"%s\" criado", action.What))
	respond(w, http.StatusCreated, map[string]any{"action": action})
}

func (h *Handler) UpdateAction(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	action, project, err := h.loadActionForWrite(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusForbidden, err.Error())
		return
	}
	var req actionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.What) == "" || strings.TrimSpace(req.Why) == "" || strings.TrimSpace(req.How) == "" {
		fail(w, http.StatusBadRequest, "o quê, por quê e como são obrigatórios")
		return
	}
	if req.RiskID != nil {
		var count int64
		h.DB.Model(&models.Risk{}).Where("id = ? AND project_id = ?", *req.RiskID, project.ID).Count(&count)
		if count == 0 {
			fail(w, http.StatusBadRequest, "risco vinculado inválido")
			return
		}
	}
	action.RiskID = req.RiskID
	action.What = strings.TrimSpace(req.What)
	action.Why = strings.TrimSpace(req.Why)
	action.Where = strings.TrimSpace(req.Where)
	action.When = strings.TrimSpace(req.When)
	action.Who = strings.TrimSpace(req.Who)
	action.How = strings.TrimSpace(req.How)
	action.HowMuch = strings.TrimSpace(req.HowMuch)
	action.Status = normalizeActionStatus(req.Status)
	if err := h.DB.Save(action).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível atualizar o plano de ação")
		return
	}
	h.audit(r, "ACAO_ATUALIZADA", "projeto", project.ID, fmt.Sprintf("Plano 5W2H \"%s\" atualizado", action.What))
	respond(w, http.StatusOK, map[string]any{"action": action})
}

func (h *Handler) DeleteAction(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	action, project, err := h.loadActionForWrite(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusForbidden, err.Error())
		return
	}
	if err := h.DB.Delete(action).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível remover o plano de ação")
		return
	}
	h.audit(r, "ACAO_EXCLUIDA", "projeto", project.ID, fmt.Sprintf("Plano 5W2H \"%s\" excluído", action.What))
	respond(w, http.StatusOK, map[string]string{"message": "plano de ação removido"})
}

func (h *Handler) loadActionForWrite(user *models.User, id uint) (*models.Action5W2H, *models.Project, error) {
	var action models.Action5W2H
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, user.TenantID).First(&action).Error; err != nil {
		return nil, nil, fmt.Errorf("plano de ação não encontrado")
	}
	project, err := h.loadVisibleProject(user, action.ProjectID)
	if err != nil {
		return nil, nil, fmt.Errorf("plano de ação não encontrado")
	}
	if !canEditProject(user, project) {
		return nil, nil, fmt.Errorf("somente a secretaria responsável pode editar planos de ação")
	}
	return &action, project, nil
}

func normalizeActionStatus(s string) string {
	switch s {
	case "PLANEJADA", "EM_EXECUCAO", "CONCLUIDA", "CANCELADA":
		return s
	default:
		return "PLANEJADA"
	}
}

type swotRequest struct {
	Quadrant    string `json:"quadrant"`
	Description string `json:"description"`
}

func (h *Handler) ListSwot(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	var items []models.SwotItem
	h.DB.Where("project_id = ?", project.ID).Order("id asc").Find(&items)
	respond(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) CreateSwot(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode editar o SWOT")
		return
	}
	var req swotRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if !contains([]string{models.SwotForca, models.SwotFraqueza, models.SwotOportunidade, models.SwotAmeaca}, req.Quadrant) {
		fail(w, http.StatusBadRequest, "quadrante inválido")
		return
	}
	if strings.TrimSpace(req.Description) == "" {
		fail(w, http.StatusBadRequest, "descreva o item")
		return
	}
	item := models.SwotItem{
		TenantID:    user.TenantID,
		ProjectID:   project.ID,
		Quadrant:    req.Quadrant,
		Description: strings.TrimSpace(req.Description),
		CreatedByID: user.ID,
	}
	if err := h.DB.Create(&item).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível adicionar o item")
		return
	}
	h.audit(r, "SWOT_ITEM_CRIADO", "projeto", project.ID, fmt.Sprintf("Item SWOT (%s) adicionado", item.Quadrant))
	respond(w, http.StatusCreated, map[string]any{"item": item})
}

func (h *Handler) DeleteSwot(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var item models.SwotItem
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).First(&item).Error; err != nil {
		fail(w, http.StatusNotFound, "item não encontrado")
		return
	}
	project, err := h.loadVisibleProject(user, item.ProjectID)
	if err != nil || !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode editar o SWOT")
		return
	}
	if err := h.DB.Delete(&item).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível remover o item")
		return
	}
	h.audit(r, "SWOT_ITEM_EXCLUIDO", "projeto", project.ID, "Item SWOT removido")
	respond(w, http.StatusOK, map[string]string{"message": "item removido"})
}

type lessonRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

func (h *Handler) ListProjectLessons(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	var items []models.Lesson
	h.DB.Preload("CreatedBy").Where("project_id = ?", project.ID).Order("created_at desc").Find(&items)
	respond(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) GlobalLessons(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	scope := h.projectScope(user)
	var projectIDs []uint
	scope.Pluck("projects.id", &projectIDs)
	if len(projectIDs) == 0 {
		respond(w, http.StatusOK, map[string]any{"items": []models.Lesson{}, "total": 0})
		return
	}
	q := h.DB.Where("project_id in ?", projectIDs)
	if projectID := queryUint(r, "project_id"); projectID > 0 {
		q = q.Where("project_id = ?", projectID)
	}
	if category := strings.TrimSpace(r.URL.Query().Get("category")); category != "" {
		q = q.Where("category = ?", category)
	}
	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		q = q.Where("(lower(title) LIKE ? OR lower(description) LIKE ?)", like, like)
	}
	if secID := queryUint(r, "secretariat_id"); secID > 0 {
		ids := h.projectIDsForSecretariat(user.TenantID, secID)
		q = q.Where("project_id in ?", ids)
	}
	var items []models.Lesson
	q.Preload("Project").Preload("Project.ResponsibleSecretariat").Preload("CreatedBy").
		Order("created_at desc").Find(&items)
	respond(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (h *Handler) CreateLesson(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode registrar lições")
		return
	}
	var req lessonRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Description) == "" {
		fail(w, http.StatusBadRequest, "informe o título e a descrição da lição")
		return
	}
	lesson := models.Lesson{
		TenantID:    user.TenantID,
		ProjectID:   project.ID,
		Title:       strings.TrimSpace(req.Title),
		Description: strings.TrimSpace(req.Description),
		Category:    strings.TrimSpace(req.Category),
		CreatedByID: user.ID,
	}
	if err := h.DB.Create(&lesson).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível registrar a lição")
		return
	}
	h.audit(r, "LICAO_CRIADA", "projeto", project.ID, fmt.Sprintf("Lição \"%s\" registrada", lesson.Title))
	h.DB.Preload("CreatedBy").First(&lesson, lesson.ID)
	respond(w, http.StatusCreated, map[string]any{"lesson": lesson})
}

func (h *Handler) DeleteLesson(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var lesson models.Lesson
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).First(&lesson).Error; err != nil {
		fail(w, http.StatusNotFound, "lição não encontrada")
		return
	}
	project, err := h.loadVisibleProject(user, lesson.ProjectID)
	if err != nil {
		fail(w, http.StatusNotFound, "lição não encontrada")
		return
	}
	if lesson.CreatedByID != user.ID && !user.IsAdmin() && !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "sem permissão para remover esta lição")
		return
	}
	if err := h.DB.Delete(&lesson).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível remover a lição")
		return
	}
	h.audit(r, "LICAO_EXCLUIDA", "projeto", project.ID, fmt.Sprintf("Lição \"%s\" removida", lesson.Title))
	respond(w, http.StatusOK, map[string]string{"message": "lição removida"})
}

func (h *Handler) projectIDsForSecretariat(tenantID, secretariatID uint) []uint {
	sub := h.DB.Table("project_secretariats").Select("project_id").Where("secretariat_id = ?", secretariatID)
	var ids []uint
	h.DB.Model(&models.Project{}).
		Where("tenant_id = ? AND (responsible_secretariat_id = ? OR id IN (?))", tenantID, secretariatID, sub).
		Pluck("id", &ids)
	return ids
}

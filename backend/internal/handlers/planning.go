package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"

	"github.com/go-chi/chi/v5"
)

type dependencyDTO struct {
	ID               uint   `json:"id"`
	ProjectID        uint   `json:"project_id"`
	PredecessorID    uint   `json:"predecessor_id"`
	PredecessorTitle string `json:"predecessor_title"`
	SuccessorID      uint   `json:"successor_id"`
	SuccessorTitle   string `json:"successor_title"`
}

func (h *Handler) ListDependencies(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	var items []models.ActivityDependency
	h.DB.Where("project_id = ?", project.ID).Order("id asc").Find(&items)
	titles := map[uint]string{}
	var activities []models.Activity
	h.DB.Where("project_id = ?", project.ID).Find(&activities)
	for _, activity := range activities {
		titles[activity.ID] = activity.Title
	}
	out := make([]dependencyDTO, 0, len(items))
	for _, item := range items {
		out = append(out, dependencyDTO{
			ID: item.ID, ProjectID: item.ProjectID,
			PredecessorID: item.PredecessorID, PredecessorTitle: titles[item.PredecessorID],
			SuccessorID: item.SuccessorID, SuccessorTitle: titles[item.SuccessorID],
		})
	}
	respond(w, http.StatusOK, map[string]any{
		"items": out, "can_edit": canEditProject(user, project) && user.HasPermission(models.PermPlanningEdit),
	})
}

type dependencyRequest struct {
	PredecessorID uint `json:"predecessor_id"`
	SuccessorID   uint `json:"successor_id"`
}

func (h *Handler) CreateDependency(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, ok := h.planningProject(w, r, user)
	if !ok {
		return
	}
	var req dependencyRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.PredecessorID == 0 || req.SuccessorID == 0 || req.PredecessorID == req.SuccessorID {
		fail(w, http.StatusBadRequest, "selecione atividades diferentes")
		return
	}
	var count int64
	h.DB.Model(&models.Activity{}).Where("project_id = ? AND id IN ?", project.ID, []uint{req.PredecessorID, req.SuccessorID}).Count(&count)
	if count != 2 {
		fail(w, http.StatusBadRequest, "atividade inválida")
		return
	}
	var successor models.Activity
	h.DB.Where("project_id = ? AND id = ?", project.ID, req.SuccessorID).First(&successor)
	if successor.RealStart != nil || successor.Status == models.ActivityEmAndamento ||
		successor.Status == models.ActivityEmAtraso || successor.Status == models.ActivityConcluida ||
		successor.Status == models.ActivityConcluidaAtraso {
		fail(w, http.StatusBadRequest, "não é possível criar dependência para atividade já iniciada")
		return
	}
	h.DB.Model(&models.ActivityDependency{}).
		Where("project_id = ? AND predecessor_id = ? AND successor_id = ?", project.ID, req.PredecessorID, req.SuccessorID).
		Count(&count)
	if count > 0 {
		fail(w, http.StatusBadRequest, "essa dependência já existe")
		return
	}
	if h.dependencyWouldCycle(project.ID, req.PredecessorID, req.SuccessorID) {
		fail(w, http.StatusBadRequest, "a dependência criaria um ciclo")
		return
	}
	item := models.ActivityDependency{
		TenantID: user.TenantID, ProjectID: project.ID,
		PredecessorID: req.PredecessorID, SuccessorID: req.SuccessorID,
	}
	if err := h.DB.Create(&item).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar a dependência")
		return
	}
	h.audit(r, "DEPENDENCIA_CRIADA", "projeto", project.ID, "Dependência entre atividades criada")
	respond(w, http.StatusCreated, map[string]any{"dependency": item})
}

func (h *Handler) DeleteDependency(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var item models.ActivityDependency
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&item).Error; err != nil {
		fail(w, http.StatusNotFound, "dependência não encontrada")
		return
	}
	project, ok := h.planningProjectFor(w, r, user, item.ProjectID)
	if !ok {
		return
	}
	h.DB.Delete(&item)
	h.audit(r, "DEPENDENCIA_EXCLUIDA", "projeto", project.ID, "Dependência entre atividades removida")
	respond(w, http.StatusOK, map[string]string{"message": "dependência removida"})
}

func (h *Handler) dependencyWouldCycle(projectID, predecessorID, successorID uint) bool {
	var items []models.ActivityDependency
	h.DB.Where("project_id = ?", projectID).Find(&items)
	graph := map[uint][]uint{}
	for _, item := range items {
		graph[item.PredecessorID] = append(graph[item.PredecessorID], item.SuccessorID)
	}
	graph[predecessorID] = append(graph[predecessorID], successorID)
	visited := map[uint]bool{}
	var walk func(uint) bool
	walk = func(node uint) bool {
		if node == predecessorID {
			return true
		}
		if visited[node] {
			return false
		}
		visited[node] = true
		for _, next := range graph[node] {
			if walk(next) {
				return true
			}
		}
		return false
	}
	return walk(successorID)
}

type milestoneRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	DueDate     *string `json:"due_date"`
	Status      string  `json:"status"`
}

func (h *Handler) ListMilestones(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	var items []models.Milestone
	h.DB.Where("project_id = ?", project.ID).Order("due_date asc, id asc").Find(&items)
	respond(w, http.StatusOK, map[string]any{
		"items": items, "can_edit": canEditProject(user, project) && user.HasPermission(models.PermPlanningEdit),
	})
}

func (h *Handler) CreateMilestone(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, ok := h.planningProject(w, r, user)
	if !ok {
		return
	}
	var req milestoneRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		fail(w, http.StatusBadRequest, "informe o nome do marco")
		return
	}
	due, err := parseDateValue(req.DueDate)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	item := models.Milestone{
		TenantID: user.TenantID, ProjectID: project.ID, Name: strings.TrimSpace(req.Name),
		Description: strings.TrimSpace(req.Description), DueDate: due, Status: normalizeMilestoneStatus(req.Status),
	}
	if item.Status == "CONCLUIDO" {
		now := time.Now()
		item.CompletedAt = &now
	}
	if err := h.DB.Create(&item).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar o marco")
		return
	}
	h.audit(r, "MARCO_CRIADO", "projeto", project.ID, fmt.Sprintf("Marco \"%s\" criado", item.Name))
	respond(w, http.StatusCreated, map[string]any{"milestone": item})
}

func (h *Handler) UpdateMilestone(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var item models.Milestone
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&item).Error; err != nil {
		fail(w, http.StatusNotFound, "marco não encontrado")
		return
	}
	project, ok := h.planningProjectFor(w, r, user, item.ProjectID)
	if !ok {
		return
	}
	var req milestoneRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		fail(w, http.StatusBadRequest, "informe o nome do marco")
		return
	}
	due, err := parseDateValue(req.DueDate)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	status := normalizeMilestoneStatus(req.Status)
	var completedAt *time.Time
	if status == "CONCLUIDO" {
		now := time.Now()
		completedAt = &now
		if item.CompletedAt != nil {
			completedAt = item.CompletedAt
		}
	}
	h.DB.Model(&item).Updates(map[string]any{
		"name": strings.TrimSpace(req.Name), "description": strings.TrimSpace(req.Description),
		"due_date": due, "status": status, "completed_at": completedAt,
	})
	h.audit(r, "MARCO_ATUALIZADO", "projeto", project.ID, fmt.Sprintf("Marco \"%s\" atualizado", item.Name))
	respond(w, http.StatusOK, map[string]any{"milestone": item})
}

func (h *Handler) DeleteMilestone(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var item models.Milestone
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&item).Error; err != nil {
		fail(w, http.StatusNotFound, "marco não encontrado")
		return
	}
	project, ok := h.planningProjectFor(w, r, user, item.ProjectID)
	if !ok {
		return
	}
	h.DB.Delete(&item)
	h.audit(r, "MARCO_EXCLUIDO", "projeto", project.ID, fmt.Sprintf("Marco \"%s\" excluído", item.Name))
	respond(w, http.StatusOK, map[string]string{"message": "marco removido"})
}

type indicatorRequest struct {
	Name    string  `json:"name"`
	Unit    string  `json:"unit"`
	Target  float64 `json:"target"`
	Current float64 `json:"current"`
	Notes   string  `json:"notes"`
}

func (h *Handler) ListIndicators(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	var items []models.ProjectIndicator
	h.DB.Where("project_id = ?", project.ID).Order("id asc").Find(&items)
	respond(w, http.StatusOK, map[string]any{
		"items": items, "can_edit": canEditProject(user, project) && user.HasPermission(models.PermPlanningEdit),
	})
}

func (h *Handler) CreateIndicator(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, ok := h.planningProject(w, r, user)
	if !ok {
		return
	}
	var req indicatorRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		fail(w, http.StatusBadRequest, "informe o nome do indicador")
		return
	}
	item := models.ProjectIndicator{
		TenantID: user.TenantID, ProjectID: project.ID, Name: strings.TrimSpace(req.Name),
		Unit: strings.TrimSpace(req.Unit), Target: req.Target, Current: req.Current,
		Notes: strings.TrimSpace(req.Notes),
	}
	if err := h.DB.Create(&item).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar o indicador")
		return
	}
	h.audit(r, "INDICADOR_CRIADO", "projeto", project.ID, fmt.Sprintf("Indicador \"%s\" criado", item.Name))
	respond(w, http.StatusCreated, map[string]any{"indicator": item})
}

func (h *Handler) UpdateIndicator(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var item models.ProjectIndicator
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&item).Error; err != nil {
		fail(w, http.StatusNotFound, "indicador não encontrado")
		return
	}
	project, ok := h.planningProjectFor(w, r, user, item.ProjectID)
	if !ok {
		return
	}
	var req indicatorRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		fail(w, http.StatusBadRequest, "informe o nome do indicador")
		return
	}
	h.DB.Model(&item).Updates(map[string]any{
		"name": strings.TrimSpace(req.Name), "unit": strings.TrimSpace(req.Unit),
		"target": req.Target, "current": req.Current, "notes": strings.TrimSpace(req.Notes),
	})
	h.audit(r, "INDICADOR_ATUALIZADO", "projeto", project.ID, fmt.Sprintf("Indicador \"%s\" atualizado", item.Name))
	respond(w, http.StatusOK, map[string]any{"indicator": item})
}

func (h *Handler) DeleteIndicator(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var item models.ProjectIndicator
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&item).Error; err != nil {
		fail(w, http.StatusNotFound, "indicador não encontrado")
		return
	}
	project, ok := h.planningProjectFor(w, r, user, item.ProjectID)
	if !ok {
		return
	}
	h.DB.Delete(&item)
	h.audit(r, "INDICADOR_EXCLUIDO", "projeto", project.ID, fmt.Sprintf("Indicador \"%s\" excluído", item.Name))
	respond(w, http.StatusOK, map[string]string{"message": "indicador removido"})
}

func (h *Handler) planningProject(w http.ResponseWriter, r *http.Request, user *models.User) (*models.Project, bool) {
	if !user.HasPermission(models.PermPlanningEdit) {
		fail(w, http.StatusForbidden, "seu perfil não pode editar o planejamento")
		return nil, false
	}
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return nil, false
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode editar o planejamento")
		return nil, false
	}
	return project, true
}

func (h *Handler) planningProjectFor(w http.ResponseWriter, r *http.Request, user *models.User, projectID uint) (*models.Project, bool) {
	if !user.HasPermission(models.PermPlanningEdit) {
		fail(w, http.StatusForbidden, "seu perfil não pode editar o planejamento")
		return nil, false
	}
	project, err := h.loadVisibleProject(user, projectID)
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return nil, false
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode editar o planejamento")
		return nil, false
	}
	return project, true
}

func normalizeMilestoneStatus(s string) string {
	switch s {
	case "PENDENTE", "EM_ANDAMENTO", "CONCLUIDO", "ATRASADO", "CANCELADO":
		return s
	default:
		return "PENDENTE"
	}
}

type templateRequest struct {
	Name         string          `json:"name"`
	Description  string          `json:"description"`
	Priority     string          `json:"priority"`
	DurationDays int             `json:"duration_days"`
	Activities   json.RawMessage `json:"activities"`
	Active       *bool           `json:"active"`
}

type templateActivity struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Duration    int    `json:"duration_days"`
}

func (h *Handler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var items []models.ProjectTemplate
	h.DB.Where("tenant_id = ? AND active = ?", user.TenantID, true).Order("name asc").Find(&items)
	respond(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	if !user.HasPermission(models.PermTemplatesManage) {
		fail(w, http.StatusForbidden, "seu perfil não pode gerenciar modelos")
		return
	}
	var req templateRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	activities, ok := normalizeTemplateActivities(req.Activities)
	if !ok {
		fail(w, http.StatusBadRequest, "atividades do modelo inválidas")
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		fail(w, http.StatusBadRequest, "informe o nome do modelo")
		return
	}
	active := true
	if req.Active != nil {
		active = *req.Active
	}
	item := models.ProjectTemplate{
		TenantID: user.TenantID, Name: strings.TrimSpace(req.Name), Description: strings.TrimSpace(req.Description),
		Priority: normalizeTemplatePriority(req.Priority), DurationDays: req.DurationDays,
		Activities: activities, Active: active,
	}
	if err := h.DB.Create(&item).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar o modelo")
		return
	}
	h.audit(r, "MODELO_CRIADO", "preferencia", item.ID, fmt.Sprintf("Modelo \"%s\" criado", item.Name))
	respond(w, http.StatusCreated, map[string]any{"template": item})
}

func (h *Handler) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	if !user.HasPermission(models.PermTemplatesManage) {
		fail(w, http.StatusForbidden, "seu perfil não pode gerenciar modelos")
		return
	}
	var item models.ProjectTemplate
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&item).Error; err != nil {
		fail(w, http.StatusNotFound, "modelo não encontrado")
		return
	}
	var req templateRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	activities, ok := normalizeTemplateActivities(req.Activities)
	if !ok || strings.TrimSpace(req.Name) == "" {
		fail(w, http.StatusBadRequest, "informe o nome e atividades válidas")
		return
	}
	active := item.Active
	if req.Active != nil {
		active = *req.Active
	}
	h.DB.Model(&item).Updates(map[string]any{
		"name": strings.TrimSpace(req.Name), "description": strings.TrimSpace(req.Description),
		"priority": normalizeTemplatePriority(req.Priority), "duration_days": req.DurationDays,
		"activities": activities, "active": active,
	})
	h.audit(r, "MODELO_ATUALIZADO", "preferencia", item.ID, fmt.Sprintf("Modelo \"%s\" atualizado", item.Name))
	respond(w, http.StatusOK, map[string]any{"template": item})
}

func (h *Handler) DeleteTemplate(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	if !user.HasPermission(models.PermTemplatesManage) {
		fail(w, http.StatusForbidden, "seu perfil não pode gerenciar modelos")
		return
	}
	var item models.ProjectTemplate
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&item).Error; err != nil {
		fail(w, http.StatusNotFound, "modelo não encontrado")
		return
	}
	h.DB.Delete(&item)
	h.audit(r, "MODELO_EXCLUIDO", "preferencia", item.ID, fmt.Sprintf("Modelo \"%s\" excluído", item.Name))
	respond(w, http.StatusOK, map[string]string{"message": "modelo removido"})
}

func normalizeTemplateActivities(raw json.RawMessage) (string, bool) {
	if len(raw) == 0 {
		return "[]", true
	}
	var activities []templateActivity
	if err := json.Unmarshal(raw, &activities); err != nil {
		return "", false
	}
	for i := range activities {
		activities[i].Title = strings.TrimSpace(activities[i].Title)
		if activities[i].Title == "" {
			return "", false
		}
		if activities[i].Duration <= 0 {
			activities[i].Duration = 7
		}
	}
	encoded, _ := json.Marshal(activities)
	return string(encoded), true
}

func normalizeTemplatePriority(s string) string {
	switch s {
	case "BAIXA", "MEDIA", "ALTA", "CRITICA":
		return s
	default:
		return "MEDIA"
	}
}

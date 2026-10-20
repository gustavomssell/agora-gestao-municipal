package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"
	"agora/backend/internal/service"

	"github.com/go-chi/chi/v5"
)

type activityRequest struct {
	Title                 string  `json:"title"`
	Description           string  `json:"description"`
	PlannedStart          *string `json:"planned_start"`
	PlannedEnd            *string `json:"planned_end"`
	RealStart             *string `json:"real_start"`
	RealEnd               *string `json:"real_end"`
	Status                string  `json:"status"`
	Order                 int     `json:"order"`
	Action                string  `json:"action"`
	DeadlineJustification string  `json:"deadline_justification"`
}

func (h *Handler) ListActivities(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	var activities []models.Activity
	if err := h.DB.Where("project_id = ?", project.ID).
		Order("planned_start asc, \"order\" asc, id asc").Find(&activities).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível carregar as atividades")
		return
	}
	now := time.Now()
	for i := range activities {
		activities[i].IsLate = service.IsActivityLate(&activities[i], now)
	}
	respond(w, http.StatusOK, map[string]any{"items": activities})
}

func (h *Handler) CreateActivity(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode adicionar atividades")
		return
	}
	var req activityRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		fail(w, http.StatusBadRequest, "informe o título da atividade")
		return
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
	if plannedStart == nil || plannedEnd == nil {
		fail(w, http.StatusBadRequest, "informe o início e o término previstos da atividade")
		return
	}
	if plannedEnd.Before(*plannedStart) {
		fail(w, http.StatusBadRequest, "o término previsto não pode ser anterior ao início")
		return
	}

	var maxOrder int
	h.DB.Model(&models.Activity{}).Where("project_id = ?", project.ID).Select("COALESCE(MAX(\"order\"), 0)").Scan(&maxOrder)
	order := req.Order
	if order == 0 {
		order = maxOrder + 1
	}

	activity := models.Activity{
		TenantID:     user.TenantID,
		ProjectID:    project.ID,
		Title:        req.Title,
		Description:  strings.TrimSpace(req.Description),
		PlannedStart: plannedStart,
		PlannedEnd:   plannedEnd,
		Order:        order,
		Status:       models.ActivityNaoIniciada,
	}
	service.NormalizeActivity(&activity, time.Now())
	if err := h.DB.Create(&activity).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar a atividade")
		return
	}
	h.audit(r, "ATIVIDADE_CRIADA", "projeto", project.ID, fmt.Sprintf("Atividade \"%s\" criada", activity.Title))
	_ = service.RecomputeProject(h.DB, project.ID)
	activity.IsLate = service.IsActivityLate(&activity, time.Now())
	respond(w, http.StatusCreated, map[string]any{"activity": activity})
}

func (h *Handler) UpdateActivity(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	activity, project, err := h.loadActivityForWrite(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusForbidden, err.Error())
		return
	}
	var req activityRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		fail(w, http.StatusBadRequest, "informe o título da atividade")
		return
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
	if plannedStart == nil || plannedEnd == nil {
		fail(w, http.StatusBadRequest, "informe o início e o término previstos da atividade")
		return
	}
	if plannedEnd.Before(*plannedStart) {
		fail(w, http.StatusBadRequest, "o término previsto não pode ser anterior ao início")
		return
	}

	oldPlannedStart := dateString(activity.PlannedStart)
	oldPlannedEnd := dateString(activity.PlannedEnd)
	startChanged := oldPlannedStart != dateString(plannedStart)
	endChanged := oldPlannedEnd != dateString(plannedEnd)
	if (startChanged || endChanged) && strings.TrimSpace(req.DeadlineJustification) == "" {
		fail(w, http.StatusBadRequest, "informe a justificativa para alterar os prazos da atividade")
		return
	}

	now := time.Now()
	realStart := activity.RealStart
	realEnd := activity.RealEnd
	status := activity.Status

	switch req.Action {
	case "start":
		realStart = &now
		realEnd = nil
		status = models.ActivityEmAndamento
	case "complete":
		if realStart == nil {
			realStart = &now
		}
		realEnd = &now
		status = models.ActivityConcluida
	case "reopen":
		if !user.IsAdmin() {
			fail(w, http.StatusForbidden, "apenas o administrador pode reabrir uma atividade")
			return
		}
		realEnd = nil
		status = models.ActivityEmAndamento
	case "":
		if req.RealStart != nil {
			parsedStart, err := parseDateValue(req.RealStart)
			if err != nil {
				fail(w, http.StatusBadRequest, err.Error())
				return
			}
			realStart = parsedStart
		}
		if req.RealEnd != nil {
			parsedEnd, err := parseDateValue(req.RealEnd)
			if err != nil {
				fail(w, http.StatusBadRequest, err.Error())
				return
			}
			realEnd = parsedEnd
		}
		if req.Status != "" {
			if !contains([]string{
				models.ActivityNaoIniciada, models.ActivityEmAndamento, models.ActivityCancelada,
				models.ActivitySuspensa, models.ActivityConcluida, models.ActivityConcluidaAtraso,
				models.ActivityEmAtraso,
			}, req.Status) {
				fail(w, http.StatusBadRequest, "status de atividade inválido")
				return
			}
			status = req.Status
			if status == models.ActivityConcluida || status == models.ActivityConcluidaAtraso {
				if realEnd == nil {
					realEnd = &now
				}
				if realStart == nil {
					realStart = realEnd
				}
			}
			if status == models.ActivityEmAndamento || status == models.ActivityEmAtraso {
				if realStart == nil {
					realStart = &now
				}
			}
			if status == models.ActivityNaoIniciada {
				realStart = nil
				realEnd = nil
			}
		}
	default:
		fail(w, http.StatusBadRequest, "ação inválida")
		return
	}

	if realStart != nil && realEnd != nil && realEnd.Before(*realStart) {
		fail(w, http.StatusBadRequest, "o término real não pode ser anterior ao início real")
		return
	}

	activity.Title = req.Title
	activity.Description = strings.TrimSpace(req.Description)
	activity.PlannedStart = plannedStart
	activity.PlannedEnd = plannedEnd
	activity.RealStart = realStart
	activity.RealEnd = realEnd
	activity.Status = status
	if req.Order > 0 {
		activity.Order = req.Order
	}
	service.NormalizeActivity(activity, now)

	if err := h.DB.Save(activity).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível atualizar a atividade")
		return
	}

	if startChanged {
		h.recordDeadlineChange(r, project, "atividade", activity.ID, activity.Title, "planned_start",
			oldPlannedStart, dateString(plannedStart), req.DeadlineJustification)
	}
	if endChanged {
		h.recordDeadlineChange(r, project, "atividade", activity.ID, activity.Title, "planned_end",
			oldPlannedEnd, dateString(plannedEnd), req.DeadlineJustification)
	}
	if startChanged || endChanged {
		h.notifyProjectInvolved(project, user.ID, "Prazo de atividade alterado",
			fmt.Sprintf("Os prazos da atividade \"%s\" do projeto %s foram atualizados.", activity.Title, project.Name),
			"PRAZO", fmt.Sprintf("/projetos/%d", project.ID))
	}

	action := "ATIVIDADE_ATUALIZADA"
	switch req.Action {
	case "start":
		action = "ATIVIDADE_INICIADA"
	case "complete":
		action = "ATIVIDADE_CONCLUIDA"
	case "reopen":
		action = "ATIVIDADE_REABERTA"
	}
	h.audit(r, action, "projeto", project.ID, fmt.Sprintf("Atividade \"%s\"", activity.Title))
	_ = service.RecomputeProject(h.DB, project.ID)
	activity.IsLate = service.IsActivityLate(activity, now)
	respond(w, http.StatusOK, map[string]any{"activity": activity})
}

func (h *Handler) DeleteActivity(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	activity, project, err := h.loadActivityForWrite(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusForbidden, err.Error())
		return
	}
	if err := h.DB.Delete(activity).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível remover a atividade")
		return
	}
	h.audit(r, "ATIVIDADE_EXCLUIDA", "projeto", project.ID, fmt.Sprintf("Atividade \"%s\" excluída", activity.Title))
	_ = service.RecomputeProject(h.DB, project.ID)
	respond(w, http.StatusOK, map[string]string{"message": "atividade removida"})
}

func (h *Handler) loadActivityForWrite(user *models.User, id uint) (*models.Activity, *models.Project, error) {
	var activity models.Activity
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, user.TenantID).First(&activity).Error; err != nil {
		return nil, nil, fmt.Errorf("atividade não encontrada")
	}
	project, err := h.loadVisibleProject(user, activity.ProjectID)
	if err != nil {
		return nil, nil, fmt.Errorf("atividade não encontrada")
	}
	if !canEditProject(user, project) {
		return nil, nil, fmt.Errorf("somente a secretaria responsável pode editar atividades")
	}
	return &activity, project, nil
}

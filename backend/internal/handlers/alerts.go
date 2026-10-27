package handlers

import (
	"fmt"
	"time"

	"agora/backend/internal/models"
	"agora/backend/internal/service"
)

func (h *Handler) RunAlerts() {
	var tenants []models.Tenant
	if err := h.DB.Where("active = ?", true).Find(&tenants).Error; err != nil {
		return
	}
	for i := range tenants {
		h.runTenantAlerts(tenants[i].ID)
	}
}

func (h *Handler) runTenantAlerts(tenantID uint) {
	_ = service.RefreshTenantProjectStatuses(h.DB, tenantID)
	now := time.Now()
	today := startOfDay(now)
	limit := today.AddDate(0, 0, 7)

	var projects []models.Project
	if err := h.DB.Preload("Secretariats").
		Where("tenant_id = ? AND status NOT IN ?", tenantID, []string{models.StatusCancelado, models.StatusSuspenso}).
		Find(&projects).Error; err != nil {
		return
	}

	for i := range projects {
		project := &projects[i]
		link := fmt.Sprintf("/projetos/%d", project.ID)
		userIDs := h.projectAlertUsers(project)

		if project.Status == models.StatusEmAtraso {
			created := false
			for _, uid := range userIDs {
				if h.notifyOnceToday(uid, "ATRASO", link, "Projeto em atraso",
					fmt.Sprintf("O projeto %s está com o prazo de término vencido.", project.Name)) {
					created = true
				}
			}
			if created {
				h.logAlert(tenantID, project.ID, "Projeto em atraso notificado")
			}
		}

		if project.PlannedEnd != nil && !project.PlannedEnd.Before(today) && !project.PlannedEnd.After(limit) {
			created := false
			for _, uid := range userIDs {
				if h.notifyOnceToday(uid, "PRAZO", link, "Prazo próximo do vencimento",
					fmt.Sprintf("O projeto %s vence em %s.", project.Name, project.PlannedEnd.Format("02/01/2006"))) {
					created = true
				}
			}
			if created {
				h.logAlert(tenantID, project.ID, "Prazo próximo notificado")
			}
		}

		var activities []models.Activity
		h.DB.Where("project_id = ?", project.ID).Find(&activities)
		lateCount := 0
		for j := range activities {
			if service.IsActivityLate(&activities[j], now) {
				lateCount++
			}
		}
		if lateCount > 0 {
			created := false
			for _, uid := range userIDs {
				if h.notifyOnceToday(uid, "ATRASO", link, "Atividades em atraso",
					fmt.Sprintf("O projeto %s possui %d atividade(s) em atraso.", project.Name, lateCount)) {
					created = true
				}
			}
			if created {
				h.logAlert(tenantID, project.ID, "Atividades em atraso notificadas")
			}
		}
	}
}

func (h *Handler) projectAlertUsers(project *models.Project) []uint {
	secretIDs := map[uint]bool{project.ResponsibleSecretariatID: true}
	for _, s := range project.Secretariats {
		secretIDs[s.ID] = true
	}
	ids := make([]uint, 0, len(secretIDs))
	for id := range secretIDs {
		ids = append(ids, id)
	}
	var userIDs []uint
	h.DB.Model(&models.User{}).
		Where("tenant_id = ? AND active = ? AND secretariat_id IN ?", project.TenantID, true, ids).
		Pluck("id", &userIDs)
	return userIDs
}

func (h *Handler) logAlert(tenantID, projectID uint, details string) {
	_ = h.DB.Create(&models.AuditLog{
		TenantID: tenantID,
		UserID:   0,
		UserName: "Sistema",
		Action:   "ALERTA_ENVIADO",
		Entity:   "projeto",
		EntityID: projectID,
		Details:  details,
	}).Error
}

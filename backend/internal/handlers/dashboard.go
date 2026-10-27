package handlers

import (
	"net/http"
	"sort"
	"time"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"
	"agora/backend/internal/service"
)

func (h *Handler) Dashboard(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	_ = service.RefreshTenantProjectStatuses(h.DB, user.TenantID)
	q := h.projectScope(user)
	if r.URL.Query().Get("mine") == "true" && !user.IsAdmin() && !user.IsGoverno() {
		if user.SecretariatID != nil {
			q = q.Where("projects.responsible_secretariat_id = ?", *user.SecretariatID)
		} else {
			q = q.Where("projects.created_by_id = ?", user.ID)
		}
	}
	if secID := queryUint(r, "secretariat_id"); secID > 0 {
		sub := h.DB.Table("project_secretariats").Select("project_id").Where("secretariat_id = ?", secID)
		q = q.Where("(projects.responsible_secretariat_id = ? OR projects.id IN (?))", secID, sub)
	}
	var projects []models.Project
	if err := q.Preload("ResponsibleSecretariat").Preload("Secretariats").
		Order("projects.planned_end asc").Find(&projects).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível carregar o painel")
		return
	}
	service.FillProjectProgress(h.DB, projects)

	now := time.Now()
	period := r.URL.Query().Get("period")
	window := dashboardPeriodWindow(period, now)

	type summary struct {
		Total             int     `json:"total"`
		Active            int     `json:"active"`
		InProgress        int     `json:"in_progress"`
		AwaitingApproval  int     `json:"awaiting_approval"`
		Late              int     `json:"late"`
		Completed         int     `json:"completed"`
		CompletedLate     int     `json:"completed_late"`
		NotStarted        int     `json:"not_started"`
		Suspended         int     `json:"suspended"`
		Canceled          int     `json:"canceled"`
		BudgetPlanned     float64 `json:"budget_planned"`
		BudgetExecuted    float64 `json:"budget_executed"`
		AverageProgress   float64 `json:"average_progress"`
		ActivitiesTotal   int64   `json:"activities_total"`
		ActivitiesDone    int64   `json:"activities_done"`
		ActivitiesLate    int64   `json:"activities_late"`
		GovernmentTotal   int     `json:"government_total"`
		GovernmentAligned int     `json:"government_aligned"`
	}
	sum := summary{Total: len(projects)}

	statusCount := map[string]int{}
	priorityCount := map[string]int{}
	for i := range projects {
		p := &projects[i]
		statusCount[p.Status]++
		priorityCount[p.Priority]++
		switch p.Status {
		case models.StatusCancelado:
			sum.Canceled++
			continue
		case models.StatusSuspenso:
			sum.Suspended++
			continue
		case models.StatusConcluido:
			sum.Completed++
		case models.StatusConcluidoAtraso:
			sum.Completed++
			sum.CompletedLate++
		case models.StatusEmAtraso:
			sum.Late++
			sum.InProgress++
			sum.Active++
		case models.StatusEmAndamento:
			sum.InProgress++
			sum.Active++
		case models.StatusAguardandoAprovacao:
			sum.AwaitingApproval++
			sum.Active++
		case models.StatusNaoIniciado:
			sum.Active++
			sum.NotStarted++
		}
		if window.overlapsProject(p) {
			sum.BudgetPlanned += p.BudgetPlanned
			sum.BudgetExecuted += p.BudgetExecuted
		}
		if p.Status != models.StatusConcluido && p.Status != models.StatusConcluidoAtraso {
			sum.AverageProgress += p.Progress
		}
		if p.GovernmentPlan {
			sum.GovernmentAligned++
		}
	}
	completedInPeriod := 0
	for i := range projects {
		p := &projects[i]
		if (p.Status == models.StatusConcluido || p.Status == models.StatusConcluidoAtraso) && window.contains(p.RealEnd) {
			completedInPeriod++
		}
	}
	sum.GovernmentTotal = sum.Total - sum.Canceled

	var activities []models.Activity
	ids := make([]uint, 0, len(projects))
	for _, p := range projects {
		ids = append(ids, p.ID)
	}
	if len(ids) > 0 {
		h.DB.Where("project_id in ?", ids).Find(&activities)
	}
	for i := range activities {
		a := &activities[i]
		if a.Status == models.ActivityCancelada {
			continue
		}
		sum.ActivitiesTotal++
		if a.Status == models.ActivityConcluida || a.Status == models.ActivityConcluidaAtraso {
			sum.ActivitiesDone++
		}
		if service.IsActivityLate(a, now) {
			sum.ActivitiesLate++
		}
	}

	// Progresso médio apenas dos projetos ativos (não concluídos/cancelados/suspensos).
	var activeProgressSum float64
	var activeCount int
	for i := range projects {
		p := &projects[i]
		if p.Status != models.StatusConcluido && p.Status != models.StatusConcluidoAtraso &&
			p.Status != models.StatusCancelado && p.Status != models.StatusSuspenso {
			activeProgressSum += p.Progress
			activeCount++
		}
	}
	if activeCount > 0 {
		sum.AverageProgress = activeProgressSum / float64(activeCount)
	}

	type statusItem struct {
		Status string `json:"status"`
		Count  int    `json:"count"`
	}
	byStatus := make([]statusItem, 0, len(statusCount))
	for _, s := range validStatuses {
		if c, ok := statusCount[s]; ok {
			byStatus = append(byStatus, statusItem{Status: s, Count: c})
		}
	}

	type priorityItem struct {
		Priority string `json:"priority"`
		Count    int    `json:"count"`
	}
	byPriority := make([]priorityItem, 0, len(priorityCount))
	for _, p := range validPriorities {
		if c, ok := priorityCount[p]; ok {
			byPriority = append(byPriority, priorityItem{Priority: p, Count: c})
		}
	}

	type secAgg struct {
		ID             uint    `json:"id"`
		Name           string  `json:"name"`
		Acronym        string  `json:"acronym"`
		Color          string  `json:"color"`
		Total          int     `json:"total"`
		Late           int     `json:"late"`
		Completed      int     `json:"completed"`
		InProgress     int     `json:"in_progress"`
		Awaiting       int     `json:"awaiting_approval"`
		Progress       float64 `json:"progress"`
		BudgetPlanned  float64 `json:"budget_planned"`
		BudgetExecuted float64 `json:"budget_executed"`
		_progressSum   float64
	}
	secMap := map[uint]*secAgg{}
	for i := range projects {
		p := &projects[i]
		if p.Status == models.StatusCancelado {
			continue
		}
		agg, ok := secMap[p.ResponsibleSecretariatID]
		if !ok {
			name, acronym, color := "Sem secretaria", "", ""
			if p.ResponsibleSecretariat != nil {
				name = p.ResponsibleSecretariat.Name
				acronym = p.ResponsibleSecretariat.Acronym
				color = p.ResponsibleSecretariat.Color
			}
			agg = &secAgg{ID: p.ResponsibleSecretariatID, Name: name, Acronym: acronym, Color: color}
			secMap[p.ResponsibleSecretariatID] = agg
		}
		agg.Total++
		if window.overlapsProject(p) {
			agg.BudgetPlanned += p.BudgetPlanned
			agg.BudgetExecuted += p.BudgetExecuted
		}
		agg._progressSum += p.Progress
		switch p.Status {
		case models.StatusEmAtraso:
			agg.Late++
			agg.InProgress++
		case models.StatusEmAndamento:
			agg.InProgress++
		case models.StatusAguardandoAprovacao:
			agg.Awaiting++
		case models.StatusConcluido, models.StatusConcluidoAtraso:
			agg.Completed++
		}
	}
	bySecretariat := make([]*secAgg, 0, len(secMap))
	for _, agg := range secMap {
		if agg.Total > 0 {
			agg.Progress = agg._progressSum / float64(agg.Total)
		}
		bySecretariat = append(bySecretariat, agg)
	}
	sort.Slice(bySecretariat, func(i, j int) bool { return bySecretariat[i].Total > bySecretariat[j].Total })

	upcomingLimit := now.AddDate(0, 0, 7)
	var upcoming []models.Project
	var lateProjects []models.Project
	for i := range projects {
		p := projects[i]
		if p.PlannedEnd != nil && !p.PlannedEnd.Before(startOfDay(now)) && !p.PlannedEnd.After(upcomingLimit) &&
			p.Status != models.StatusConcluido && p.Status != models.StatusConcluidoAtraso &&
			p.Status != models.StatusAguardandoAprovacao &&
			p.Status != models.StatusCancelado && p.Status != models.StatusSuspenso {
			upcoming = append(upcoming, p)
		}
		if p.Status == models.StatusEmAtraso {
			lateProjects = append(lateProjects, p)
		}
	}
	sort.Slice(upcoming, func(i, j int) bool { return upcoming[i].PlannedEnd.Before(*upcoming[j].PlannedEnd) })
	if len(upcoming) > 6 {
		upcoming = upcoming[:6]
	}
	if len(lateProjects) > 6 {
		lateProjects = lateProjects[:6]
	}

	logQuery := h.DB.Where("tenant_id = ?", user.TenantID)
	if !user.IsAdmin() && !user.IsGoverno() {
		if len(ids) > 0 {
			logQuery = logQuery.Where("(entity = ? AND entity_id IN ?) OR user_id = ?", "projeto", ids, user.ID)
		} else {
			logQuery = logQuery.Where("user_id = ?", user.ID)
		}
	}
	var logs []models.AuditLog
	logQuery.Order("created_at desc").Limit(8).Find(&logs)

	respond(w, http.StatusOK, map[string]any{
		"summary": map[string]any{
			"total":              sum.Total,
			"active":             sum.Active,
			"in_progress":        sum.InProgress,
			"awaiting_approval":  sum.AwaitingApproval,
			"late":               sum.Late,
			"completed":          sum.Completed,
			"completed_late":     sum.CompletedLate,
			"completed_period":   completedInPeriod,
			"not_started":        sum.NotStarted,
			"suspended":          sum.Suspended,
			"canceled":           sum.Canceled,
			"budget_planned":     sum.BudgetPlanned,
			"budget_executed":    sum.BudgetExecuted,
			"average_progress":   sum.AverageProgress,
			"activities_total":   sum.ActivitiesTotal,
			"activities_done":    sum.ActivitiesDone,
			"activities_late":    sum.ActivitiesLate,
			"government_total":   sum.GovernmentTotal,
			"government_aligned": sum.GovernmentAligned,
		},
		"by_status":      byStatus,
		"by_priority":    byPriority,
		"by_secretariat": bySecretariat,
		"upcoming":       upcoming,
		"late_projects":  lateProjects,
		"recent_logs":    logs,
		"period":         period,
	})
}

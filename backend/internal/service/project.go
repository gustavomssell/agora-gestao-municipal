package service

import (
	"sort"
	"time"

	"agora/backend/internal/models"

	"gorm.io/gorm"
)

type ProjectState struct {
	Status    string
	RealStart *time.Time
	RealEnd   *time.Time
}

func NormalizeActivity(a *models.Activity, now time.Time) {
	if a.Status == models.ActivityCancelada || a.Status == models.ActivitySuspensa {
		return
	}
	if a.RealEnd != nil {
		if a.PlannedEnd != nil && a.RealEnd.After(endOfDay(*a.PlannedEnd)) {
			a.Status = models.ActivityConcluidaAtraso
		} else {
			a.Status = models.ActivityConcluida
		}
		return
	}
	if a.RealStart != nil {
		if a.PlannedEnd != nil && now.After(endOfDay(*a.PlannedEnd)) {
			a.Status = models.ActivityEmAtraso
		} else {
			a.Status = models.ActivityEmAndamento
		}
		return
	}
	if a.PlannedEnd != nil && now.After(endOfDay(*a.PlannedEnd)) {
		a.Status = models.ActivityEmAtraso
		return
	}
	a.Status = models.ActivityNaoIniciada
}

func IsActivityLate(a *models.Activity, now time.Time) bool {
	if a.Status == models.ActivityConcluida || a.Status == models.ActivityCancelada || a.Status == models.ActivitySuspensa {
		return false
	}
	if a.Status == models.ActivityEmAtraso || a.Status == models.ActivityConcluidaAtraso {
		return true
	}
	return a.PlannedEnd != nil && now.After(endOfDay(*a.PlannedEnd))
}

func ComputeProjectState(project *models.Project, activities []models.Activity, approvals []models.ProjectApproval, now time.Time) ProjectState {
	state := ProjectState{Status: project.Status}
	var realStart *time.Time
	var lastRealEnd *time.Time
	active := 0
	completed := 0
	started := false
	lateCompleted := false
	allHaveEnd := true

	for i := range activities {
		activity := &activities[i]
		if activity.Status == models.ActivityCancelada {
			continue
		}
		active++
		if activity.RealStart != nil {
			started = true
			if realStart == nil || activity.RealStart.Before(*realStart) {
				t := *activity.RealStart
				realStart = &t
			}
		}
		if activity.Status == models.ActivityConcluida || activity.Status == models.ActivityConcluidaAtraso {
			completed++
			started = true
			if activity.Status == models.ActivityConcluidaAtraso {
				lateCompleted = true
			}
			if activity.RealEnd == nil {
				allHaveEnd = false
			} else if lastRealEnd == nil || activity.RealEnd.After(*lastRealEnd) {
				t := *activity.RealEnd
				lastRealEnd = &t
			}
			continue
		}
		allHaveEnd = false
	}

	state.RealStart = realStart
	if active > 0 && completed == active && allHaveEnd {
		state.RealEnd = lastRealEnd
	}

	if project.Status == models.StatusCancelado || project.Status == models.StatusSuspenso {
		return state
	}

	allDone := active > 0 && completed == active && allHaveEnd
	switch {
	case allDone && !approvalsComplete(approvals):
		state.Status = models.StatusAguardandoAprovacao
	case allDone:
		if lateCompleted || (project.PlannedEnd != nil && state.RealEnd != nil && state.RealEnd.After(endOfDay(*project.PlannedEnd))) {
			state.Status = models.StatusConcluidoAtraso
		} else {
			state.Status = models.StatusConcluido
		}
	case project.PlannedEnd != nil && now.After(endOfDay(*project.PlannedEnd)):
		state.Status = models.StatusEmAtraso
	case started:
		state.Status = models.StatusEmAndamento
	default:
		state.Status = models.StatusNaoIniciado
	}
	return state
}

func approvalsComplete(approvals []models.ProjectApproval) bool {
	if len(approvals) == 0 {
		return true
	}
	status := make(map[string]string, len(approvals))
	for _, approval := range approvals {
		status[approval.Stage] = approval.Status
	}
	for _, stage := range models.ApprovalStages {
		if status[stage] != "APROVADO" {
			return false
		}
	}
	return true
}

func RecomputeProject(db *gorm.DB, projectID uint) error {
	var project models.Project
	if err := db.First(&project, projectID).Error; err != nil {
		return err
	}
	var activities []models.Activity
	if err := db.Where("project_id = ?", projectID).Order("planned_start asc").Find(&activities).Error; err != nil {
		return err
	}
	var approvals []models.ProjectApproval
	if err := db.Where("project_id = ?", projectID).Find(&approvals).Error; err != nil {
		return err
	}

	now := time.Now()
	statusUpdates := normalizeActivities(activities, now)
	if err := persistActivityStatuses(db, statusUpdates, true); err != nil {
		return err
	}
	state := ComputeProjectState(&project, activities, approvals, now)
	return persistProjectState(db, &project, state, true)
}

func RefreshProjectStatus(db *gorm.DB, projectID uint) error {
	var project models.Project
	if err := db.First(&project, projectID).Error; err != nil {
		return err
	}
	if project.Status == models.StatusCancelado || project.Status == models.StatusSuspenso {
		return nil
	}
	var activities []models.Activity
	if err := db.Where("project_id = ?", projectID).Order("planned_start asc").Find(&activities).Error; err != nil {
		return err
	}
	var approvals []models.ProjectApproval
	if err := db.Where("project_id = ?", projectID).Find(&approvals).Error; err != nil {
		return err
	}

	now := time.Now()
	statusUpdates := normalizeActivities(activities, now)
	if err := persistActivityStatuses(db, statusUpdates, false); err != nil {
		return err
	}
	state := ComputeProjectState(&project, activities, approvals, now)
	return persistProjectState(db, &project, state, false)
}

func RefreshTenantProjectStatuses(db *gorm.DB, tenantID uint) error {
	var projects []models.Project
	if err := db.Where("tenant_id = ? AND status NOT IN ?", tenantID, []string{models.StatusCancelado, models.StatusSuspenso}).
		Find(&projects).Error; err != nil {
		return err
	}
	if len(projects) == 0 {
		return nil
	}
	ids := make([]uint, 0, len(projects))
	for _, project := range projects {
		ids = append(ids, project.ID)
	}
	var activities []models.Activity
	if err := db.Where("project_id IN ?", ids).Find(&activities).Error; err != nil {
		return err
	}
	var approvals []models.ProjectApproval
	if err := db.Where("project_id IN ?", ids).Find(&approvals).Error; err != nil {
		return err
	}

	activitiesByProject := make(map[uint][]models.Activity, len(projects))
	for _, activity := range activities {
		activitiesByProject[activity.ProjectID] = append(activitiesByProject[activity.ProjectID], activity)
	}
	approvalsByProject := make(map[uint][]models.ProjectApproval, len(projects))
	for _, approval := range approvals {
		approvalsByProject[approval.ProjectID] = append(approvalsByProject[approval.ProjectID], approval)
	}

	now := time.Now()
	statusUpdates := map[uint]string{}
	for i := range projects {
		project := &projects[i]
		projectActivities := activitiesByProject[project.ID]
		for id, status := range normalizeActivities(projectActivities, now) {
			statusUpdates[id] = status
		}
		state := ComputeProjectState(project, projectActivities, approvalsByProject[project.ID], now)
		if err := persistProjectState(db, project, state, false); err != nil {
			return err
		}
	}
	return persistActivityStatuses(db, statusUpdates, false)
}

func EnsureApprovalChecklist(db *gorm.DB, project *models.Project) error {
	if project == nil || project.ID == 0 {
		return nil
	}
	for _, stage := range models.ApprovalStages {
		var count int64
		if err := db.Model(&models.ProjectApproval{}).
			Where("project_id = ? AND stage = ?", project.ID, stage).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}
		if err := db.Create(&models.ProjectApproval{
			TenantID:  project.TenantID,
			ProjectID: project.ID,
			Stage:     stage,
			Status:    "PENDENTE",
		}).Error; err != nil {
			return err
		}
	}
	return nil
}

func UnmetPredecessors(db *gorm.DB, projectID, activityID uint, now time.Time) ([]string, error) {
	var dependencies []models.ActivityDependency
	if err := db.Where("project_id = ? AND successor_id = ?", projectID, activityID).
		Order("id asc").Find(&dependencies).Error; err != nil {
		return nil, err
	}
	if len(dependencies) == 0 {
		return nil, nil
	}
	ids := make([]uint, 0, len(dependencies))
	for _, dependency := range dependencies {
		ids = append(ids, dependency.PredecessorID)
	}
	var predecessors []models.Activity
	if err := db.Where("project_id = ? AND id IN ?", projectID, ids).Find(&predecessors).Error; err != nil {
		return nil, err
	}
	byID := make(map[uint]models.Activity, len(predecessors))
	for _, predecessor := range predecessors {
		NormalizeActivity(&predecessor, now)
		byID[predecessor.ID] = predecessor
	}
	var titles []string
	for _, dependency := range dependencies {
		predecessor, ok := byID[dependency.PredecessorID]
		if !ok || predecessor.Status == models.ActivityCancelada {
			continue
		}
		if predecessor.Status != models.ActivityConcluida && predecessor.Status != models.ActivityConcluidaAtraso {
			titles = append(titles, predecessor.Title)
		}
	}
	sort.Strings(titles)
	return titles, nil
}

func StartedSuccessors(db *gorm.DB, projectID, activityID uint) ([]string, error) {
	var dependencies []models.ActivityDependency
	if err := db.Where("project_id = ? AND predecessor_id = ?", projectID, activityID).
		Order("id asc").Find(&dependencies).Error; err != nil {
		return nil, err
	}
	if len(dependencies) == 0 {
		return nil, nil
	}
	ids := make([]uint, 0, len(dependencies))
	for _, dependency := range dependencies {
		ids = append(ids, dependency.SuccessorID)
	}
	var successors []models.Activity
	if err := db.Where("project_id = ? AND id IN ?", projectID, ids).Find(&successors).Error; err != nil {
		return nil, err
	}
	byID := make(map[uint]models.Activity, len(successors))
	for _, successor := range successors {
		byID[successor.ID] = successor
	}
	var titles []string
	for _, dependency := range dependencies {
		successor, ok := byID[dependency.SuccessorID]
		if !ok || successor.Status == models.ActivityCancelada {
			continue
		}
		if successor.RealStart != nil || successor.Status == models.ActivityEmAndamento ||
			successor.Status == models.ActivityEmAtraso || successor.Status == models.ActivityConcluida ||
			successor.Status == models.ActivityConcluidaAtraso {
			titles = append(titles, successor.Title)
		}
	}
	sort.Strings(titles)
	return titles, nil
}

func FillProjectProgress(db *gorm.DB, projects []models.Project) {
	if len(projects) == 0 {
		return
	}
	ids := make([]uint, 0, len(projects))
	for _, p := range projects {
		ids = append(ids, p.ID)
	}
	type agg struct {
		ProjectID uint
		Total     int64
		Completed int64
	}
	var rows []agg
	db.Model(&models.Activity{}).
		Select("project_id, count(*) as total, sum(case when status in ? then 1 else 0 end) as completed", []string{models.ActivityConcluida, models.ActivityConcluidaAtraso}).
		Where("project_id in ? AND status <> ?", ids, models.ActivityCancelada).
		Group("project_id").
		Scan(&rows)
	byID := make(map[uint]agg, len(rows))
	for _, r := range rows {
		byID[r.ProjectID] = r
	}
	for i := range projects {
		a := byID[projects[i].ID]
		projects[i].ActivityCount = a.Total
		projects[i].CompletedCount = a.Completed
		if a.Total > 0 {
			projects[i].Progress = float64(a.Completed) / float64(a.Total) * 100
		}
	}
}

func normalizeActivities(activities []models.Activity, now time.Time) map[uint]string {
	updates := map[uint]string{}
	for i := range activities {
		before := activities[i].Status
		NormalizeActivity(&activities[i], now)
		if activities[i].Status != before {
			updates[activities[i].ID] = activities[i].Status
		}
	}
	return updates
}

func persistActivityStatuses(db *gorm.DB, updates map[uint]string, touch bool) error {
	for id, status := range updates {
		query := db.Model(&models.Activity{}).Where("id = ?", id)
		var err error
		if touch {
			err = query.Update("status", status).Error
		} else {
			err = query.UpdateColumn("status", status).Error
		}
		if err != nil {
			return err
		}
	}
	return nil
}

func persistProjectState(db *gorm.DB, project *models.Project, state ProjectState, touch bool) error {
	updates := map[string]any{}
	if !sameTime(project.RealStart, state.RealStart) {
		updates["real_start"] = state.RealStart
	}
	if !sameTime(project.RealEnd, state.RealEnd) {
		updates["real_end"] = state.RealEnd
	}
	if project.Status != state.Status {
		updates["status"] = state.Status
	}
	if len(updates) == 0 {
		return nil
	}
	query := db.Model(&models.Project{}).Where("id = ?", project.ID)
	if touch {
		return query.Updates(updates).Error
	}
	return query.UpdateColumns(updates).Error
}

func sameTime(a, b *time.Time) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return a.Equal(*b)
}

func endOfDay(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 23, 59, 59, 0, t.Location())
}

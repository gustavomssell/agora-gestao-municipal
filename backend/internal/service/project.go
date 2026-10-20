package service

import (
	"time"

	"agora/backend/internal/models"

	"gorm.io/gorm"
)

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

func RecomputeProject(db *gorm.DB, projectID uint) error {
	var project models.Project
	if err := db.First(&project, projectID).Error; err != nil {
		return err
	}
	var activities []models.Activity
	if err := db.Where("project_id = ?", projectID).Order("planned_start asc").Find(&activities).Error; err != nil {
		return err
	}

	now := time.Now()
	var realStart *time.Time
	var lastRealEnd *time.Time
	completed := 0
	lateCompleted := false
	started := false
	allHaveEnd := len(activities) > 0

	for i := range activities {
		a := &activities[i]
		if a.RealStart != nil && (realStart == nil || a.RealStart.Before(*realStart)) {
			t := *a.RealStart
			realStart = &t
		}
		if a.RealStart != nil {
			started = true
		}
		if a.RealEnd == nil {
			allHaveEnd = false
		}
		if a.Status == models.ActivityConcluida || a.Status == models.ActivityConcluidaAtraso {
			completed++
			started = true
			if a.Status == models.ActivityConcluidaAtraso {
				lateCompleted = true
			}
			if a.RealEnd != nil && (lastRealEnd == nil || a.RealEnd.After(*lastRealEnd)) {
				t := *a.RealEnd
				lastRealEnd = &t
			}
		}
	}

	project.RealStart = realStart
	if len(activities) > 0 && completed == len(activities) && allHaveEnd {
		project.RealEnd = lastRealEnd
	} else {
		project.RealEnd = nil
	}

	if project.Status != models.StatusCancelado && project.Status != models.StatusSuspenso {
		switch {
		case len(activities) > 0 && completed == len(activities):
			if lateCompleted || (project.PlannedEnd != nil && project.RealEnd != nil && project.RealEnd.After(endOfDay(*project.PlannedEnd))) {
				project.Status = models.StatusConcluidoAtraso
			} else {
				project.Status = models.StatusConcluido
			}
		case project.PlannedEnd != nil && now.After(endOfDay(*project.PlannedEnd)):
			project.Status = models.StatusEmAtraso
		case started:
			project.Status = models.StatusEmAndamento
		default:
			project.Status = models.StatusNaoIniciado
		}
	}

	return db.Model(&models.Project{}).Where("id = ?", project.ID).Updates(map[string]any{
		"real_start": project.RealStart,
		"real_end":   project.RealEnd,
		"status":     project.Status,
	}).Error
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
		Where("project_id in ?", ids).
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

func endOfDay(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 23, 59, 59, 0, t.Location())
}

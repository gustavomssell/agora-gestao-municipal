package service

import (
	"testing"
	"time"

	"agora/backend/internal/models"
)

func day(value string) time.Time {
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		panic(err)
	}
	return parsed
}

func ptr(value time.Time) *time.Time {
	return &value
}

func approvals(statuses ...string) []models.ProjectApproval {
	items := make([]models.ProjectApproval, 0, len(statuses))
	for i, status := range statuses {
		items = append(items, models.ProjectApproval{
			Stage:  models.ApprovalStages[i],
			Status: status,
		})
	}
	return items
}

func TestComputeProjectStateAwaitsApproval(t *testing.T) {
	now := day("2026-10-21")
	project := &models.Project{Status: models.StatusEmAndamento, PlannedEnd: ptr(day("2026-10-30"))}
	activities := []models.Activity{
		{Status: models.ActivityConcluida, RealStart: ptr(day("2026-10-01")), RealEnd: ptr(day("2026-10-10"))},
		{Status: models.ActivityConcluida, RealStart: ptr(day("2026-10-11")), RealEnd: ptr(day("2026-10-20"))},
	}

	state := ComputeProjectState(project, activities, approvals("APROVADO", "APROVADO", "PENDENTE"), now)
	if state.Status != models.StatusAguardandoAprovacao {
		t.Fatalf("expected %s, got %s", models.StatusAguardandoAprovacao, state.Status)
	}
	if state.RealEnd == nil || !state.RealEnd.Equal(day("2026-10-20")) {
		t.Fatalf("expected real end on 2026-10-20, got %v", state.RealEnd)
	}
}

func TestComputeProjectStateConcludesWhenApproved(t *testing.T) {
	now := day("2026-10-21")
	project := &models.Project{Status: models.StatusAguardandoAprovacao, PlannedEnd: ptr(day("2026-10-30"))}
	activities := []models.Activity{
		{Status: models.ActivityConcluida, RealStart: ptr(day("2026-10-01")), RealEnd: ptr(day("2026-10-10"))},
	}

	state := ComputeProjectState(project, activities, approvals("APROVADO", "APROVADO", "APROVADO"), now)
	if state.Status != models.StatusConcluido {
		t.Fatalf("expected %s, got %s", models.StatusConcluido, state.Status)
	}
}

func TestComputeProjectStateTreatsMissingApprovalsAsLegacy(t *testing.T) {
	now := day("2026-10-21")
	project := &models.Project{Status: models.StatusEmAndamento, PlannedEnd: ptr(day("2026-10-30"))}
	activities := []models.Activity{
		{Status: models.ActivityConcluida, RealStart: ptr(day("2026-10-01")), RealEnd: ptr(day("2026-10-10"))},
	}

	state := ComputeProjectState(project, activities, nil, now)
	if state.Status != models.StatusConcluido {
		t.Fatalf("expected %s, got %s", models.StatusConcluido, state.Status)
	}
}

func TestComputeProjectStateIgnoresCanceledActivities(t *testing.T) {
	now := day("2026-10-21")
	project := &models.Project{Status: models.StatusEmAndamento, PlannedEnd: ptr(day("2026-10-30"))}
	activities := []models.Activity{
		{Status: models.ActivityConcluida, RealStart: ptr(day("2026-10-01")), RealEnd: ptr(day("2026-10-10"))},
		{Status: models.ActivityCancelada, PlannedStart: ptr(day("2026-10-01")), PlannedEnd: ptr(day("2026-10-20"))},
	}

	state := ComputeProjectState(project, activities, approvals("APROVADO", "APROVADO", "APROVADO"), now)
	if state.Status != models.StatusConcluido {
		t.Fatalf("expected %s, got %s", models.StatusConcluido, state.Status)
	}
}

func TestComputeProjectStateSuspendedActivityBlocksConclusion(t *testing.T) {
	now := day("2026-10-21")
	project := &models.Project{Status: models.StatusEmAndamento, PlannedEnd: ptr(day("2026-10-30"))}
	activities := []models.Activity{
		{Status: models.ActivityConcluida, RealStart: ptr(day("2026-10-01")), RealEnd: ptr(day("2026-10-10"))},
		{Status: models.ActivitySuspensa, PlannedStart: ptr(day("2026-10-01")), PlannedEnd: ptr(day("2026-10-20"))},
	}

	state := ComputeProjectState(project, activities, approvals("APROVADO", "APROVADO", "APROVADO"), now)
	if state.Status != models.StatusEmAndamento {
		t.Fatalf("expected %s, got %s", models.StatusEmAndamento, state.Status)
	}
}

func TestComputeProjectStatePreservesManualStatus(t *testing.T) {
	now := day("2026-10-21")
	project := &models.Project{Status: models.StatusSuspenso, PlannedEnd: ptr(day("2026-10-30"))}
	activities := []models.Activity{
		{Status: models.ActivityConcluida, RealStart: ptr(day("2026-10-01")), RealEnd: ptr(day("2026-10-10"))},
	}

	state := ComputeProjectState(project, activities, approvals("APROVADO", "APROVADO", "APROVADO"), now)
	if state.Status != models.StatusSuspenso {
		t.Fatalf("expected %s, got %s", models.StatusSuspenso, state.Status)
	}
}

func TestComputeProjectStateLateCompletion(t *testing.T) {
	now := day("2026-10-21")
	project := &models.Project{Status: models.StatusEmAndamento, PlannedEnd: ptr(day("2026-10-15"))}
	activities := []models.Activity{
		{Status: models.ActivityConcluidaAtraso, RealStart: ptr(day("2026-10-01")), RealEnd: ptr(day("2026-10-20"))},
	}

	state := ComputeProjectState(project, activities, approvals("APROVADO", "APROVADO", "APROVADO"), now)
	if state.Status != models.StatusConcluidoAtraso {
		t.Fatalf("expected %s, got %s", models.StatusConcluidoAtraso, state.Status)
	}
}

func TestNormalizeActivityKeepsManualStates(t *testing.T) {
	now := day("2026-10-21")
	for _, status := range []string{models.ActivityCancelada, models.ActivitySuspensa} {
		activity := &models.Activity{
			Status:     status,
			PlannedEnd: ptr(day("2026-10-10")),
			RealStart:  ptr(day("2026-10-01")),
			RealEnd:    ptr(day("2026-10-05")),
		}
		NormalizeActivity(activity, now)
		if activity.Status != status {
			t.Fatalf("expected %s, got %s", status, activity.Status)
		}
	}
}

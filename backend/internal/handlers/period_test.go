package handlers

import (
	"net/http/httptest"
	"testing"
	"time"

	"agora/backend/internal/models"
)

func TestRequestPeriodWindow(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/projects?from=2026-01-10&to=2026-01-20", nil)
	window, err := requestPeriodWindow(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if window.From == nil || window.From.Format("2006-01-02") != "2026-01-10" {
		t.Fatalf("unexpected from: %v", window.From)
	}
	if window.To == nil || window.To.Format("2006-01-02") != "2026-01-21" {
		t.Fatalf("expected exclusive end on 2026-01-21, got %v", window.To)
	}
}

func TestRequestPeriodWindowRejectsInvertedRange(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/projects?from=2026-02-01&to=2026-01-01", nil)
	if _, err := requestPeriodWindow(req); err == nil {
		t.Fatal("expected inverted range to fail")
	}
}

func TestRequestPeriodWindowEmpty(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/projects", nil)
	window, err := requestPeriodWindow(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !window.isEmpty() {
		t.Fatal("expected empty window")
	}
}

func TestDashboardPeriodWindow(t *testing.T) {
	now := time.Date(2026, 10, 20, 15, 30, 0, 0, time.Local)
	year := dashboardPeriodWindow("year", now)
	if year.From == nil || year.From.Month() != time.January || year.From.Day() != 1 {
		t.Fatalf("unexpected year start: %v", year.From)
	}
	if year.To == nil || year.To.Format("2006-01-02") != "2026-10-21" {
		t.Fatalf("unexpected year end: %v", year.To)
	}

	recent := dashboardPeriodWindow("90d", now)
	if recent.From == nil || recent.To == nil {
		t.Fatal("expected bounded 90d window")
	}
	if got := int(recent.To.Sub(*recent.From).Hours() / 24); got < 90 {
		t.Fatalf("expected at least 90 days, got %d", got)
	}

	all := dashboardPeriodWindow("all", now)
	if !all.isEmpty() {
		t.Fatal("expected all window to be unbounded")
	}
}

func TestPeriodWindowOverlapsProject(t *testing.T) {
	from := time.Date(2026, 1, 1, 0, 0, 0, 0, time.Local)
	to := time.Date(2026, 2, 1, 0, 0, 0, 0, time.Local)
	window := periodWindow{From: &from, To: &to}

	plannedStart := time.Date(2026, 1, 15, 0, 0, 0, 0, time.Local)
	plannedEnd := time.Date(2026, 1, 25, 0, 0, 0, 0, time.Local)
	project := models.Project{PlannedStart: &plannedStart, PlannedEnd: &plannedEnd}
	if !window.overlapsProject(&project) {
		t.Fatal("expected project inside window to overlap")
	}

	outsideStart := time.Date(2025, 10, 1, 0, 0, 0, 0, time.Local)
	outsideEnd := time.Date(2025, 11, 1, 0, 0, 0, 0, time.Local)
	project.PlannedStart = &outsideStart
	project.PlannedEnd = &outsideEnd
	if window.overlapsProject(&project) {
		t.Fatal("expected project outside window not to overlap")
	}

	project.PlannedStart = nil
	project.PlannedEnd = nil
	if window.overlapsProject(&project) {
		t.Fatal("expected undated project not to overlap a bounded window")
	}
}

func TestCsvSafe(t *testing.T) {
	cases := map[string]string{
		"=SUM(A1)": "'=SUM(A1)",
		"+55":      "'+55",
		"-10":      "'-10",
		"@user":    "'@user",
		"normal":   "normal",
		"":         "",
	}
	for input, expected := range cases {
		if got := csvSafe(input); got != expected {
			t.Errorf("csvSafe(%q) = %q, want %q", input, got, expected)
		}
	}
}

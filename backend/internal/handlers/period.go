package handlers

import (
	"net/http"
	"strings"
	"time"

	"agora/backend/internal/models"

	"gorm.io/gorm"
)

// periodWindow represents an inclusive date interval. To is stored as the
// exclusive start of the following day to make timestamp comparisons simple.
type periodWindow struct {
	From *time.Time
	To   *time.Time
}

func parseDateParam(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	return parseDateValue(&value)
}

func requestPeriodWindow(r *http.Request) (periodWindow, error) {
	from, err := parseDateParam(r.URL.Query().Get("from"))
	if err != nil {
		return periodWindow{}, err
	}
	to, err := parseDateParam(r.URL.Query().Get("to"))
	if err != nil {
		return periodWindow{}, err
	}
	if from != nil && to != nil && to.Before(*from) {
		return periodWindow{}, errInvalidPeriod{}
	}
	if to != nil {
		end := to.AddDate(0, 0, 1)
		to = &end
	}
	return periodWindow{From: from, To: to}, nil
}

type errInvalidPeriod struct{}

func (errInvalidPeriod) Error() string {
	return "o fim do período não pode ser anterior ao início"
}

// applyProjectPeriod keeps projects that overlap the requested interval,
// preferring real dates and falling back to planned dates.
func applyProjectPeriod(q *gorm.DB, window periodWindow) *gorm.DB {
	if window.From != nil {
		q = q.Where("COALESCE(projects.real_end, projects.planned_end) >= ?", *window.From)
	}
	if window.To != nil {
		q = q.Where("COALESCE(projects.real_start, projects.planned_start) < ?", *window.To)
	}
	return q
}

func (w periodWindow) contains(t *time.Time) bool {
	if t == nil {
		return false
	}
	if w.From != nil && t.Before(*w.From) {
		return false
	}
	if w.To != nil && !t.Before(*w.To) {
		return false
	}
	return true
}

func (w periodWindow) isEmpty() bool {
	return w.From == nil && w.To == nil
}

func (w periodWindow) overlapsProject(p *models.Project) bool {
	if w.isEmpty() {
		return true
	}
	start, end := p.RealStart, p.RealEnd
	if start == nil {
		start = p.PlannedStart
	}
	if end == nil {
		end = p.PlannedEnd
	}
	if start == nil || end == nil {
		return false
	}
	if w.From != nil && end.Before(*w.From) {
		return false
	}
	if w.To != nil && !start.Before(*w.To) {
		return false
	}
	return true
}

func dashboardPeriodWindow(period string, now time.Time) periodWindow {
	end := startOfDay(now).AddDate(0, 0, 1)
	switch period {
	case "all":
		return periodWindow{}
	case "90d":
		start := startOfDay(now).AddDate(0, 0, -90)
		return periodWindow{From: &start, To: &end}
	default:
		start := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
		return periodWindow{From: &start, To: &end}
	}
}

package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"
	"agora/backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/go-pdf/fpdf"
)

type savedReportRequest struct {
	Name    string          `json:"name"`
	Filters json.RawMessage `json:"filters"`
}

func (h *Handler) ListSavedReports(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var reports []models.SavedReport
	var schedules []models.ReportSchedule
	h.DB.Where("tenant_id = ? AND user_id = ?", user.TenantID, user.ID).Order("name asc").Find(&reports)
	h.DB.Where("tenant_id = ? AND user_id = ?", user.TenantID, user.ID).Order("name asc").Find(&schedules)
	respond(w, http.StatusOK, map[string]any{"reports": reports, "schedules": schedules})
}

func (h *Handler) CreateSavedReport(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var req savedReportRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		fail(w, http.StatusBadRequest, "informe um nome para o filtro salvo")
		return
	}
	filters, ok := normalizeFilters(w, req.Filters)
	if !ok {
		return
	}
	item := models.SavedReport{TenantID: user.TenantID, UserID: user.ID, Name: req.Name, Filters: filters}
	if err := h.DB.Create(&item).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível salvar o filtro")
		return
	}
	respond(w, http.StatusCreated, item)
}

func (h *Handler) DeleteSavedReport(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	result := h.DB.Where("id = ? AND tenant_id = ? AND user_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID, user.ID).
		Delete(&models.SavedReport{})
	if result.RowsAffected == 0 {
		fail(w, http.StatusNotFound, "filtro salvo não encontrado")
		return
	}
	respond(w, http.StatusOK, map[string]string{"message": "filtro removido"})
}

type scheduleRequest struct {
	Name      string          `json:"name"`
	Frequency string          `json:"frequency"`
	Filters   json.RawMessage `json:"filters"`
	Active    bool            `json:"active"`
}

func (h *Handler) CreateReportSchedule(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var req scheduleRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		fail(w, http.StatusBadRequest, "informe um nome para o agendamento")
		return
	}
	frequency := strings.ToUpper(strings.TrimSpace(req.Frequency))
	if frequency != "DAILY" && frequency != "WEEKLY" && frequency != "MONTHLY" {
		fail(w, http.StatusBadRequest, "frequência deve ser DAILY, WEEKLY ou MONTHLY")
		return
	}
	filters, ok := normalizeFilters(w, req.Filters)
	if !ok {
		return
	}
	next := nextReportRun(frequency, time.Now())
	item := models.ReportSchedule{
		TenantID: user.TenantID, UserID: user.ID, Name: req.Name, Frequency: frequency,
		Filters: filters, Active: true, NextRun: &next,
	}
	if err := h.DB.Create(&item).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar o agendamento")
		return
	}
	respond(w, http.StatusCreated, item)
}

func (h *Handler) UpdateReportSchedule(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var item models.ReportSchedule
	if err := h.DB.Where("id = ? AND tenant_id = ? AND user_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID, user.ID).
		First(&item).Error; err != nil {
		fail(w, http.StatusNotFound, "agendamento não encontrado")
		return
	}
	var req scheduleRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		fail(w, http.StatusBadRequest, "informe um nome para o agendamento")
		return
	}
	frequency := strings.ToUpper(strings.TrimSpace(req.Frequency))
	if frequency != "DAILY" && frequency != "WEEKLY" && frequency != "MONTHLY" {
		fail(w, http.StatusBadRequest, "frequência inválida")
		return
	}
	filters, ok := normalizeFilters(w, req.Filters)
	if !ok {
		return
	}
	next := nextReportRun(frequency, time.Now())
	item.Name = req.Name
	item.Frequency = frequency
	item.Filters = filters
	item.Active = req.Active
	item.NextRun = &next
	h.DB.Save(&item)
	respond(w, http.StatusOK, item)
}

func (h *Handler) DeleteReportSchedule(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	result := h.DB.Where("id = ? AND tenant_id = ? AND user_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID, user.ID).
		Delete(&models.ReportSchedule{})
	if result.RowsAffected == 0 {
		fail(w, http.StatusNotFound, "agendamento não encontrado")
		return
	}
	respond(w, http.StatusOK, map[string]string{"message": "agendamento removido"})
}

func normalizeFilters(w http.ResponseWriter, raw json.RawMessage) (string, bool) {
	if len(raw) == 0 || string(raw) == "null" {
		return "{}", true
	}
	var value map[string]any
	if err := json.Unmarshal(raw, &value); err != nil {
		fail(w, http.StatusBadRequest, "filtros inválidos")
		return "", false
	}
	normalized, _ := json.Marshal(value)
	return string(normalized), true
}

func nextReportRun(frequency string, from time.Time) time.Time {
	next := from.AddDate(0, 0, 1)
	for next.Weekday() == time.Saturday || next.Weekday() == time.Sunday {
		next = next.AddDate(0, 0, 1)
	}
	next = time.Date(next.Year(), next.Month(), next.Day(), 8, 0, 0, 0, from.Location())
	switch frequency {
	case "WEEKLY":
		days := (8 - int(next.Weekday())) % 7
		if days == 0 {
			days = 7
		}
		next = next.AddDate(0, 0, days)
	case "MONTHLY":
		next = time.Date(next.Year(), next.Month()+1, 1, 8, 0, 0, 0, from.Location())
		for next.Weekday() == time.Saturday || next.Weekday() == time.Sunday {
			next = next.AddDate(0, 0, 1)
		}
	}
	return next
}

func (h *Handler) ExportProjectsPDF(w http.ResponseWriter, r *http.Request) {
	window, err := requestPeriodWindow(r)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	user := middleware.CurrentUser(r)
	var tenant models.Tenant
	h.DB.First(&tenant, user.TenantID)
	var projects []models.Project
	if err := h.reportQuery(r, window).Preload("ResponsibleSecretariat").
		Order("projects.planned_end asc").Find(&projects).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível gerar o PDF")
		return
	}
	service.FillProjectProgress(h.DB, projects)

	pdf := fpdf.New("L", "mm", "A4", "")
	tr := pdf.UnicodeTranslatorFromDescriptor("cp1252")
	pdf.SetMargins(10, 10, 10)
	pdf.SetAutoPageBreak(true, 12)
	pdf.AddPage()
	pdf.SetFont("Helvetica", "B", 16)
	pdf.SetTextColor(15, 61, 62)
	pdf.CellFormat(0, 9, tr(tenant.Name), "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "B", 12)
	pdf.SetTextColor(30, 41, 59)
	pdf.CellFormat(0, 7, tr("Relatório gerencial de projetos"), "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(90, 100, 110)
	description := fmt.Sprintf("%s  |  Gerado em %s", reportPeriodLabel(window), time.Now().Format("02/01/2006 15:04"))
	pdf.CellFormat(0, 5, tr(description), "", 1, "L", false, 0, "")
	pdf.Ln(2)

	statusCount := map[string]int{}
	var planned, executed float64
	for _, project := range projects {
		statusCount[project.Status]++
		planned += project.BudgetPlanned
		executed += project.BudgetExecuted
	}
	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetFillColor(239, 244, 246)
	pdf.SetTextColor(30, 41, 59)
	pdf.CellFormat(40, 8, tr(fmt.Sprintf("%d projetos", len(projects))), "1", 0, "C", true, 0, "")
	pdf.CellFormat(45, 8, tr(fmt.Sprintf("Em andamento: %d", statusCount[models.StatusEmAndamento])), "1", 0, "C", true, 0, "")
	pdf.CellFormat(35, 8, tr(fmt.Sprintf("Em atraso: %d", statusCount[models.StatusEmAtraso])), "1", 0, "C", true, 0, "")
	pdf.CellFormat(45, 8, tr(fmt.Sprintf("Concluídos: %d", statusCount[models.StatusConcluido]+statusCount[models.StatusConcluidoAtraso])), "1", 0, "C", true, 0, "")
	pdf.CellFormat(0, 8, tr(fmt.Sprintf("Previsto R$ %.2f | Executado R$ %.2f", planned, executed)), "1", 1, "C", true, 0, "")
	pdf.Ln(3)

	widths := []float64{24, 88, 42, 30, 18, 24, 40}
	headers := []string{"Código", "Projeto", "Secretaria", "Status", "Prog.", "Término", "Orçamento"}
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetFillColor(15, 61, 62)
	pdf.SetTextColor(255, 255, 255)
	for i, header := range headers {
		pdf.CellFormat(widths[i], 7, tr(header), "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)
	pdf.SetFont("Helvetica", "", 7.5)
	pdf.SetTextColor(25, 32, 40)
	fill := false
	for _, project := range projects {
		secretariat := ""
		if project.ResponsibleSecretariat != nil {
			secretariat = project.ResponsibleSecretariat.Acronym
		}
		values := []string{
			fitText(pdf, project.Code, widths[0]-2),
			fitText(pdf, project.Name, widths[1]-2),
			fitText(pdf, secretariat, widths[2]-2),
			fitText(pdf, statusLabel(project.Status), widths[3]-2),
			fmt.Sprintf("%.0f%%", project.Progress),
			dateBR(project.PlannedEnd),
			fmt.Sprintf("R$ %.2f", project.BudgetPlanned),
		}
		if fill {
			pdf.SetFillColor(247, 249, 250)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}
		for i, value := range values {
			align := "L"
			if i == 4 || i == 5 || i == 6 {
				align = "R"
			}
			pdf.CellFormat(widths[i], 7, tr(value), "1", 0, align, true, 0, "")
		}
		pdf.Ln(-1)
		fill = !fill
	}
	filename := fmt.Sprintf("agora-relatorio-%s.pdf", time.Now().Format("2006-01-02"))
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	if err := pdf.Output(w); err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível gerar o PDF")
		return
	}
	h.audit(r, "RELATORIO_EXPORTADO", "relatorio", 0, fmt.Sprintf("Relatório PDF com %d projetos", len(projects)))
}

func reportPeriodLabel(window periodWindow) string {
	if window.From == nil && window.To == nil {
		return "Todo o período"
	}
	if window.From != nil && window.To != nil {
		end := window.To.AddDate(0, 0, -1)
		return fmt.Sprintf("Período de %s a %s", window.From.Format("02/01/2006"), end.Format("02/01/2006"))
	}
	if window.From != nil {
		return "A partir de " + window.From.Format("02/01/2006")
	}
	end := window.To.AddDate(0, 0, -1)
	return "Até " + end.Format("02/01/2006")
}

func fitText(pdf *fpdf.Fpdf, text string, max float64) string {
	if pdf.GetStringWidth(text) <= max {
		return text
	}
	runes := []rune(text)
	for len(runes) > 1 && pdf.GetStringWidth(string(runes)+"...") > max {
		runes = runes[:len(runes)-1]
	}
	return string(runes) + "..."
}

func (h *Handler) RunReportScheduler(ctx context.Context) {
	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()
	h.processDueSchedules(time.Now())
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			h.processDueSchedules(now)
		}
	}
}

func (h *Handler) processDueSchedules(now time.Time) {
	var schedules []models.ReportSchedule
	h.DB.Where("active = ? AND next_run IS NOT NULL AND next_run <= ?", true, now).Limit(50).Find(&schedules)
	for i := range schedules {
		schedule := &schedules[i]
		next := nextReportRun(schedule.Frequency, now)
		h.DB.Model(schedule).Updates(map[string]any{"last_run": now, "next_run": next})
		h.notifyUsers(schedule.TenantID, []uint{schedule.UserID}, "Relatório agendado disponível",
			fmt.Sprintf("O relatório \"%s\" está pronto. Abra Relatórios para aplicar os filtros salvos.", schedule.Name),
			"RELATORIO", "/relatorios?agendado="+fmt.Sprint(schedule.ID))
	}
}

package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"
	"agora/backend/internal/service"

	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

func statusLabel(s string) string {
	switch s {
	case models.StatusNaoIniciado:
		return "Não iniciado"
	case models.StatusEmAndamento:
		return "Em andamento"
	case models.StatusEmAtraso:
		return "Em atraso"
	case models.StatusConcluido:
		return "Concluído"
	case models.StatusConcluidoAtraso:
		return "Concluído com atraso"
	case models.StatusCancelado:
		return "Cancelado"
	case models.StatusSuspenso:
		return "Suspenso"
	}
	return s
}

func activityStatusLabel(s string) string {
	switch s {
	case models.ActivityNaoIniciada:
		return "Não iniciada"
	case models.ActivityEmAndamento:
		return "Em andamento"
	case models.ActivityEmAtraso:
		return "Em atraso"
	case models.ActivityConcluida:
		return "Concluída"
	case models.ActivityConcluidaAtraso:
		return "Concluída com atraso"
	case models.ActivityCancelada:
		return "Cancelada"
	case models.ActivitySuspensa:
		return "Suspensa"
	}
	return s
}

func priorityLabel(p string) string {
	switch p {
	case models.PriorityBaixa:
		return "Baixa"
	case models.PriorityMedia:
		return "Média"
	case models.PriorityAlta:
		return "Alta"
	case models.PriorityCritica:
		return "Crítica"
	}
	return p
}

func dateBR(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("02/01/2006")
}

func (h *Handler) reportQuery(r *http.Request, window periodWindow) *gorm.DB {
	user := middleware.CurrentUser(r)
	q := applyProjectPeriod(h.projectScope(user), window)

	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		q = q.Where("(lower(projects.name) LIKE ? OR lower(projects.code) LIKE ?)", like, like)
	}
	if status := r.URL.Query().Get("status"); status != "" {
		q = q.Where("projects.status IN ?", strings.Split(status, ","))
	}
	if priority := r.URL.Query().Get("priority"); priority != "" {
		q = q.Where("projects.priority = ?", priority)
	}
	if secID := queryUint(r, "secretariat_id"); secID > 0 {
		sub := h.DB.Table("project_secretariats").Select("project_id").Where("secretariat_id = ?", secID)
		q = q.Where("(projects.responsible_secretariat_id = ? OR projects.id IN (?))", secID, sub)
	}
	if r.URL.Query().Get("overdue") == "true" {
		q = q.Where("projects.status = ?", models.StatusEmAtraso)
	}
	if r.URL.Query().Get("include_canceled") != "true" {
		q = q.Where("projects.status <> ?", models.StatusCancelado)
	}
	return q
}

func (h *Handler) ReportSummary(w http.ResponseWriter, r *http.Request) {
	window, err := requestPeriodWindow(r)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	var ids []uint
	if err := h.reportQuery(r, window).Pluck("projects.id", &ids).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível resumir o relatório")
		return
	}
	var activities, risks int64
	if len(ids) > 0 {
		h.DB.Model(&models.Activity{}).Where("project_id IN ?", ids).Count(&activities)
		h.DB.Model(&models.Risk{}).Where("project_id IN ?", ids).Count(&risks)
	}
	respond(w, http.StatusOK, map[string]any{
		"projects":   len(ids),
		"activities": activities,
		"risks":      risks,
	})
}

func (h *Handler) ExportProjectsXLSX(w http.ResponseWriter, r *http.Request) {
	window, err := requestPeriodWindow(r)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	q := h.reportQuery(r, window)

	var projects []models.Project
	if err := q.Preload("ResponsibleSecretariat").Preload("Secretariats").Preload("CreatedBy").
		Order("projects.planned_end asc").Find(&projects).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível gerar o relatório")
		return
	}
	service.FillProjectProgress(h.DB, projects)

	ids := make([]uint, 0, len(projects))
	for _, p := range projects {
		ids = append(ids, p.ID)
	}
	var activities []models.Activity
	var risks []models.Risk
	var lessons []models.Lesson
	if len(ids) > 0 {
		h.DB.Where("project_id in ?", ids).Order("project_id asc, planned_start asc").Find(&activities)
		h.DB.Where("project_id in ?", ids).Order("project_id asc, score desc").Find(&risks)
		h.DB.Preload("Project").Preload("CreatedBy").Where("project_id in ?", ids).Order("created_at desc").Find(&lessons)
	}
	projectByID := map[uint]models.Project{}
	projectCode := map[uint]string{}
	for _, p := range projects {
		projectByID[p.ID] = p
		projectCode[p.ID] = p.Code
	}

	f := excelize.NewFile()
	defer f.Close()
	_ = f.SetSheetName("Sheet1", "Projetos")

	projectHeaders := []string{
		"Código", "Projeto", "Secretaria responsável", "Secretarias envolvidas",
		"Status", "Prioridade", "Progresso (%)", "Início previsto", "Término previsto",
		"Início real", "Término real", "Orçamento previsto", "Orçamento executado",
		"Plano de governo", "Proposta do plano", "Criado por", "Criado em",
	}
	projectRows := make([][]any, 0, len(projects))
	for _, p := range projects {
		resp := ""
		if p.ResponsibleSecretariat != nil {
			resp = p.ResponsibleSecretariat.Name
		}
		involved := make([]string, 0, len(p.Secretariats))
		for _, s := range p.Secretariats {
			involved = append(involved, s.Acronym)
		}
		creator := ""
		if p.CreatedBy != nil {
			creator = p.CreatedBy.Name
		}
		projectRows = append(projectRows, []any{
			p.Code, p.Name, resp, strings.Join(involved, ", "),
			statusLabel(p.Status), priorityLabel(p.Priority), round1(p.Progress),
			dateBR(p.PlannedStart), dateBR(p.PlannedEnd), dateBR(p.RealStart), dateBR(p.RealEnd),
			p.BudgetPlanned, p.BudgetExecuted, yesNo(p.GovernmentPlan), p.GovernmentPlanDetail,
			creator, p.CreatedAt.Format("02/01/2006 15:04"),
		})
	}
	writeSheet(f, "Projetos", projectHeaders, projectRows)

	activityHeaders := []string{
		"Código do projeto", "Projeto", "Atividade", "Status",
		"Início previsto", "Término previsto", "Início real", "Término real", "Atrasada",
	}
	now := time.Now()
	activityRows := make([][]any, 0, len(activities))
	for _, a := range activities {
		activityRows = append(activityRows, []any{
			projectCode[a.ProjectID], projectName(projectByID, a.ProjectID), a.Title, activityStatusLabel(a.Status),
			dateBR(a.PlannedStart), dateBR(a.PlannedEnd), dateBR(a.RealStart), dateBR(a.RealEnd),
			yesNo(service.IsActivityLate(&a, now)),
		})
	}
	writeSheet(f, "Atividades", activityHeaders, activityRows)

	riskHeaders := []string{
		"Código do projeto", "Projeto", "Risco", "Categoria", "Gravidade", "Urgência",
		"Tendência", "GUT", "Nível", "Responsável", "Status", "Resposta planejada",
	}
	riskRows := make([][]any, 0, len(risks))
	for _, risk := range risks {
		riskRows = append(riskRows, []any{
			projectCode[risk.ProjectID], projectName(projectByID, risk.ProjectID), risk.Description,
			risk.Category, risk.Gravity, risk.Urgency, risk.Tendency, risk.Score, risk.Level,
			risk.Owner, risk.Status, risk.Response,
		})
	}
	writeSheet(f, "Riscos", riskHeaders, riskRows)

	lessonHeaders := []string{"Código do projeto", "Projeto", "Título", "Categoria", "Descrição", "Autor", "Data"}
	lessonRows := make([][]any, 0, len(lessons))
	for _, l := range lessons {
		author := ""
		if l.CreatedBy != nil {
			author = l.CreatedBy.Name
		}
		lessonRows = append(lessonRows, []any{
			projectCode[l.ProjectID], projectName(projectByID, l.ProjectID), l.Title,
			l.Category, l.Description, author, l.CreatedAt.Format("02/01/2006 15:04"),
		})
	}
	writeSheet(f, "Lições", lessonHeaders, lessonRows)

	buf, err := f.WriteToBuffer()
	if err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível gerar o arquivo")
		return
	}
	filename := fmt.Sprintf("agora-relatorio-%s.xlsx", time.Now().Format("2006-01-02"))
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(buf.Bytes())
	h.audit(r, "RELATORIO_EXPORTADO", "relatorio", 0, fmt.Sprintf("Relatório XLSX com %d projetos", len(projects)))
}

func writeSheet(f *excelize.File, sheet string, headers []string, rows [][]any) {
	if index, _ := f.GetSheetIndex(sheet); index == -1 {
		_, _ = f.NewSheet(sheet)
	}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellValue(sheet, cell, header)
	}
	for rowIdx, row := range rows {
		for colIdx, value := range row {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, rowIdx+2)
			_ = f.SetCellValue(sheet, cell, value)
		}
	}
	lastCol, _ := excelize.ColumnNumberToName(len(headers))
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"0F3D3E"}},
		Alignment: &excelize.Alignment{Vertical: "center"},
	})
	_ = f.SetCellStyle(sheet, "A1", lastCol+"1", headerStyle)
	_ = f.SetRowHeight(sheet, 1, 24)
	style, _ := f.NewStyle(&excelize.Style{Alignment: &excelize.Alignment{Vertical: "top", WrapText: true}})
	if len(rows) > 0 {
		_ = f.SetCellStyle(sheet, "A2", fmt.Sprintf("%s%d", lastCol, len(rows)+1), style)
	}
	_ = f.SetColWidth(sheet, "A", "A", 16)
	if len(headers) > 1 {
		_ = f.SetColWidth(sheet, "B", "B", 34)
	}
	if len(headers) > 2 {
		_ = f.SetColWidth(sheet, "C", lastCol, 22)
	}
	_ = f.AutoFilter(sheet, fmt.Sprintf("A1:%s1", lastCol), nil)
	_ = f.SetPanes(sheet, &excelize.Panes{
		Freeze:      true,
		YSplit:      1,
		TopLeftCell: "A2",
		ActivePane:  "bottomLeft",
	})
}

func round1(v float64) float64 {
	return float64(int(v*10+0.5)) / 10
}

func yesNo(v bool) string {
	if v {
		return "Sim"
	}
	return "Não"
}

func projectName(projects map[uint]models.Project, id uint) string {
	if p, ok := projects[id]; ok {
		return p.Name
	}
	return ""
}

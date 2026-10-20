package handlers

import (
	"net/http"
	"strings"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"
)

type searchProject struct {
	ID                     uint                `json:"id"`
	Code                   string              `json:"code"`
	Name                   string              `json:"name"`
	Status                 string              `json:"status"`
	ResponsibleSecretariat *models.Secretariat `json:"responsible_secretariat,omitempty"`
}

type searchLinked struct {
	ID          uint   `json:"id"`
	ProjectID   uint   `json:"project_id"`
	ProjectCode string `json:"project_code"`
	ProjectName string `json:"project_name"`
	Title       string `json:"title"`
	Detail      string `json:"detail,omitempty"`
	Status      string `json:"status,omitempty"`
}

func (h *Handler) GlobalSearch(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	empty := map[string]any{
		"projects": []searchProject{}, "users": []userDTO{}, "activities": []searchLinked{},
		"risks": []searchLinked{}, "lessons": []searchLinked{}, "documents": []searchLinked{},
		"stakeholders": []searchLinked{}, "suppliers": []models.Supplier{}, "contracts": []searchLinked{},
	}
	if len([]rune(query)) < 2 {
		respond(w, http.StatusOK, empty)
		return
	}
	if !user.HasPermission(models.PermSearchGlobal) {
		fail(w, http.StatusForbidden, "seu perfil não pode usar a busca global")
		return
	}
	like := "%" + strings.ToLower(query) + "%"
	scope := h.projectScope(user).Select("projects.id")

	projects := make([]searchProject, 0)
	var found []models.Project
	if err := h.projectScope(user).
		Preload("ResponsibleSecretariat").
		Where("(lower(projects.name) LIKE ? OR lower(projects.code) LIKE ?)", like, like).
		Order("projects.name asc").Limit(6).Find(&found).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível buscar os projetos")
		return
	}
	projectNames := map[uint]string{}
	projectCodes := map[uint]string{}
	for i := range found {
		projects = append(projects, searchProject{
			ID: found[i].ID, Code: found[i].Code, Name: found[i].Name,
			Status: found[i].Status, ResponsibleSecretariat: found[i].ResponsibleSecretariat,
		})
	}
	var allProjects []models.Project
	h.DB.Select("id, code, name").Where("id IN (?)", scope).Find(&allProjects)
	for _, project := range allProjects {
		projectNames[project.ID] = project.Name
		projectCodes[project.ID] = project.Code
	}

	activities := make([]searchLinked, 0)
	var activityRows []models.Activity
	h.DB.Where("project_id IN (?) AND lower(title) LIKE ?", scope, like).Order("title asc").Limit(6).Find(&activityRows)
	for _, row := range activityRows {
		activities = append(activities, searchLinked{ID: row.ID, ProjectID: row.ProjectID, ProjectCode: projectCodes[row.ProjectID],
			ProjectName: projectNames[row.ProjectID], Title: row.Title, Status: row.Status})
	}

	risks := make([]searchLinked, 0)
	var riskRows []models.Risk
	h.DB.Where("project_id IN (?) AND lower(description) LIKE ?", scope, like).Order("score desc").Limit(6).Find(&riskRows)
	for _, row := range riskRows {
		risks = append(risks, searchLinked{ID: row.ID, ProjectID: row.ProjectID, ProjectCode: projectCodes[row.ProjectID],
			ProjectName: projectNames[row.ProjectID], Title: row.Description, Status: row.Level})
	}

	lessons := make([]searchLinked, 0)
	var lessonRows []models.Lesson
	h.DB.Where("project_id IN (?) AND (lower(title) LIKE ? OR lower(description) LIKE ?)", scope, like, like).
		Order("title asc").Limit(6).Find(&lessonRows)
	for _, row := range lessonRows {
		lessons = append(lessons, searchLinked{ID: row.ID, ProjectID: row.ProjectID, ProjectCode: projectCodes[row.ProjectID],
			ProjectName: projectNames[row.ProjectID], Title: row.Title, Detail: row.Category})
	}

	documents := make([]searchLinked, 0)
	var documentRows []models.ProjectDocument
	h.DB.Where("project_id IN (?) AND (lower(name) LIKE ? OR lower(note) LIKE ?)", scope, like, like).
		Order("name asc").Limit(6).Find(&documentRows)
	for _, row := range documentRows {
		documents = append(documents, searchLinked{ID: row.ID, ProjectID: row.ProjectID, ProjectCode: projectCodes[row.ProjectID],
			ProjectName: projectNames[row.ProjectID], Title: row.Name, Detail: row.Category, Status: row.Status})
	}

	stakeholders := make([]searchLinked, 0)
	var stakeholderRows []models.Stakeholder
	h.DB.Where("project_id IN (?) AND (lower(name) LIKE ? OR lower(organization) LIKE ?)", scope, like, like).
		Order("name asc").Limit(6).Find(&stakeholderRows)
	for _, row := range stakeholderRows {
		stakeholders = append(stakeholders, searchLinked{ID: row.ID, ProjectID: row.ProjectID, ProjectCode: projectCodes[row.ProjectID],
			ProjectName: projectNames[row.ProjectID], Title: row.Name, Detail: row.Organization, Status: row.Kind})
	}

	suppliers := make([]models.Supplier, 0)
	contracts := make([]searchLinked, 0)
	if user.HasPermission(models.PermFinanceView) {
		var supplierRows []models.Supplier
		h.DB.Where("tenant_id = ? AND (lower(name) LIKE ? OR lower(document) LIKE ?)", user.TenantID, like, like).
			Order("name asc").Limit(6).Find(&supplierRows)
		suppliers = supplierRows
		var contractRows []models.Contract
		h.DB.Where("project_id IN (?) AND (lower(number) LIKE ? OR lower(object) LIKE ?)", scope, like, like).
			Order("number asc").Limit(6).Find(&contractRows)
		for _, row := range contractRows {
			contracts = append(contracts, searchLinked{ID: row.ID, ProjectID: row.ProjectID, ProjectCode: projectCodes[row.ProjectID],
				ProjectName: projectNames[row.ProjectID], Title: row.Number, Detail: row.Object, Status: row.Status})
		}
	}

	users := make([]userDTO, 0)
	if user.HasPermission(models.PermAdminUsers) {
		var people []models.User
		if err := h.DB.Preload("Secretariat").Preload("Cargo").
			Where("tenant_id = ? AND active = ? AND (lower(name) LIKE ? OR lower(email) LIKE ?)", user.TenantID, true, like, like).
			Order("name asc").Limit(6).Find(&people).Error; err != nil {
			fail(w, http.StatusInternalServerError, "não foi possível buscar as pessoas")
			return
		}
		for i := range people {
			users = append(users, toUserDTO(&people[i]))
		}
	}

	respond(w, http.StatusOK, map[string]any{
		"projects": projects, "users": users, "activities": activities, "risks": risks,
		"lessons": lessons, "documents": documents, "stakeholders": stakeholders,
		"suppliers": suppliers, "contracts": contracts,
	})
}

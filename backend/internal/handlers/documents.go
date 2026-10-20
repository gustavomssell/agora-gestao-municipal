package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"

	"github.com/go-chi/chi/v5"
)

var defaultDocumentChecklist = []struct {
	Name     string
	Category string
	Required bool
}{
	{"Termo de referência ou projeto básico", "PLANEJAMENTO", true},
	{"Planilha orçamentária", "ORCAMENTO", true},
	{"Licença ou dispensa ambiental", "LICENCIAMENTO", false},
	{"ART/RRT do responsável técnico", "TECNICO", false},
	{"Contrato ou instrumento equivalente", "CONTRATO", true},
	{"Nota de empenho", "FINANCEIRO", true},
	{"Registro fotográfico da execução", "EXECUCAO", false},
	{"Termo de recebimento provisório", "ENTREGA", true},
	{"Termo de recebimento definitivo", "ENTREGA", true},
}

func (h *Handler) ensureDocumentChecklist(project *models.Project) {
	for _, item := range defaultDocumentChecklist {
		var count int64
		h.DB.Model(&models.ProjectDocument{}).
			Where("project_id = ? AND name = ?", project.ID, item.Name).
			Count(&count)
		if count == 0 {
			_ = h.DB.Create(&models.ProjectDocument{
				TenantID: project.TenantID, ProjectID: project.ID, Name: item.Name,
				Category: item.Category, Required: item.Required, Status: "PENDENTE",
			}).Error
		}
	}
}

func (h *Handler) ListProjectDocuments(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	h.ensureDocumentChecklist(project)
	var items []models.ProjectDocument
	h.DB.Preload("Attachment").Where("project_id = ?", project.ID).Order("required desc, id asc").Find(&items)
	respond(w, http.StatusOK, map[string]any{
		"items": items, "can_edit": canEditProject(user, project) && user.HasPermission(models.PermDocumentsEdit),
	})
}

type projectDocumentRequest struct {
	Name         string `json:"name"`
	Category     string `json:"category"`
	Required     bool   `json:"required"`
	Status       string `json:"status"`
	AttachmentID *uint  `json:"attachment_id"`
	Note         string `json:"note"`
}

func (h *Handler) CreateProjectDocument(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, ok := h.documentProject(w, r, user)
	if !ok {
		return
	}
	var req projectDocumentRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		fail(w, http.StatusBadRequest, "informe o nome do documento")
		return
	}
	if !h.validAttachmentRef(user.TenantID, project.ID, req.AttachmentID) {
		fail(w, http.StatusBadRequest, "anexo inválido")
		return
	}
	item := models.ProjectDocument{
		TenantID: user.TenantID, ProjectID: project.ID, Name: req.Name,
		Category: strings.TrimSpace(req.Category), Required: req.Required,
		Status: normalizeDocumentStatus(req.Status), AttachmentID: req.AttachmentID,
		Note: strings.TrimSpace(req.Note),
	}
	if err := h.DB.Create(&item).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar o item de checklist")
		return
	}
	h.audit(r, "DOCUMENTO_CRIADO", "projeto", project.ID, fmt.Sprintf("Checklist \"%s\" criado", item.Name))
	respond(w, http.StatusCreated, map[string]any{"document": item})
}

func (h *Handler) UpdateProjectDocument(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var item models.ProjectDocument
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&item).Error; err != nil {
		fail(w, http.StatusNotFound, "documento não encontrado")
		return
	}
	project, ok := h.documentProjectFor(w, r, user, item.ProjectID)
	if !ok {
		return
	}
	var req projectDocumentRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		fail(w, http.StatusBadRequest, "informe o nome do documento")
		return
	}
	if !h.validAttachmentRef(user.TenantID, project.ID, req.AttachmentID) {
		fail(w, http.StatusBadRequest, "anexo inválido")
		return
	}
	h.DB.Model(&item).Updates(map[string]any{
		"name": strings.TrimSpace(req.Name), "category": strings.TrimSpace(req.Category),
		"required": req.Required, "status": normalizeDocumentStatus(req.Status),
		"attachment_id": req.AttachmentID, "note": strings.TrimSpace(req.Note),
	})
	h.audit(r, "DOCUMENTO_ATUALIZADO", "projeto", project.ID, fmt.Sprintf("Checklist \"%s\" atualizado", item.Name))
	respond(w, http.StatusOK, map[string]any{"document": item})
}

func (h *Handler) DeleteProjectDocument(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var item models.ProjectDocument
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&item).Error; err != nil {
		fail(w, http.StatusNotFound, "documento não encontrado")
		return
	}
	project, ok := h.documentProjectFor(w, r, user, item.ProjectID)
	if !ok {
		return
	}
	h.DB.Delete(&item)
	h.audit(r, "DOCUMENTO_EXCLUIDO", "projeto", project.ID, fmt.Sprintf("Checklist \"%s\" excluído", item.Name))
	respond(w, http.StatusOK, map[string]string{"message": "documento removido"})
}

func (h *Handler) documentProject(w http.ResponseWriter, r *http.Request, user *models.User) (*models.Project, bool) {
	if !user.HasPermission(models.PermDocumentsEdit) {
		fail(w, http.StatusForbidden, "seu perfil não pode editar documentos")
		return nil, false
	}
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return nil, false
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode editar documentos")
		return nil, false
	}
	return project, true
}

func (h *Handler) documentProjectFor(w http.ResponseWriter, r *http.Request, user *models.User, projectID uint) (*models.Project, bool) {
	if !user.HasPermission(models.PermDocumentsEdit) {
		fail(w, http.StatusForbidden, "seu perfil não pode editar documentos")
		return nil, false
	}
	project, err := h.loadVisibleProject(user, projectID)
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return nil, false
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode editar documentos")
		return nil, false
	}
	return project, true
}

func (h *Handler) validAttachmentRef(tenantID, projectID uint, attachmentID *uint) bool {
	if attachmentID == nil {
		return true
	}
	var count int64
	h.DB.Model(&models.Attachment{}).
		Where("id = ? AND tenant_id = ? AND project_id = ?", *attachmentID, tenantID, projectID).
		Count(&count)
	return count > 0
}

func normalizeDocumentStatus(s string) string {
	switch s {
	case "PENDENTE", "RECEBIDO", "DISPENSADO", "VENCIDO":
		return s
	default:
		return "PENDENTE"
	}
}

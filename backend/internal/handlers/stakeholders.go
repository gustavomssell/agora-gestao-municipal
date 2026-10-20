package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"

	"github.com/go-chi/chi/v5"
)

type stakeholderRequest struct {
	Name         string `json:"name"`
	Kind         string `json:"kind"`
	Organization string `json:"organization"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	Role         string `json:"role"`
	Influence    int    `json:"influence"`
	Interest     int    `json:"interest"`
	Notes        string `json:"notes"`
}

func (h *Handler) ListStakeholders(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	var items []models.Stakeholder
	h.DB.Where("project_id = ?", project.ID).Order("name asc").Find(&items)
	respond(w, http.StatusOK, map[string]any{
		"items": items, "can_edit": canEditProject(user, project) && user.HasPermission(models.PermStakeholdersEdit),
	})
}

func (h *Handler) CreateStakeholder(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, ok := h.stakeholderProject(w, r, user)
	if !ok {
		return
	}
	var req stakeholderRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	item, ok := h.stakeholderFromRequest(w, user, project.ID, req)
	if !ok {
		return
	}
	if err := h.DB.Create(&item).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar a parte interessada")
		return
	}
	h.audit(r, "PARTE_INTERESSADA_CRIADA", "projeto", project.ID, fmt.Sprintf("\"%s\" adicionado", item.Name))
	respond(w, http.StatusCreated, map[string]any{"stakeholder": item})
}

func (h *Handler) UpdateStakeholder(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var item models.Stakeholder
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&item).Error; err != nil {
		fail(w, http.StatusNotFound, "parte interessada não encontrada")
		return
	}
	project, ok := h.stakeholderProjectFor(w, r, user, item.ProjectID)
	if !ok {
		return
	}
	var req stakeholderRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	updated, ok := h.stakeholderFromRequest(w, user, project.ID, req)
	if !ok {
		return
	}
	h.DB.Model(&item).Updates(map[string]any{
		"name": updated.Name, "kind": updated.Kind, "organization": updated.Organization,
		"email": updated.Email, "phone": updated.Phone, "role": updated.Role,
		"influence": updated.Influence, "interest": updated.Interest, "notes": updated.Notes,
	})
	h.audit(r, "PARTE_INTERESSADA_ATUALIZADA", "projeto", project.ID, fmt.Sprintf("\"%s\" atualizado", item.Name))
	respond(w, http.StatusOK, map[string]any{"stakeholder": item})
}

func (h *Handler) DeleteStakeholder(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var item models.Stakeholder
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&item).Error; err != nil {
		fail(w, http.StatusNotFound, "parte interessada não encontrada")
		return
	}
	project, ok := h.stakeholderProjectFor(w, r, user, item.ProjectID)
	if !ok {
		return
	}
	h.DB.Delete(&item)
	h.audit(r, "PARTE_INTERESSADA_EXCLUIDA", "projeto", project.ID, fmt.Sprintf("\"%s\" removido", item.Name))
	respond(w, http.StatusOK, map[string]string{"message": "parte interessada removida"})
}

func (h *Handler) stakeholderProject(w http.ResponseWriter, r *http.Request, user *models.User) (*models.Project, bool) {
	if !user.HasPermission(models.PermStakeholdersEdit) {
		fail(w, http.StatusForbidden, "seu perfil não pode editar partes interessadas")
		return nil, false
	}
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return nil, false
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode editar partes interessadas")
		return nil, false
	}
	return project, true
}

func (h *Handler) stakeholderProjectFor(w http.ResponseWriter, r *http.Request, user *models.User, projectID uint) (*models.Project, bool) {
	if !user.HasPermission(models.PermStakeholdersEdit) {
		fail(w, http.StatusForbidden, "seu perfil não pode editar partes interessadas")
		return nil, false
	}
	project, err := h.loadVisibleProject(user, projectID)
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return nil, false
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode editar partes interessadas")
		return nil, false
	}
	return project, true
}

func (h *Handler) stakeholderFromRequest(w http.ResponseWriter, user *models.User, projectID uint, req stakeholderRequest) (models.Stakeholder, bool) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		fail(w, http.StatusBadRequest, "informe o nome")
		return models.Stakeholder{}, false
	}
	kind := strings.ToUpper(strings.TrimSpace(req.Kind))
	switch kind {
	case "EQUIPE", "BENEFICIARIO", "ORGAO", "FORNECEDOR", "COMUNIDADE", "OUTRO":
	default:
		kind = "OUTRO"
	}
	if req.Influence < 1 || req.Influence > 5 {
		req.Influence = 3
	}
	if req.Interest < 1 || req.Interest > 5 {
		req.Interest = 3
	}
	return models.Stakeholder{
		TenantID: user.TenantID, ProjectID: projectID, Name: req.Name, Kind: kind,
		Organization: strings.TrimSpace(req.Organization), Email: strings.TrimSpace(req.Email),
		Phone: strings.TrimSpace(req.Phone), Role: strings.TrimSpace(req.Role),
		Influence: req.Influence, Interest: req.Interest, Notes: strings.TrimSpace(req.Notes),
	}, true
}

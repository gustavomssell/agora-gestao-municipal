package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"
	"agora/backend/internal/service"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func (h *Handler) ensureApprovalChecklist(project *models.Project) {
	_ = service.EnsureApprovalChecklist(h.DB, project)
}

func (h *Handler) ListApprovals(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	if !user.HasPermission(models.PermApprovalsView) {
		fail(w, http.StatusForbidden, "seu perfil não pode consultar aprovações")
		return
	}
	h.ensureApprovalChecklist(project)
	var items []models.ProjectApproval
	h.DB.Preload("Approver").
		Where("project_id = ? AND tenant_id = ?", project.ID, user.TenantID).
		Order("id asc").
		Find(&items)
	canDecide := canEditProject(user, project) && user.HasPermission(models.PermApprovalsDecide)
	respond(w, http.StatusOK, map[string]any{"items": items, "can_decide": canDecide})
}

type approvalDecisionRequest struct {
	Status    string `json:"status"`
	Comment   string `json:"comment"`
	Signature string `json:"signature"`
}

func (h *Handler) DecideApproval(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var approval models.ProjectApproval
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&approval).Error; err != nil {
		fail(w, http.StatusNotFound, "etapa de aprovação não encontrada")
		return
	}
	project, err := h.loadVisibleProject(user, approval.ProjectID)
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	if !canEditProject(user, project) || !user.HasPermission(models.PermApprovalsDecide) {
		fail(w, http.StatusForbidden, "somente gestores da secretaria responsável podem decidir aprovações")
		return
	}
	var req approvalDecisionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Status = strings.ToUpper(strings.TrimSpace(req.Status))
	req.Comment = strings.TrimSpace(req.Comment)
	req.Signature = strings.TrimSpace(req.Signature)
	if req.Status != "APROVADO" && req.Status != "REJEITADO" {
		fail(w, http.StatusBadRequest, "decisão inválida")
		return
	}
	if req.Status == "REJEITADO" && req.Comment == "" {
		fail(w, http.StatusBadRequest, "informe o motivo da rejeição")
		return
	}
	if req.Status == "APROVADO" && len(req.Signature) < 3 {
		fail(w, http.StatusBadRequest, "informe o nome do responsável pela assinatura")
		return
	}
	for i, stage := range models.ApprovalStages {
		if stage != approval.Stage {
			continue
		}
		if i > 0 {
			var previous models.ProjectApproval
			h.DB.Where("project_id = ? AND stage = ?", approval.ProjectID, models.ApprovalStages[i-1]).First(&previous)
			if previous.Status != "APROVADO" {
				fail(w, http.StatusBadRequest, "conclua a etapa anterior antes de decidir esta")
				return
			}
		}
	}
	now := time.Now()
	updates := map[string]any{
		"status":      req.Status,
		"comment":     req.Comment,
		"signature":   req.Signature,
		"approver_id": user.ID,
		"decided_at":  now,
	}
	if err := h.DB.Model(&approval).Updates(updates).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível registrar a decisão")
		return
	}
	_ = service.RecomputeProject(h.DB, project.ID)
	action := "APROVACAO_APROVADA"
	if req.Status == "REJEITADO" {
		action = "APROVACAO_REJEITADA"
	}
	h.audit(r, action, "projeto", project.ID,
		fmt.Sprintf("Etapa %s %s por %s", approval.Stage, strings.ToLower(req.Status), user.Name))
	h.notifyProjectInvolved(project, user.ID, "Decisão de aprovação",
		fmt.Sprintf("A etapa %s do projeto %s foi %s.", approval.Stage, project.Name, strings.ToLower(req.Status)),
		"APROVACAO", fmt.Sprintf("/projetos/%d", project.ID))
	h.DB.Preload("Approver").First(&approval, approval.ID)
	respond(w, http.StatusOK, map[string]any{"approval": approval})
}

func (h *Handler) ResetApproval(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	if !user.IsAdmin() {
		fail(w, http.StatusForbidden, "somente o administrador pode reabrir uma etapa")
		return
	}
	var approval models.ProjectApproval
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&approval).Error; err != nil {
		fail(w, http.StatusNotFound, "etapa de aprovação não encontrada")
		return
	}
	stages := []string{approval.Stage}
	for i, stage := range models.ApprovalStages {
		if stage == approval.Stage {
			stages = models.ApprovalStages[i:]
			break
		}
	}
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		return tx.Model(&models.ProjectApproval{}).
			Where("project_id = ? AND stage IN ?", approval.ProjectID, stages).
			Updates(map[string]any{
				"status": "PENDENTE", "comment": "", "signature": "",
				"approver_id": nil, "decided_at": nil,
			}).Error
	})
	if err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível reabrir a etapa")
		return
	}
	_ = service.RecomputeProject(h.DB, approval.ProjectID)
	h.audit(r, "APROVACAO_REABERTA", "projeto", approval.ProjectID,
		fmt.Sprintf("Etapa %s e posteriores reabertas pelo administrador", approval.Stage))
	respond(w, http.StatusOK, map[string]string{"message": "etapa reaberta"})
}

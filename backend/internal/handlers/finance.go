package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) ListFinance(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	if !user.HasPermission(models.PermFinanceView) {
		fail(w, http.StatusForbidden, "seu perfil não pode consultar o financeiro")
		return
	}
	var lines []models.BudgetLine
	h.DB.Where("project_id = ?", project.ID).Order("code asc").Find(&lines)
	var commitments []models.Commitment
	h.DB.Preload("BudgetLine").Preload("Supplier").Preload("Payments").
		Where("project_id = ?", project.ID).Order("id desc").Find(&commitments)
	var contracts []models.Contract
	h.DB.Preload("Supplier").Where("project_id = ?", project.ID).Order("id desc").Find(&contracts)
	var committed, paid float64
	for _, c := range commitments {
		if c.Status != "CANCELADO" {
			committed += c.Amount
		}
		for _, p := range c.Payments {
			paid += p.Amount
		}
	}
	var planned float64
	for _, line := range lines {
		planned += line.Planned
	}
	respond(w, http.StatusOK, map[string]any{
		"budget_lines": lines,
		"commitments":  commitments,
		"contracts":    contracts,
		"totals": map[string]float64{
			"planned":   planned,
			"committed": committed,
			"paid":      paid,
		},
		"can_edit": canEditProject(user, project) && user.HasPermission(models.PermFinanceEdit),
	})
}

type budgetLineRequest struct {
	Code        string  `json:"code"`
	Description string  `json:"description"`
	Source      string  `json:"source"`
	Planned     float64 `json:"planned"`
}

func (h *Handler) CreateBudgetLine(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, ok := h.financeProject(w, r, user)
	if !ok {
		return
	}
	var req budgetLineRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Code = strings.TrimSpace(req.Code)
	if req.Code == "" {
		fail(w, http.StatusBadRequest, "informe o código da dotação")
		return
	}
	if req.Planned < 0 {
		fail(w, http.StatusBadRequest, "o valor previsto não pode ser negativo")
		return
	}
	line := models.BudgetLine{
		TenantID: user.TenantID, ProjectID: project.ID, Code: req.Code,
		Description: strings.TrimSpace(req.Description), Source: strings.TrimSpace(req.Source),
		Planned: req.Planned,
	}
	if err := h.DB.Create(&line).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar a dotação")
		return
	}
	h.audit(r, "DOTACAO_CRIADA", "projeto", project.ID, fmt.Sprintf("Dotação %s criada", line.Code))
	respond(w, http.StatusCreated, map[string]any{"budget_line": line})
}

func (h *Handler) UpdateBudgetLine(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var line models.BudgetLine
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&line).Error; err != nil {
		fail(w, http.StatusNotFound, "dotação não encontrada")
		return
	}
	project, ok := h.financeProjectFor(w, r, user, line.ProjectID)
	if !ok {
		return
	}
	var req budgetLineRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Code) == "" || req.Planned < 0 {
		fail(w, http.StatusBadRequest, "informe o código e um valor não negativo")
		return
	}
	h.DB.Model(&line).Updates(map[string]any{
		"code": strings.TrimSpace(req.Code), "description": strings.TrimSpace(req.Description),
		"source": strings.TrimSpace(req.Source), "planned": req.Planned,
	})
	h.audit(r, "DOTACAO_ATUALIZADA", "projeto", project.ID, fmt.Sprintf("Dotação %s atualizada", line.Code))
	respond(w, http.StatusOK, map[string]any{"budget_line": line})
}

func (h *Handler) DeleteBudgetLine(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var line models.BudgetLine
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&line).Error; err != nil {
		fail(w, http.StatusNotFound, "dotação não encontrada")
		return
	}
	project, ok := h.financeProjectFor(w, r, user, line.ProjectID)
	if !ok {
		return
	}
	var count int64
	h.DB.Model(&models.Commitment{}).Where("budget_line_id = ?", line.ID).Count(&count)
	if count > 0 {
		fail(w, http.StatusBadRequest, "remova ou vincule os empenhos antes de excluir a dotação")
		return
	}
	h.DB.Delete(&line)
	h.audit(r, "DOTACAO_EXCLUIDA", "projeto", project.ID, fmt.Sprintf("Dotação %s excluída", line.Code))
	respond(w, http.StatusOK, map[string]string{"message": "dotação removida"})
}

type supplierRequest struct {
	Name     string `json:"name"`
	Document string `json:"document"`
	Category string `json:"category"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Active   *bool  `json:"active"`
}

func (h *Handler) ListSuppliers(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	if !user.HasPermission(models.PermFinanceView) {
		fail(w, http.StatusForbidden, "seu perfil não pode consultar fornecedores")
		return
	}
	var items []models.Supplier
	h.DB.Where("tenant_id = ?", user.TenantID).Order("name asc").Find(&items)
	respond(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) CreateSupplier(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	if !user.HasPermission(models.PermSuppliersManage) && !user.HasPermission(models.PermFinanceEdit) {
		fail(w, http.StatusForbidden, "seu perfil não pode cadastrar fornecedores")
		return
	}
	var req supplierRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		fail(w, http.StatusBadRequest, "informe o nome do fornecedor")
		return
	}
	active := true
	if req.Active != nil {
		active = *req.Active
	}
	supplier := models.Supplier{
		TenantID: user.TenantID, Name: req.Name, Document: strings.TrimSpace(req.Document),
		Category: strings.TrimSpace(req.Category), Email: strings.TrimSpace(req.Email),
		Phone: strings.TrimSpace(req.Phone), Active: active,
	}
	if err := h.DB.Create(&supplier).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar o fornecedor")
		return
	}
	h.audit(r, "FORNECEDOR_CRIADO", "fornecedor", supplier.ID, fmt.Sprintf("Fornecedor \"%s\" criado", supplier.Name))
	respond(w, http.StatusCreated, map[string]any{"supplier": supplier})
}

func (h *Handler) UpdateSupplier(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	if !user.HasPermission(models.PermSuppliersManage) && !user.HasPermission(models.PermFinanceEdit) {
		fail(w, http.StatusForbidden, "seu perfil não pode editar fornecedores")
		return
	}
	var supplier models.Supplier
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&supplier).Error; err != nil {
		fail(w, http.StatusNotFound, "fornecedor não encontrado")
		return
	}
	var req supplierRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		fail(w, http.StatusBadRequest, "informe o nome do fornecedor")
		return
	}
	active := supplier.Active
	if req.Active != nil {
		active = *req.Active
	}
	h.DB.Model(&supplier).Updates(map[string]any{
		"name": strings.TrimSpace(req.Name), "document": strings.TrimSpace(req.Document),
		"category": strings.TrimSpace(req.Category), "email": strings.TrimSpace(req.Email),
		"phone": strings.TrimSpace(req.Phone), "active": active,
	})
	h.audit(r, "FORNECEDOR_ATUALIZADO", "fornecedor", supplier.ID, fmt.Sprintf("Fornecedor \"%s\" atualizado", supplier.Name))
	respond(w, http.StatusOK, map[string]any{"supplier": supplier})
}

type commitmentRequest struct {
	BudgetLineID *uint   `json:"budget_line_id"`
	SupplierID   *uint   `json:"supplier_id"`
	Number       string  `json:"number"`
	Description  string  `json:"description"`
	Amount       float64 `json:"amount"`
	Status       string  `json:"status"`
	IssuedAt     *string `json:"issued_at"`
}

func (h *Handler) CreateCommitment(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, ok := h.financeProject(w, r, user)
	if !ok {
		return
	}
	var req commitmentRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Description) == "" || req.Amount <= 0 {
		fail(w, http.StatusBadRequest, "informe a descrição e um valor maior que zero")
		return
	}
	if !h.validFinanceRefs(user.TenantID, project.ID, req.BudgetLineID, req.SupplierID) {
		fail(w, http.StatusBadRequest, "dotação ou fornecedor inválido")
		return
	}
	issuedAt, err := parseDateValue(req.IssuedAt)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	commitment := models.Commitment{
		TenantID: user.TenantID, ProjectID: project.ID, BudgetLineID: req.BudgetLineID,
		SupplierID: req.SupplierID, Number: strings.TrimSpace(req.Number),
		Description: strings.TrimSpace(req.Description), Amount: req.Amount,
		Status: normalizeCommitmentStatus(req.Status), IssuedAt: issuedAt, CreatedByID: user.ID,
	}
	if err := h.DB.Create(&commitment).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar o empenho")
		return
	}
	h.audit(r, "EMPENHO_CRIADO", "projeto", project.ID, fmt.Sprintf("Empenho %s criado", commitment.Number))
	respond(w, http.StatusCreated, map[string]any{"commitment": commitment})
}

func (h *Handler) UpdateCommitment(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var commitment models.Commitment
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&commitment).Error; err != nil {
		fail(w, http.StatusNotFound, "empenho não encontrado")
		return
	}
	project, ok := h.financeProjectFor(w, r, user, commitment.ProjectID)
	if !ok {
		return
	}
	var req commitmentRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Description) == "" || req.Amount <= 0 {
		fail(w, http.StatusBadRequest, "informe a descrição e um valor maior que zero")
		return
	}
	if !h.validFinanceRefs(user.TenantID, project.ID, req.BudgetLineID, req.SupplierID) {
		fail(w, http.StatusBadRequest, "dotação ou fornecedor inválido")
		return
	}
	issuedAt, err := parseDateValue(req.IssuedAt)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	h.DB.Model(&commitment).Updates(map[string]any{
		"budget_line_id": req.BudgetLineID, "supplier_id": req.SupplierID,
		"number": strings.TrimSpace(req.Number), "description": strings.TrimSpace(req.Description),
		"amount": req.Amount, "status": normalizeCommitmentStatus(req.Status), "issued_at": issuedAt,
	})
	h.audit(r, "EMPENHO_ATUALIZADO", "projeto", project.ID, fmt.Sprintf("Empenho %s atualizado", commitment.Number))
	respond(w, http.StatusOK, map[string]any{"commitment": commitment})
}

func (h *Handler) DeleteCommitment(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var commitment models.Commitment
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&commitment).Error; err != nil {
		fail(w, http.StatusNotFound, "empenho não encontrado")
		return
	}
	project, ok := h.financeProjectFor(w, r, user, commitment.ProjectID)
	if !ok {
		return
	}
	var payments int64
	h.DB.Model(&models.Payment{}).Where("commitment_id = ?", commitment.ID).Count(&payments)
	if payments > 0 {
		fail(w, http.StatusBadRequest, "remova os pagamentos antes de excluir o empenho")
		return
	}
	h.DB.Delete(&commitment)
	h.syncBudgetExecuted(project.ID)
	h.audit(r, "EMPENHO_EXCLUIDO", "projeto", project.ID, fmt.Sprintf("Empenho %s excluído", commitment.Number))
	respond(w, http.StatusOK, map[string]string{"message": "empenho removido"})
}

type paymentRequest struct {
	Amount float64 `json:"amount"`
	PaidAt *string `json:"paid_at"`
	Note   string  `json:"note"`
}

func (h *Handler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var commitment models.Commitment
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&commitment).Error; err != nil {
		fail(w, http.StatusNotFound, "empenho não encontrado")
		return
	}
	project, ok := h.financeProjectFor(w, r, user, commitment.ProjectID)
	if !ok {
		return
	}
	var req paymentRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Amount <= 0 {
		fail(w, http.StatusBadRequest, "informe um valor maior que zero")
		return
	}
	paidAt, err := parseDateValue(req.PaidAt)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	payment := models.Payment{
		TenantID: user.TenantID, ProjectID: project.ID, CommitmentID: commitment.ID,
		Amount: req.Amount, PaidAt: paidAt, Note: strings.TrimSpace(req.Note), CreatedByID: user.ID,
	}
	if err := h.DB.Create(&payment).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível registrar o pagamento")
		return
	}
	h.refreshCommitmentStatus(commitment.ID)
	h.syncBudgetExecuted(project.ID)
	h.audit(r, "PAGAMENTO_REGISTRADO", "projeto", project.ID,
		fmt.Sprintf("Pagamento de R$ %.2f registrado no empenho %s", payment.Amount, commitment.Number))
	respond(w, http.StatusCreated, map[string]any{"payment": payment})
}

func (h *Handler) DeletePayment(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var payment models.Payment
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&payment).Error; err != nil {
		fail(w, http.StatusNotFound, "pagamento não encontrado")
		return
	}
	project, ok := h.financeProjectFor(w, r, user, payment.ProjectID)
	if !ok {
		return
	}
	h.DB.Delete(&payment)
	h.refreshCommitmentStatus(payment.CommitmentID)
	h.syncBudgetExecuted(project.ID)
	h.audit(r, "PAGAMENTO_EXCLUIDO", "projeto", project.ID, "Pagamento excluído")
	respond(w, http.StatusOK, map[string]string{"message": "pagamento removido"})
}

type contractRequest struct {
	CommitmentID *uint   `json:"commitment_id"`
	SupplierID   *uint   `json:"supplier_id"`
	ParentID     *uint   `json:"parent_id"`
	Number       string  `json:"number"`
	Object       string  `json:"object"`
	Value        float64 `json:"value"`
	Status       string  `json:"status"`
	StartDate    *string `json:"start_date"`
	EndDate      *string `json:"end_date"`
	SignedAt     *string `json:"signed_at"`
}

func (h *Handler) CreateContract(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, ok := h.financeProject(w, r, user)
	if !ok {
		return
	}
	var req contractRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Number) == "" || strings.TrimSpace(req.Object) == "" || req.Value < 0 {
		fail(w, http.StatusBadRequest, "informe número, objeto e valor não negativo")
		return
	}
	contract, ok := h.contractFromRequest(w, user, project.ID, req)
	if !ok {
		return
	}
	if err := h.DB.Create(&contract).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar o contrato")
		return
	}
	h.audit(r, "CONTRATO_CRIADO", "projeto", project.ID, fmt.Sprintf("Contrato %s criado", contract.Number))
	respond(w, http.StatusCreated, map[string]any{"contract": contract})
}

func (h *Handler) UpdateContract(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var contract models.Contract
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&contract).Error; err != nil {
		fail(w, http.StatusNotFound, "contrato não encontrado")
		return
	}
	project, ok := h.financeProjectFor(w, r, user, contract.ProjectID)
	if !ok {
		return
	}
	var req contractRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	updated, ok := h.contractFromRequest(w, user, project.ID, req)
	if !ok {
		return
	}
	h.DB.Model(&contract).Updates(map[string]any{
		"commitment_id": updated.CommitmentID, "supplier_id": updated.SupplierID, "parent_id": updated.ParentID,
		"number": updated.Number, "object": updated.Object, "value": updated.Value, "status": updated.Status,
		"start_date": updated.StartDate, "end_date": updated.EndDate, "signed_at": updated.SignedAt,
	})
	h.audit(r, "CONTRATO_ATUALIZADO", "projeto", project.ID, fmt.Sprintf("Contrato %s atualizado", contract.Number))
	respond(w, http.StatusOK, map[string]any{"contract": contract})
}

func (h *Handler) DeleteContract(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var contract models.Contract
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&contract).Error; err != nil {
		fail(w, http.StatusNotFound, "contrato não encontrado")
		return
	}
	project, ok := h.financeProjectFor(w, r, user, contract.ProjectID)
	if !ok {
		return
	}
	h.DB.Delete(&contract)
	h.audit(r, "CONTRATO_EXCLUIDO", "projeto", project.ID, fmt.Sprintf("Contrato %s excluído", contract.Number))
	respond(w, http.StatusOK, map[string]string{"message": "contrato removido"})
}

func (h *Handler) contractFromRequest(w http.ResponseWriter, user *models.User, projectID uint, req contractRequest) (models.Contract, bool) {
	if strings.TrimSpace(req.Number) == "" || strings.TrimSpace(req.Object) == "" || req.Value < 0 {
		fail(w, http.StatusBadRequest, "informe número, objeto e valor não negativo")
		return models.Contract{}, false
	}
	start, err := parseDateValue(req.StartDate)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return models.Contract{}, false
	}
	end, err := parseDateValue(req.EndDate)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return models.Contract{}, false
	}
	signed, err := parseDateValue(req.SignedAt)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return models.Contract{}, false
	}
	if start != nil && end != nil && end.Before(*start) {
		fail(w, http.StatusBadRequest, "o fim da vigência não pode ser anterior ao início")
		return models.Contract{}, false
	}
	if req.SupplierID != nil {
		var count int64
		h.DB.Model(&models.Supplier{}).Where("id = ? AND tenant_id = ?", *req.SupplierID, user.TenantID).Count(&count)
		if count == 0 {
			fail(w, http.StatusBadRequest, "fornecedor inválido")
			return models.Contract{}, false
		}
	}
	if req.CommitmentID != nil {
		var count int64
		h.DB.Model(&models.Commitment{}).Where("id = ? AND project_id = ?", *req.CommitmentID, projectID).Count(&count)
		if count == 0 {
			fail(w, http.StatusBadRequest, "empenho inválido")
			return models.Contract{}, false
		}
	}
	return models.Contract{
		TenantID: user.TenantID, ProjectID: projectID, CommitmentID: req.CommitmentID,
		SupplierID: req.SupplierID, ParentID: req.ParentID, Number: strings.TrimSpace(req.Number),
		Object: strings.TrimSpace(req.Object), Value: req.Value, Status: normalizeContractStatus(req.Status),
		StartDate: start, EndDate: end, SignedAt: signed,
	}, true
}

func (h *Handler) financeProject(w http.ResponseWriter, r *http.Request, user *models.User) (*models.Project, bool) {
	if !user.HasPermission(models.PermFinanceEdit) {
		fail(w, http.StatusForbidden, "seu perfil não pode editar o financeiro")
		return nil, false
	}
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return nil, false
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode editar o financeiro")
		return nil, false
	}
	return project, true
}

func (h *Handler) financeProjectFor(w http.ResponseWriter, r *http.Request, user *models.User, projectID uint) (*models.Project, bool) {
	if !user.HasPermission(models.PermFinanceEdit) {
		fail(w, http.StatusForbidden, "seu perfil não pode editar o financeiro")
		return nil, false
	}
	project, err := h.loadVisibleProject(user, projectID)
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return nil, false
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode editar o financeiro")
		return nil, false
	}
	return project, true
}

func (h *Handler) validFinanceRefs(tenantID, projectID uint, budgetLineID, supplierID *uint) bool {
	if budgetLineID != nil {
		var count int64
		h.DB.Model(&models.BudgetLine{}).Where("id = ? AND project_id = ?", *budgetLineID, projectID).Count(&count)
		if count == 0 {
			return false
		}
	}
	if supplierID != nil {
		var count int64
		h.DB.Model(&models.Supplier{}).Where("id = ? AND tenant_id = ?", *supplierID, tenantID).Count(&count)
		if count == 0 {
			return false
		}
	}
	return true
}

func (h *Handler) syncBudgetExecuted(projectID uint) {
	var paid float64
	h.DB.Model(&models.Payment{}).Where("project_id = ?", projectID).Select("COALESCE(SUM(amount), 0)").Scan(&paid)
	h.DB.Model(&models.Project{}).Where("id = ?", projectID).Update("budget_executed", paid)
}

func (h *Handler) refreshCommitmentStatus(commitmentID uint) {
	var commitment models.Commitment
	if err := h.DB.First(&commitment, commitmentID).Error; err != nil {
		return
	}
	var paid float64
	h.DB.Model(&models.Payment{}).Where("commitment_id = ?", commitmentID).Select("COALESCE(SUM(amount), 0)").Scan(&paid)
	status := commitment.Status
	if paid > 0 {
		status = "LIQUIDADO"
	}
	if paid >= commitment.Amount && commitment.Amount > 0 {
		status = "PAGO"
	}
	h.DB.Model(&commitment).Update("status", status)
}

func normalizeCommitmentStatus(s string) string {
	switch s {
	case "EMPENHADO", "LIQUIDADO", "PAGO", "CANCELADO":
		return s
	default:
		return "EMPENHADO"
	}
}

func normalizeContractStatus(s string) string {
	switch s {
	case "VIGENTE", "ENCERRADO", "RESCINDIDO", "ADITIVO":
		return s
	default:
		return "VIGENTE"
	}
}

var _ = time.Now

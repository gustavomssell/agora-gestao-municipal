package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"agora/backend/internal/auth"
	"agora/backend/internal/middleware"
	"agora/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type secretariatRequest struct {
	Name    string `json:"name"`
	Acronym string `json:"acronym"`
	Color   string `json:"color"`
	Active  *bool  `json:"active"`
}

type secretariatItem struct {
	models.Secretariat
	UserCount    int64 `json:"user_count"`
	ProjectCount int64 `json:"project_count"`
}

func (h *Handler) ListSecretariats(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var items []models.Secretariat
	if err := h.DB.Where("tenant_id = ?", user.TenantID).Order("name asc").Find(&items).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível carregar as secretarias")
		return
	}
	if !user.IsAdmin() {
		respond(w, http.StatusOK, map[string]any{"items": items})
		return
	}
	result := make([]secretariatItem, 0, len(items))
	for _, s := range items {
		var userCount, projectCount int64
		h.DB.Model(&models.User{}).Where("secretariat_id = ?", s.ID).Count(&userCount)
		sub := h.DB.Table("project_secretariats").Select("project_id").Where("secretariat_id = ?", s.ID)
		h.DB.Model(&models.Project{}).
			Where("tenant_id = ? AND (responsible_secretariat_id = ? OR id IN (?))", user.TenantID, s.ID, sub).
			Count(&projectCount)
		result = append(result, secretariatItem{Secretariat: s, UserCount: userCount, ProjectCount: projectCount})
	}
	respond(w, http.StatusOK, map[string]any{"items": result})
}

func (h *Handler) CreateSecretariat(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var req secretariatRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Acronym = strings.ToUpper(strings.TrimSpace(req.Acronym))
	if req.Name == "" || req.Acronym == "" {
		fail(w, http.StatusBadRequest, "informe o nome e a sigla da secretaria")
		return
	}
	var count int64
	h.DB.Model(&models.Secretariat{}).
		Where("tenant_id = ? AND lower(acronym) = ?", user.TenantID, strings.ToLower(req.Acronym)).
		Count(&count)
	if count > 0 {
		fail(w, http.StatusBadRequest, "já existe uma secretaria com essa sigla")
		return
	}
	active := true
	if req.Active != nil {
		active = *req.Active
	}
	secretariat := models.Secretariat{
		TenantID: user.TenantID,
		Name:     req.Name,
		Acronym:  req.Acronym,
		Color:    req.Color,
		Active:   active,
	}
	if err := h.DB.Create(&secretariat).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar a secretaria")
		return
	}
	h.audit(r, "SECRETARIA_CRIADA", "secretaria", secretariat.ID, secretariat.Name)
	respond(w, http.StatusCreated, map[string]any{"secretariat": secretariat})
}

func (h *Handler) UpdateSecretariat(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var secretariat models.Secretariat
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&secretariat).Error; err != nil {
		fail(w, http.StatusNotFound, "secretaria não encontrada")
		return
	}
	var req secretariatRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Acronym = strings.ToUpper(strings.TrimSpace(req.Acronym))
	if req.Name == "" || req.Acronym == "" {
		fail(w, http.StatusBadRequest, "informe o nome e a sigla da secretaria")
		return
	}
	var count int64
	h.DB.Model(&models.Secretariat{}).
		Where("tenant_id = ? AND lower(acronym) = ? AND id <> ?", user.TenantID, strings.ToLower(req.Acronym), secretariat.ID).
		Count(&count)
	if count > 0 {
		fail(w, http.StatusBadRequest, "já existe uma secretaria com essa sigla")
		return
	}
	secretariat.Name = req.Name
	secretariat.Acronym = req.Acronym
	secretariat.Color = req.Color
	if req.Active != nil {
		secretariat.Active = *req.Active
	}
	if err := h.DB.Save(&secretariat).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível atualizar a secretaria")
		return
	}
	h.audit(r, "SECRETARIA_ATUALIZADA", "secretaria", secretariat.ID, secretariat.Name)
	respond(w, http.StatusOK, map[string]any{"secretariat": secretariat})
}

func (h *Handler) DeleteSecretariat(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var secretariat models.Secretariat
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&secretariat).Error; err != nil {
		fail(w, http.StatusNotFound, "secretaria não encontrada")
		return
	}
	var users, projects int64
	h.DB.Model(&models.User{}).Where("secretariat_id = ?", secretariat.ID).Count(&users)
	h.DB.Model(&models.Project{}).Where("responsible_secretariat_id = ?", secretariat.ID).Count(&projects)
	if users > 0 || projects > 0 {
		fail(w, http.StatusBadRequest, "esta secretaria possui usuários ou projetos vinculados; inative-a em vez de excluir")
		return
	}
	if err := h.DB.Delete(&secretariat).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível excluir a secretaria")
		return
	}
	h.audit(r, "SECRETARIA_EXCLUIDA", "secretaria", secretariat.ID, secretariat.Name)
	respond(w, http.StatusOK, map[string]string{"message": "secretaria excluída"})
}

type cargoRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Active      *bool  `json:"active"`
}

type cargoItem struct {
	models.Cargo
	UserCount int64 `json:"user_count"`
}

func (h *Handler) ListCargos(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var items []models.Cargo
	if err := h.DB.Where("tenant_id = ?", user.TenantID).Order("name asc").Find(&items).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível carregar os cargos")
		return
	}
	if !user.IsAdmin() {
		respond(w, http.StatusOK, map[string]any{"items": items})
		return
	}
	result := make([]cargoItem, 0, len(items))
	for _, c := range items {
		var count int64
		h.DB.Model(&models.User{}).Where("cargo_id = ?", c.ID).Count(&count)
		result = append(result, cargoItem{Cargo: c, UserCount: count})
	}
	respond(w, http.StatusOK, map[string]any{"items": result})
}

func (h *Handler) CreateCargo(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var req cargoRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		fail(w, http.StatusBadRequest, "informe o nome do cargo")
		return
	}
	var count int64
	h.DB.Model(&models.Cargo{}).
		Where("tenant_id = ? AND lower(name) = ?", user.TenantID, strings.ToLower(req.Name)).Count(&count)
	if count > 0 {
		fail(w, http.StatusBadRequest, "já existe um cargo com esse nome")
		return
	}
	active := true
	if req.Active != nil {
		active = *req.Active
	}
	cargo := models.Cargo{
		TenantID:    user.TenantID,
		Name:        req.Name,
		Description: strings.TrimSpace(req.Description),
		Active:      active,
	}
	if err := h.DB.Create(&cargo).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar o cargo")
		return
	}
	h.audit(r, "CARGO_CRIADO", "cargo", cargo.ID, cargo.Name)
	respond(w, http.StatusCreated, map[string]any{"cargo": cargo})
}

func (h *Handler) UpdateCargo(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var cargo models.Cargo
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&cargo).Error; err != nil {
		fail(w, http.StatusNotFound, "cargo não encontrado")
		return
	}
	var req cargoRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		fail(w, http.StatusBadRequest, "informe o nome do cargo")
		return
	}
	var count int64
	h.DB.Model(&models.Cargo{}).
		Where("tenant_id = ? AND lower(name) = ? AND id <> ?", user.TenantID, strings.ToLower(req.Name), cargo.ID).
		Count(&count)
	if count > 0 {
		fail(w, http.StatusBadRequest, "já existe um cargo com esse nome")
		return
	}
	cargo.Name = req.Name
	cargo.Description = strings.TrimSpace(req.Description)
	if req.Active != nil {
		cargo.Active = *req.Active
	}
	if err := h.DB.Save(&cargo).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível atualizar o cargo")
		return
	}
	h.audit(r, "CARGO_ATUALIZADO", "cargo", cargo.ID, cargo.Name)
	respond(w, http.StatusOK, map[string]any{"cargo": cargo})
}

func (h *Handler) DeleteCargo(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var cargo models.Cargo
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&cargo).Error; err != nil {
		fail(w, http.StatusNotFound, "cargo não encontrado")
		return
	}
	var count int64
	h.DB.Model(&models.User{}).Where("cargo_id = ?", cargo.ID).Count(&count)
	if count > 0 {
		fail(w, http.StatusBadRequest, "este cargo possui usuários vinculados; inative-o em vez de excluir")
		return
	}
	if err := h.DB.Delete(&cargo).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível excluir o cargo")
		return
	}
	h.audit(r, "CARGO_EXCLUIDO", "cargo", cargo.ID, cargo.Name)
	respond(w, http.StatusOK, map[string]string{"message": "cargo excluído"})
}

type userRequest struct {
	Name          string    `json:"name"`
	Email         string    `json:"email"`
	Password      string    `json:"password"`
	Role          string    `json:"role"`
	SecretariatID *uint     `json:"secretariat_id"`
	CargoID       *uint     `json:"cargo_id"`
	Active        *bool     `json:"active"`
	Permissions   *[]string `json:"permissions"`
}

func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	q := h.DB.Preload("Secretariat").Preload("Cargo").Where("tenant_id = ?", user.TenantID)
	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		q = q.Where("(lower(name) LIKE ? OR lower(email) LIKE ?)", like, like)
	}
	if role := r.URL.Query().Get("role"); role != "" {
		q = q.Where("role = ?", role)
	}
	if secID := queryUint(r, "secretariat_id"); secID > 0 {
		q = q.Where("secretariat_id = ?", secID)
	}
	if active := r.URL.Query().Get("active"); active == "true" || active == "false" {
		q = q.Where("active = ?", active == "true")
	}
	var users []models.User
	if err := q.Order("name asc").Find(&users).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível carregar os usuários")
		return
	}
	items := make([]userDTO, 0, len(users))
	for i := range users {
		items = append(items, toUserDTO(&users[i]))
	}
	respond(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	current := middleware.CurrentUser(r)
	var req userRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Name == "" || req.Email == "" {
		fail(w, http.StatusBadRequest, "informe o nome e o e-mail")
		return
	}
	if len(req.Password) < 6 {
		fail(w, http.StatusBadRequest, "a senha inicial deve ter pelo menos 6 caracteres")
		return
	}
	if !validRole(req.Role) {
		fail(w, http.StatusBadRequest, "perfil de acesso inválido")
		return
	}
	permissions := ""
	if req.Permissions != nil {
		var ok bool
		permissions, ok = permissionOverrides(req.Role, *req.Permissions)
		if !ok {
			fail(w, http.StatusBadRequest, "lista de permissões inválida")
			return
		}
	}
	if err := h.validateUserRefs(current.TenantID, req.SecretariatID, req.CargoID); err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	var count int64
	h.DB.Model(&models.User{}).
		Where("tenant_id = ? AND lower(email) = ?", current.TenantID, req.Email).Count(&count)
	if count > 0 {
		fail(w, http.StatusBadRequest, "este e-mail já está em uso nesta prefeitura")
		return
	}
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar o usuário")
		return
	}
	active := true
	if req.Active != nil {
		active = *req.Active
	}
	user := models.User{
		TenantID:      current.TenantID,
		Name:          req.Name,
		Email:         req.Email,
		PasswordHash:  hash,
		Role:          req.Role,
		SecretariatID: req.SecretariatID,
		CargoID:       req.CargoID,
		Active:        active,
		Permissions:   permissions,
	}
	if err := h.DB.Create(&user).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível criar o usuário")
		return
	}
	h.audit(r, "USUARIO_CRIADO", "usuario", user.ID, fmt.Sprintf("Usuário %s (%s)", user.Name, user.Role))
	h.DB.Preload("Secretariat").Preload("Cargo").First(&user, user.ID)
	respond(w, http.StatusCreated, map[string]any{"user": toUserDTO(&user)})
}

func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	current := middleware.CurrentUser(r)
	var user models.User
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), current.TenantID).
		First(&user).Error; err != nil {
		fail(w, http.StatusNotFound, "usuário não encontrado")
		return
	}
	var req userRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Name == "" || req.Email == "" {
		fail(w, http.StatusBadRequest, "informe o nome e o e-mail")
		return
	}
	if !validRole(req.Role) {
		fail(w, http.StatusBadRequest, "perfil de acesso inválido")
		return
	}
	permissions := user.Permissions
	if req.Permissions != nil {
		var ok bool
		permissions, ok = permissionOverrides(req.Role, *req.Permissions)
		if !ok {
			fail(w, http.StatusBadRequest, "lista de permissões inválida")
			return
		}
	}
	if err := h.validateUserRefs(current.TenantID, req.SecretariatID, req.CargoID); err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	var count int64
	h.DB.Model(&models.User{}).
		Where("tenant_id = ? AND lower(email) = ? AND id <> ?", current.TenantID, req.Email, user.ID).Count(&count)
	if count > 0 {
		fail(w, http.StatusBadRequest, "este e-mail já está em uso nesta prefeitura")
		return
	}
	active := user.Active
	if req.Active != nil {
		active = *req.Active
	}
	if user.ID == current.ID && (!active || req.Role != models.RoleAdmin) {
		fail(w, http.StatusBadRequest, "você não pode inativar ou alterar o próprio perfil de administrador")
		return
	}
	if user.Role == models.RoleAdmin && (req.Role != models.RoleAdmin || !active) {
		var admins int64
		h.DB.Model(&models.User{}).
			Where("tenant_id = ? AND role = ? AND active = ? AND id <> ?", current.TenantID, models.RoleAdmin, true, user.ID).
			Count(&admins)
		if admins == 0 {
			fail(w, http.StatusBadRequest, "a prefeitura precisa manter ao menos um administrador ativo")
			return
		}
	}
	user.Name = req.Name
	user.Email = req.Email
	user.Role = req.Role
	user.SecretariatID = req.SecretariatID
	user.CargoID = req.CargoID
	user.Active = active
	user.Permissions = permissions
	if req.Password != "" {
		if len(req.Password) < 6 {
			fail(w, http.StatusBadRequest, "a nova senha deve ter pelo menos 6 caracteres")
			return
		}
		hash, err := auth.HashPassword(req.Password)
		if err != nil {
			fail(w, http.StatusInternalServerError, "não foi possível atualizar a senha")
			return
		}
		user.PasswordHash = hash
	}
	if err := h.DB.Save(&user).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível atualizar o usuário")
		return
	}
	detail := fmt.Sprintf("Usuário %s atualizado", user.Name)
	if req.Password != "" {
		detail += "; senha redefinida"
	}
	h.audit(r, "USUARIO_ATUALIZADO", "usuario", user.ID, detail)
	h.DB.Preload("Secretariat").Preload("Cargo").First(&user, user.ID)
	respond(w, http.StatusOK, map[string]any{"user": toUserDTO(&user)})
}

func (h *Handler) validateUserRefs(tenantID uint, secretariatID, cargoID *uint) error {
	if secretariatID != nil && *secretariatID > 0 {
		var count int64
		h.DB.Model(&models.Secretariat{}).
			Where("id = ? AND tenant_id = ?", *secretariatID, tenantID).Count(&count)
		if count == 0 {
			return fmt.Errorf("secretaria inválida")
		}
	}
	if cargoID != nil && *cargoID > 0 {
		var count int64
		h.DB.Model(&models.Cargo{}).
			Where("id = ? AND tenant_id = ?", *cargoID, tenantID).Count(&count)
		if count == 0 {
			return fmt.Errorf("cargo inválido")
		}
	}
	return nil
}

func (h *Handler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	respond(w, http.StatusOK, map[string]any{"items": models.AllPermissions})
}

func validRole(role string) bool {
	return role == models.RoleAdmin || role == models.RoleGestor ||
		role == models.RoleEditor || role == models.RoleGoverno
}

func permissionOverrides(role string, codes []string) (string, bool) {
	granted := map[string]bool{}
	for _, code := range codes {
		code = strings.TrimSpace(code)
		if code == "" {
			continue
		}
		if !models.IsValidPermission(code) {
			return "", false
		}
		granted[code] = true
	}
	defaults := &models.User{Role: role}
	overrides := map[string]bool{}
	for _, permission := range models.AllPermissions {
		wanted := granted[permission.Code]
		if wanted != defaults.HasPermission(permission.Code) {
			overrides[permission.Code] = wanted
		}
	}
	return models.EncodePermissionOverrides(overrides), true
}

func (h *Handler) logsQuery(r *http.Request) *gorm.DB {
	user := middleware.CurrentUser(r)
	q := h.DB.Model(&models.AuditLog{}).Where("tenant_id = ?", user.TenantID)
	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		q = q.Where("(lower(user_name) LIKE ? OR lower(details) LIKE ?)", like, like)
	}
	if action := r.URL.Query().Get("action"); action != "" {
		q = q.Where("action = ?", action)
	}
	if entity := r.URL.Query().Get("entity"); entity != "" {
		q = q.Where("entity = ?", entity)
	}
	if userID := queryUint(r, "user_id"); userID > 0 {
		q = q.Where("user_id = ?", userID)
	}
	if from, err := parseDateValue(ptrString(r.URL.Query().Get("from"))); err == nil && from != nil {
		q = q.Where("created_at >= ?", *from)
	}
	if to, err := parseDateValue(ptrString(r.URL.Query().Get("to"))); err == nil && to != nil {
		end := to.AddDate(0, 0, 1)
		q = q.Where("created_at < ?", end)
	}
	return q
}

func csvSafe(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return value
	}
	switch trimmed[0] {
	case '=', '+', '-', '@':
		return "'" + value
	}
	return value
}

func (h *Handler) ExportLogsCSV(w http.ResponseWriter, r *http.Request) {
	var items []models.AuditLog
	if err := h.logsQuery(r).Order("created_at desc").Find(&items).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível exportar a auditoria")
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"agora-auditoria-%s.csv\"", time.Now().Format("2006-01-02")))
	_, _ = w.Write([]byte{0xEF, 0xBB, 0xBF})
	writer := csv.NewWriter(w)
	writer.Comma = ';'
	_ = writer.Write([]string{"Data e hora", "Usuário", "Ação", "Entidade", "ID", "Detalhe", "IP"})
	for _, item := range items {
		_ = writer.Write([]string{
			item.CreatedAt.Format("02/01/2006 15:04:05"),
			csvSafe(item.UserName),
			csvSafe(item.Action),
			csvSafe(item.Entity),
			strconv.FormatUint(uint64(item.EntityID), 10),
			csvSafe(item.Details),
			csvSafe(item.IP),
		})
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return
	}
	h.audit(r, "AUDITORIA_EXPORTADA", "auditoria", 0, fmt.Sprintf("%d evento(s) exportado(s) em CSV", len(items)))
}

func (h *Handler) ListLogs(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	q := h.DB.Model(&models.AuditLog{}).Where("tenant_id = ?", user.TenantID)
	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		q = q.Where("(lower(user_name) LIKE ? OR lower(details) LIKE ?)", like, like)
	}
	if action := r.URL.Query().Get("action"); action != "" {
		q = q.Where("action = ?", action)
	}
	if entity := r.URL.Query().Get("entity"); entity != "" {
		q = q.Where("entity = ?", entity)
	}
	if userID := queryUint(r, "user_id"); userID > 0 {
		q = q.Where("user_id = ?", userID)
	}
	if from, err := parseDateValue(ptrString(r.URL.Query().Get("from"))); err == nil && from != nil {
		q = q.Where("created_at >= ?", *from)
	}
	if to, err := parseDateValue(ptrString(r.URL.Query().Get("to"))); err == nil && to != nil {
		end := to.AddDate(0, 0, 1)
		q = q.Where("created_at < ?", end)
	}
	var total int64
	q.Count(&total)
	page := queryInt(r, "page", 1)
	if page < 1 {
		page = 1
	}
	pageSize := 50
	var items []models.AuditLog
	if err := q.Order("created_at desc").Offset((page - 1) * pageSize).Limit(pageSize).Find(&items).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível carregar a auditoria")
		return
	}
	respond(w, http.StatusOK, map[string]any{
		"items":     items,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

type brandingRequest struct {
	PrimaryColor   string `json:"primary_color"`
	SecondaryColor string `json:"secondary_color"`
}

func validHexColor(value string) bool {
	if len(value) != 7 || value[0] != '#' {
		return false
	}
	for _, char := range value[1:] {
		if !((char >= '0' && char <= '9') || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F')) {
			return false
		}
	}
	return true
}

func (h *Handler) UpdateBranding(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.CurrentTenant(r)
	var req brandingRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.PrimaryColor = strings.ToLower(strings.TrimSpace(req.PrimaryColor))
	req.SecondaryColor = strings.ToLower(strings.TrimSpace(req.SecondaryColor))
	if !validHexColor(req.PrimaryColor) || !validHexColor(req.SecondaryColor) {
		fail(w, http.StatusBadRequest, "informe cores no formato hexadecimal #RRGGBB")
		return
	}
	if err := h.DB.Model(&models.Tenant{}).Where("id = ?", tenant.ID).Updates(map[string]any{
		"primary_color":   req.PrimaryColor,
		"secondary_color": req.SecondaryColor,
	}).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível salvar a identidade visual")
		return
	}
	tenant.PrimaryColor = req.PrimaryColor
	tenant.SecondaryColor = req.SecondaryColor
	detail := fmt.Sprintf("Cores primária %s e secundária %s", req.PrimaryColor, req.SecondaryColor)
	h.audit(r, "IDENTIDADE_ATUALIZADA", "prefeitura", tenant.ID, detail)
	respond(w, http.StatusOK, map[string]any{"tenant": publicTenant(tenant)})
}

func ptrString(s string) *string { return &s }

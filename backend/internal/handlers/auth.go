package handlers

import (
	"net/http"
	"strings"
	"time"

	"agora/backend/internal/auth"
	"agora/backend/internal/middleware"
	"agora/backend/internal/models"
)

type loginRequest struct {
	Tenant   string `json:"tenant"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type userDTO struct {
	ID             uint                `json:"id"`
	Name           string              `json:"name"`
	Email          string              `json:"email"`
	Role           string              `json:"role"`
	Active         bool                `json:"active"`
	SecretariatID  *uint               `json:"secretariat_id"`
	Secretariat    *models.Secretariat `json:"secretariat,omitempty"`
	CargoID        *uint               `json:"cargo_id"`
	Cargo          *models.Cargo       `json:"cargo,omitempty"`
	Phone          string              `json:"phone"`
	NotifyEmail    bool                `json:"notify_email"`
	NotifyWhatsApp bool                `json:"notify_whatsapp"`
	Permissions    []string            `json:"permissions"`
	LastLoginAt    *time.Time          `json:"last_login_at"`
	CreatedAt      time.Time           `json:"created_at"`
}

func toUserDTO(u *models.User) userDTO {
	return userDTO{
		ID:             u.ID,
		Name:           u.Name,
		Email:          u.Email,
		Role:           u.Role,
		Active:         u.Active,
		SecretariatID:  u.SecretariatID,
		Secretariat:    u.Secretariat,
		CargoID:        u.CargoID,
		Cargo:          u.Cargo,
		Phone:          u.Phone,
		NotifyEmail:    u.NotifyEmail,
		NotifyWhatsApp: u.NotifyWhatsApp,
		Permissions:    u.PermissionCodes(),
		LastLoginAt:    u.LastLoginAt,
		CreatedAt:      u.CreatedAt,
	}
}

func publicTenant(t *models.Tenant) map[string]any {
	return map[string]any{
		"id":              t.ID,
		"name":            t.Name,
		"slug":            t.Slug,
		"city":            t.City,
		"state":           t.State,
		"primary_color":   t.PrimaryColor,
		"secondary_color": t.SecondaryColor,
	}
}

func (h *Handler) PublicTenants(w http.ResponseWriter, r *http.Request) {
	var tenants []models.Tenant
	if err := h.DB.Where("active = ?", true).Order("name asc").Find(&tenants).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível carregar as prefeituras")
		return
	}
	items := make([]map[string]any, 0, len(tenants))
	for i := range tenants {
		items = append(items, publicTenant(&tenants[i]))
	}
	respond(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Tenant = strings.ToLower(strings.TrimSpace(req.Tenant))
	if req.Tenant == "" || req.Email == "" || req.Password == "" {
		fail(w, http.StatusBadRequest, "informe prefeitura, e-mail e senha")
		return
	}

	var tenant models.Tenant
	if err := h.DB.Where("lower(slug) = ? AND active = ?", req.Tenant, true).First(&tenant).Error; err != nil {
		fail(w, http.StatusUnauthorized, "prefeitura não encontrada")
		return
	}
	var user models.User
	if err := h.DB.Preload("Secretariat").Preload("Cargo").
		Where("tenant_id = ? AND lower(email) = ?", tenant.ID, req.Email).
		First(&user).Error; err != nil {
		fail(w, http.StatusUnauthorized, "e-mail ou senha inválidos")
		return
	}
	if user.LockedUntil != nil && user.LockedUntil.After(time.Now()) {
		fail(w, http.StatusTooManyRequests, "acesso temporariamente bloqueado por excesso de tentativas; tente novamente em alguns minutos")
		return
	}
	if !user.Active || !auth.CheckPassword(user.PasswordHash, req.Password) {
		h.registerFailedLogin(&user, tenant.ID, clientIP(r))
		if user.LockedUntil != nil && user.LockedUntil.After(time.Now()) {
			fail(w, http.StatusTooManyRequests, "acesso temporariamente bloqueado por excesso de tentativas; tente novamente em alguns minutos")
			return
		}
		fail(w, http.StatusUnauthorized,
			"e-mail ou senha inválidos")
		return
	}

	token, err := auth.GenerateToken(h.Cfg, &user, &tenant)
	if err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível gerar a sessão")
		return
	}
	now := time.Now()
	_ = h.DB.Model(&user).Updates(map[string]any{
		"last_login_at":   now,
		"failed_attempts": 0,
		"locked_until":    nil,
	}).Error
	user.LastLoginAt = &now
	user.FailedAttempts = 0
	user.LockedUntil = nil
	_ = h.DB.Create(&models.AuditLog{
		TenantID: tenant.ID,
		UserID:   user.ID,
		UserName: user.Name,
		Action:   "LOGIN",
		Entity:   "usuario",
		EntityID: user.ID,
		Details:  "Acesso ao sistema",
		IP:       clientIP(r),
	}).Error

	respond(w, http.StatusOK, map[string]any{
		"token":  token,
		"user":   toUserDTO(&user),
		"tenant": publicTenant(&tenant),
	})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	tenant := middleware.CurrentTenant(r)
	respond(w, http.StatusOK, map[string]any{
		"user":   toUserDTO(user),
		"tenant": publicTenant(tenant),
		"permissions": map[string]any{
			"can_create_project":  user.HasPermission(models.PermProjectsCreate),
			"can_delete_project":  user.HasPermission(models.PermProjectsDelete),
			"can_manage_users":    user.HasPermission(models.PermAdminUsers),
			"can_manage_settings": user.HasPermission(models.PermAdminSettings),
			"can_transfer":        user.HasPermission(models.PermProjectsTransfer),
			"read_only":           user.IsGoverno() && len(user.PermissionOverrides()) == 0,
			"codes":               user.PermissionCodes(),
		},
	})
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var req changePasswordRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if len(req.NewPassword) < 6 {
		fail(w, http.StatusBadRequest, "a nova senha deve ter pelo menos 6 caracteres")
		return
	}
	user := middleware.CurrentUser(r)
	if !auth.CheckPassword(user.PasswordHash, req.CurrentPassword) {
		fail(w, http.StatusBadRequest, "senha atual incorreta")
		return
	}
	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível atualizar a senha")
		return
	}
	if err := h.DB.Model(user).Update("password_hash", hash).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível atualizar a senha")
		return
	}
	h.audit(r, "SENHA_ALTERADA", "usuario", user.ID, "Senha alterada pelo próprio usuário")
	respond(w, http.StatusOK, map[string]string{"message": "senha atualizada"})
}

type updateProfileRequest struct {
	Name string `json:"name"`
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var req updateProfileRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if len(req.Name) < 3 || len(req.Name) > 120 {
		fail(w, http.StatusBadRequest, "informe um nome entre 3 e 120 caracteres")
		return
	}
	user := middleware.CurrentUser(r)
	if err := h.DB.Model(user).Update("name", req.Name).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível atualizar o perfil")
		return
	}
	h.audit(r, "PERFIL_ATUALIZADO", "usuario", user.ID, "Nome atualizado pelo próprio usuário")
	user.Name = req.Name
	respond(w, http.StatusOK, map[string]any{"user": toUserDTO(user)})
}

const (
	maxLoginAttempts  = 5
	loginLockDuration = 15 * time.Minute
)

func (h *Handler) registerFailedLogin(user *models.User, tenantID uint, ip string) {
	user.FailedAttempts++
	updates := map[string]any{"failed_attempts": user.FailedAttempts}
	details := "Tentativa de login com senha invalida"
	if user.FailedAttempts >= maxLoginAttempts {
		until := time.Now().Add(loginLockDuration)
		user.LockedUntil = &until
		updates["locked_until"] = until
		details = "Login bloqueado por excesso de tentativas"
	}
	_ = h.DB.Model(user).Updates(updates).Error
	_ = h.DB.Create(&models.AuditLog{
		TenantID: tenantID,
		UserID:   user.ID,
		UserName: user.Name,
		Action:   "LOGIN_FALHOU",
		Entity:   "usuario",
		EntityID: user.ID,
		Details:  details,
		IP:       ip,
	}).Error
}

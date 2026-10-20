package handlers

import (
	"net/http"
	"strings"

	"agora/backend/internal/auth"
	"agora/backend/internal/models"
)

func (h *Handler) WebSocket(w http.ResponseWriter, r *http.Request) {
	if h.Hub == nil {
		fail(w, http.StatusServiceUnavailable, "tempo real indisponível")
		return
	}
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		token = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	}
	if token == "" {
		fail(w, http.StatusUnauthorized, "autenticação necessária")
		return
	}
	claims, err := auth.ParseToken(h.Cfg, token)
	if err != nil {
		fail(w, http.StatusUnauthorized, err.Error())
		return
	}
	var user models.User
	if err := h.DB.Where("id = ? AND tenant_id = ? AND active = ?", claims.UserID, claims.TenantID, true).
		First(&user).Error; err != nil {
		fail(w, http.StatusUnauthorized, "usuário inválido ou inativo")
		return
	}
	var tenant models.Tenant
	if err := h.DB.Where("id = ? AND active = ?", claims.TenantID, true).First(&tenant).Error; err != nil {
		fail(w, http.StatusUnauthorized, "prefeitura inválida ou inativa")
		return
	}
	h.Hub.Serve(w, r, tenant.ID, user.ID)
}

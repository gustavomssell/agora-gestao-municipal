package middleware

import (
	"context"
	"encoding/json"
	"net/http"

	"agora/backend/internal/auth"
	"agora/backend/internal/config"
	"agora/backend/internal/models"

	"gorm.io/gorm"
)

type ctxKey string

const (
	userKey    ctxKey = "user"
	tenantKey  ctxKey = "tenant"
	sessionKey ctxKey = "session"
)

func Auth(cfg *config.Config, db *gorm.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := auth.SessionTokenFromRequest(r)
			if token == "" {
				unauthorized(w, "autenticação necessária")
				return
			}
			claims, err := auth.ParseToken(cfg, token)
			if err != nil {
				unauthorized(w, err.Error())
				return
			}
			var user models.User
			if err := db.Preload("Secretariat").Preload("Cargo").
				Where("id = ? AND tenant_id = ? AND active = ?", claims.UserID, claims.TenantID, true).
				First(&user).Error; err != nil {
				unauthorized(w, "usuário inválido ou inativo")
				return
			}
			var tenant models.Tenant
			if err := db.Where("id = ? AND active = ?", claims.TenantID, true).First(&tenant).Error; err != nil {
				unauthorized(w, "prefeitura inválida ou inativa")
				return
			}
			ctx := context.WithValue(r.Context(), userKey, &user)
			ctx = context.WithValue(ctx, tenantKey, &tenant)
			ctx = context.WithValue(ctx, sessionKey, token)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func CurrentUser(r *http.Request) *models.User {
	if u, ok := r.Context().Value(userKey).(*models.User); ok {
		return u
	}
	return nil
}

func CurrentTenant(r *http.Request) *models.Tenant {
	if t, ok := r.Context().Value(tenantKey).(*models.Tenant); ok {
		return t
	}
	return nil
}

func CurrentSessionToken(r *http.Request) string {
	if token, ok := r.Context().Value(sessionKey).(string); ok {
		return token
	}
	return ""
}

func RequireRoles(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, role := range roles {
		allowed[role] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := CurrentUser(r)
			if user == nil || !allowed[user.Role] {
				denied(w)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func RequirePermission(code string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := CurrentUser(r)
			if user == nil || !user.HasPermission(code) {
				denied(w)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func denied(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": "seu perfil não tem permissão para esta ação"})
}

func unauthorized(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

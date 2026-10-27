package middleware

import (
	"crypto/hmac"
	"encoding/json"
	"net/http"

	"agora/backend/internal/auth"
	"agora/backend/internal/config"
)

func CSRF(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet, http.MethodHead, http.MethodOptions, http.MethodTrace:
				next.ServeHTTP(w, r)
				return
			}
			if r.URL.Path == "/api/auth/login" {
				next.ServeHTTP(w, r)
				return
			}

			sessionCookie, err := r.Cookie(auth.SessionCookieName)
			if err != nil || sessionCookie.Value == "" {
				next.ServeHTTP(w, r)
				return
			}

			header := r.Header.Get("X-CSRF-Token")
			expected := auth.CSRFToken(cfg, sessionCookie.Value)
			if header == "" || !hmac.Equal([]byte(header), []byte(expected)) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": "requisição rejeitada pela proteção CSRF"})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

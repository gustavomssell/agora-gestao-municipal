package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"agora/backend/internal/auth"
	"agora/backend/internal/config"
)

func TestCSRFProtection(t *testing.T) {
	cfg := &config.Config{JWTSecret: "test-secret"}
	session := "session-token"
	valid := auth.CSRFToken(cfg, session)

	tests := []struct {
		name       string
		method     string
		path       string
		cookie     bool
		header     string
		wantStatus int
	}{
		{name: "get is safe", method: http.MethodGet, path: "/api/projects", cookie: true, wantStatus: http.StatusOK},
		{name: "login is exempt", method: http.MethodPost, path: "/api/auth/login", wantStatus: http.StatusOK},
		{name: "request without session cookie is exempt", method: http.MethodPost, path: "/api/projects", header: valid, wantStatus: http.StatusOK},
		{name: "cookie without csrf is rejected", method: http.MethodPost, path: "/api/projects", cookie: true, wantStatus: http.StatusForbidden},
		{name: "invalid csrf is rejected", method: http.MethodPost, path: "/api/projects", cookie: true, header: "invalid", wantStatus: http.StatusForbidden},
		{name: "valid csrf is accepted", method: http.MethodPost, path: "/api/projects", cookie: true, header: valid, wantStatus: http.StatusOK},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			handler := CSRF(cfg)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}))
			req := httptest.NewRequest(tc.method, tc.path, nil)
			if tc.cookie {
				req.AddCookie(&http.Cookie{Name: auth.SessionCookieName, Value: session})
			}
			if tc.header != "" {
				req.Header.Set("X-CSRF-Token", tc.header)
			}
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != tc.wantStatus {
				t.Fatalf("esperava status %d, obteve %d", tc.wantStatus, rec.Code)
			}
		})
	}
}

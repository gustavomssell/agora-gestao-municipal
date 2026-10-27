package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"agora/backend/internal/config"
)

func TestSessionTokenFromRequestPrefersCookie(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	req.AddCookie(&http.Cookie{Name: SessionCookieName, Value: "cookie-token"})
	req.Header.Set("Authorization", "Bearer header-token")

	if got := SessionTokenFromRequest(req); got != "cookie-token" {
		t.Fatalf("esperava token do cookie, obteve %q", got)
	}
}

func TestSessionTokenFromRequestAcceptsBearer(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	req.Header.Set("Authorization", "Bearer header-token")

	if got := SessionTokenFromRequest(req); got != "header-token" {
		t.Fatalf("esperava token do header, obteve %q", got)
	}
}

func TestCSRFTokenIsDeterministicAndSessionBound(t *testing.T) {
	cfg := &config.Config{JWTSecret: "test-secret"}
	first := CSRFToken(cfg, "session-a")
	second := CSRFToken(cfg, "session-a")
	other := CSRFToken(cfg, "session-b")

	if first != second {
		t.Fatal("token CSRF deveria ser estável para a mesma sessão")
	}
	if first == other {
		t.Fatal("token CSRF deveria variar entre sessões")
	}
}

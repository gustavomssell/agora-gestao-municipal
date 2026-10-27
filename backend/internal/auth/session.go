package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"strings"
	"time"

	"agora/backend/internal/config"
)

const (
	SessionCookieName = "agora_session"
	SessionTTL        = 16 * time.Hour
)

func SessionTokenFromRequest(r *http.Request) string {
	if cookie, err := r.Cookie(SessionCookieName); err == nil && strings.TrimSpace(cookie.Value) != "" {
		return strings.TrimSpace(cookie.Value)
	}
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if len(header) > 7 && strings.EqualFold(header[:7], "Bearer ") {
		return strings.TrimSpace(header[7:])
	}
	return ""
}

func CSRFToken(cfg *config.Config, sessionToken string) string {
	mac := hmac.New(sha256.New, []byte(cfg.JWTSecret))
	mac.Write([]byte("agora-csrf:"))
	mac.Write([]byte(sessionToken))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

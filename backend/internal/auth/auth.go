package auth

import (
	"errors"
	"time"

	"agora/backend/internal/config"
	"agora/backend/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Claims struct {
	UserID        uint   `json:"uid"`
	TenantID      uint   `json:"tid"`
	Role          string `json:"role"`
	SecretariatID *uint  `json:"sid,omitempty"`
	Name          string `json:"name"`
	Email         string `json:"email"`
	TenantSlug    string `json:"tenant"`
	jwt.RegisteredClaims
}

func HashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(b), err
}

func CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func GenerateToken(cfg *config.Config, user *models.User, tenant *models.Tenant) (string, error) {
	claims := Claims{
		UserID:        user.ID,
		TenantID:      user.TenantID,
		Role:          user.Role,
		SecretariatID: user.SecretariatID,
		Name:          user.Name,
		Email:         user.Email,
		TenantSlug:    tenant.Slug,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(16 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "agora",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func ParseToken(cfg *config.Config, tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("método de assinatura inválido")
		}
		return []byte(cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("token inválido ou expirado")
	}
	return claims, nil
}

package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
)

const devJWTSecret = "agora-dev-secret-change-me-in-production"

type Config struct {
	AppEnv             string
	Port               string
	DatabaseURL        string
	UploadDir          string
	JWTSecret          string
	AllowedOrigins     string
	Seed               bool
	SeedPassword       string
	PublicBaseURL      string
	SMTPHost           string
	SMTPPort           int
	SMTPUser           string
	SMTPPass           string
	SMTPFrom           string
	WhatsAppWebhookURL string
}

func Load() *Config {
	_ = godotenv.Load()
	cfg := &Config{
		AppEnv:             env("APP_ENV", "development"),
		Port:               env("PORT", "8090"),
		DatabaseURL:        env("DATABASE_URL", "postgres://agora:agora@localhost:5434/agora?sslmode=disable"),
		UploadDir:          env("UPLOAD_DIR", filepath.Join("data", "uploads")),
		JWTSecret:          env("JWT_SECRET", devJWTSecret),
		AllowedOrigins:     env("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"),
		Seed:               env("SEED", "false") == "true",
		SeedPassword:       env("SEED_PASSWORD", ""),
		PublicBaseURL:      env("PUBLIC_BASE_URL", "http://localhost:5173"),
		SMTPHost:           env("SMTP_HOST", ""),
		SMTPPort:           envInt("SMTP_PORT", 587),
		SMTPUser:           env("SMTP_USER", ""),
		SMTPPass:           env("SMTP_PASS", ""),
		SMTPFrom:           env("SMTP_FROM", ""),
		WhatsAppWebhookURL: env("WHATSAPP_WEBHOOK_URL", ""),
	}
	_ = os.MkdirAll(cfg.UploadDir, 0o755)
	return cfg
}

func (c *Config) Validate() error {
	if c.Env() != "production" && c.Env() != "prod" {
		return nil
	}
	if c.JWTSecret == "" || c.JWTSecret == devJWTSecret || len(c.JWTSecret) < 32 {
		return errors.New("JWT_SECRET deve ser definido com pelo menos 32 caracteres em producao")
	}
	if strings.Contains(strings.ToLower(c.JWTSecret), "troque") || strings.Contains(strings.ToLower(c.JWTSecret), "change-me") {
		return errors.New("JWT_SECRET ainda usa um valor de exemplo")
	}
	if c.Seed {
		return errors.New("SEED deve ser false em producao")
	}
	if strings.Contains(c.AllowedOrigins, "localhost") || strings.Contains(c.AllowedOrigins, "127.0.0.1") {
		return errors.New("ALLOWED_ORIGINS nao deve conter enderecos locais em producao")
	}
	return nil
}

func (c *Config) Env() string {
	return strings.ToLower(strings.TrimSpace(c.AppEnv))
}

func (c *Config) IsProduction() bool {
	return c.Env() == "production" || c.Env() == "prod"
}

func (c *Config) UsesDefaultSecret() bool {
	return c.JWTSecret == "" || c.JWTSecret == devJWTSecret
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	var value int
	if _, err := fmt.Sscanf(raw, "%d", &value); err != nil {
		return fallback
	}
	return value
}

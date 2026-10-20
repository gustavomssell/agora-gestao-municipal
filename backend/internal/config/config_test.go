package config

import "testing"

func TestLoadDefaults(t *testing.T) {
	t.Setenv("UPLOAD_DIR", t.TempDir())
	t.Setenv("SEED", "")
	t.Setenv("APP_ENV", "")
	cfg := Load()
	if cfg.Seed {
		t.Fatal("seed must be disabled by default")
	}
	if cfg.Env() != "development" {
		t.Fatalf("unexpected env: %s", cfg.Env())
	}
	if !cfg.UsesDefaultSecret() {
		t.Fatal("expected default secret in development")
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("development config should be valid: %v", err)
	}
}

func TestValidateProduction(t *testing.T) {
	cfg := &Config{
		AppEnv:         "production",
		JWTSecret:      devJWTSecret,
		AllowedOrigins: "https://agora.example.gov.br",
		Seed:           true,
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected default secret and seed to be rejected in production")
	}

	cfg.JWTSecret = "0123456789abcdef0123456789abcdef"
	cfg.Seed = false
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected valid production config: %v", err)
	}

	cfg.JWTSecret = "troque-este-segredo-em-producao"
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected placeholder secret to be rejected in production")
	}
	cfg.JWTSecret = "0123456789abcdef0123456789abcdef"

	cfg.AllowedOrigins = "http://localhost:5173"
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected localhost origin to be rejected in production")
	}
}

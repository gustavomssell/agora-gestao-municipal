package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"agora/backend/internal/config"
	"agora/backend/internal/database"
	"agora/backend/internal/handlers"
	"agora/backend/internal/realtime"
	"agora/backend/internal/server"
)

func main() {
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("configuracao invalida: %v", err)
	}
	if cfg.UsesDefaultSecret() {
		log.Printf("aviso: JWT_SECRET padrao em uso; defina um segredo proprio antes de publicar")
	}

	db := database.Connect(cfg)
	if err := database.Migrate(db); err != nil {
		log.Fatalf("falha ao migrar banco de dados: %v", err)
	}
	if cfg.Seed {
		if err := database.Seed(db, cfg); err != nil {
			log.Printf("aviso: falha ao popular dados de demonstracao: %v", err)
		}
	}

	hub := realtime.NewHub(cfg.AllowedOrigins)
	app := handlers.New(db, cfg, hub)
	router := server.New(cfg, db, app)

	go func() {
		app.RunAlerts()
		ticker := time.NewTicker(6 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			app.RunAlerts()
		}
	}()
	go app.RunReportScheduler(context.Background())

	addr := ":" + cfg.Port
	httpServer := &http.Server{
		Addr:              addr,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		IdleTimeout:       2 * time.Minute,
		MaxHeaderBytes:    1 << 20,
	}
	log.Printf("Agora API disponivel em http://localhost%s", addr)
	log.Printf("uploads em %s | tempo real em ws://localhost%s/api/ws", cfg.UploadDir, addr)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("falha ao iniciar servidor: %v", err)
	}
}

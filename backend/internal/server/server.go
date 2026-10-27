package server

import (
	"encoding/json"
	"net/http"
	"strings"

	"agora/backend/internal/config"
	"agora/backend/internal/handlers"
	"agora/backend/internal/middleware"
	"agora/backend/internal/models"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"gorm.io/gorm"
)

func New(cfg *config.Config, db *gorm.DB, h *handlers.Handler) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(securityHeaders)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   strings.Split(cfg.AllowedOrigins, ","),
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Requested-With", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	r.Route("/api", func(r chi.Router) {
		r.Get("/public/tenants", h.PublicTenants)
		r.Get("/public/{slug}/transparency", h.PublicTransparency)
		r.Get("/public/{slug}/transparency/projects/{id}", h.PublicProjectDetail)
		r.Post("/auth/login", h.Login)
		r.Get("/ws", h.WebSocket)

		r.Group(func(r chi.Router) {
			r.Use(middleware.CSRF(cfg))
			r.Post("/auth/logout", h.Logout)
		})

		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(cfg, db))
			r.Use(middleware.CSRF(cfg))

			r.Get("/auth/me", h.Me)
			r.Get("/auth/csrf", h.CSRF)
			r.Post("/auth/change-password", h.ChangePassword)
			r.Put("/auth/profile", h.UpdateProfile)
			r.Get("/auth/notification-preferences", h.GetNotificationPreferences)
			r.Put("/auth/notification-preferences", h.UpdateNotificationPreferences)

			r.Get("/dashboard", h.Dashboard)
			r.Get("/search", h.GlobalSearch)

			r.Get("/suppliers", h.ListSuppliers)
			r.Post("/suppliers", h.CreateSupplier)
			r.Put("/suppliers/{id}", h.UpdateSupplier)

			r.Get("/templates", h.ListTemplates)
			r.Post("/templates", h.CreateTemplate)
			r.Put("/templates/{id}", h.UpdateTemplate)
			r.Delete("/templates/{id}", h.DeleteTemplate)

			r.Get("/projects", h.ListProjects)
			r.Post("/projects", h.CreateProject)
			r.Get("/projects/kanban", h.Kanban)
			r.Get("/projects/gantt", h.Gantt)
			r.Get("/projects/{id}", h.GetProject)
			r.Put("/projects/{id}", h.UpdateProject)
			r.Delete("/projects/{id}", h.DeleteProject)
			r.Patch("/projects/{id}/status", h.ChangeProjectStatus)
			r.Post("/projects/{id}/transfer", h.TransferProject)
			r.Get("/projects/{id}/history", h.ProjectHistory)

			r.Get("/projects/{id}/approvals", h.ListApprovals)
			r.Post("/approvals/{id}/decide", h.DecideApproval)
			r.Post("/approvals/{id}/reset", h.ResetApproval)

			r.Get("/projects/{id}/finance", h.ListFinance)
			r.Post("/projects/{id}/budget-lines", h.CreateBudgetLine)
			r.Put("/budget-lines/{id}", h.UpdateBudgetLine)
			r.Delete("/budget-lines/{id}", h.DeleteBudgetLine)
			r.Post("/projects/{id}/commitments", h.CreateCommitment)
			r.Put("/commitments/{id}", h.UpdateCommitment)
			r.Delete("/commitments/{id}", h.DeleteCommitment)
			r.Post("/commitments/{id}/payments", h.CreatePayment)
			r.Delete("/payments/{id}", h.DeletePayment)
			r.Post("/projects/{id}/contracts", h.CreateContract)
			r.Put("/contracts/{id}", h.UpdateContract)
			r.Delete("/contracts/{id}", h.DeleteContract)

			r.Get("/projects/{id}/documents", h.ListProjectDocuments)
			r.Post("/projects/{id}/documents", h.CreateProjectDocument)
			r.Put("/documents/{id}", h.UpdateProjectDocument)
			r.Delete("/documents/{id}", h.DeleteProjectDocument)

			r.Get("/projects/{id}/dependencies", h.ListDependencies)
			r.Post("/projects/{id}/dependencies", h.CreateDependency)
			r.Delete("/dependencies/{id}", h.DeleteDependency)
			r.Get("/projects/{id}/milestones", h.ListMilestones)
			r.Post("/projects/{id}/milestones", h.CreateMilestone)
			r.Put("/milestones/{id}", h.UpdateMilestone)
			r.Delete("/milestones/{id}", h.DeleteMilestone)
			r.Get("/projects/{id}/indicators", h.ListIndicators)
			r.Post("/projects/{id}/indicators", h.CreateIndicator)
			r.Put("/indicators/{id}", h.UpdateIndicator)
			r.Delete("/indicators/{id}", h.DeleteIndicator)

			r.Get("/projects/{id}/stakeholders", h.ListStakeholders)
			r.Post("/projects/{id}/stakeholders", h.CreateStakeholder)
			r.Put("/stakeholders/{id}", h.UpdateStakeholder)
			r.Delete("/stakeholders/{id}", h.DeleteStakeholder)

			r.Get("/projects/{id}/activities", h.ListActivities)
			r.Post("/projects/{id}/activities", h.CreateActivity)
			r.Put("/activities/{id}", h.UpdateActivity)
			r.Delete("/activities/{id}", h.DeleteActivity)

			r.Get("/projects/{id}/risks", h.ListRisks)
			r.Post("/projects/{id}/risks", h.CreateRisk)
			r.Put("/risks/{id}", h.UpdateRisk)
			r.Delete("/risks/{id}", h.DeleteRisk)

			r.Get("/projects/{id}/actions", h.ListActions)
			r.Post("/projects/{id}/actions", h.CreateAction)
			r.Put("/actions/{id}", h.UpdateAction)
			r.Delete("/actions/{id}", h.DeleteAction)

			r.Get("/projects/{id}/swot", h.ListSwot)
			r.Post("/projects/{id}/swot", h.CreateSwot)
			r.Delete("/swot/{id}", h.DeleteSwot)

			r.Get("/projects/{id}/lessons", h.ListProjectLessons)
			r.Post("/projects/{id}/lessons", h.CreateLesson)
			r.Get("/lessons", h.GlobalLessons)
			r.Delete("/lessons/{id}", h.DeleteLesson)

			r.Get("/projects/{id}/attachments", h.ListAttachments)
			r.Post("/projects/{id}/attachments", h.UploadAttachment)
			r.Get("/activities/{id}/attachments", h.ListActivityAttachments)
			r.Post("/activities/{id}/attachments", h.UploadActivityAttachment)
			r.Get("/attachments/{id}/download", h.DownloadAttachment)
			r.Delete("/attachments/{id}", h.DeleteAttachment)

			r.Get("/reports/projects.xlsx", h.ExportProjectsXLSX)
			r.Get("/reports/projects.pdf", h.ExportProjectsPDF)
			r.Get("/reports/summary", h.ReportSummary)
			r.Get("/reports/saved", h.ListSavedReports)
			r.Post("/reports/saved", h.CreateSavedReport)
			r.Delete("/reports/saved/{id}", h.DeleteSavedReport)
			r.Post("/reports/schedules", h.CreateReportSchedule)
			r.Put("/reports/schedules/{id}", h.UpdateReportSchedule)
			r.Delete("/reports/schedules/{id}", h.DeleteReportSchedule)

			r.Get("/notifications", h.ListNotifications)
			r.Post("/notifications/{id}/read", h.MarkNotificationRead)
			r.Post("/notifications/read-all", h.MarkAllNotificationsRead)

			r.Get("/secretariats", h.ListSecretariats)
			r.Get("/cargos", h.ListCargos)

			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRoles(models.RoleAdmin))
				r.Get("/permissions", h.ListPermissions)
				r.Get("/users", h.ListUsers)
				r.Post("/users", h.CreateUser)
				r.Put("/users/{id}", h.UpdateUser)
				r.Get("/logs", h.ListLogs)
				r.Get("/logs/export", h.ExportLogsCSV)
				r.Put("/settings/branding", h.UpdateBranding)

				r.Post("/secretariats", h.CreateSecretariat)
				r.Put("/secretariats/{id}", h.UpdateSecretariat)
				r.Delete("/secretariats/{id}", h.DeleteSecretariat)

				r.Post("/cargos", h.CreateCargo)
				r.Put("/cargos/{id}", h.UpdateCargo)
				r.Delete("/cargos/{id}", h.DeleteCargo)
			})
		})
	})

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "recurso não encontrado"})
	})

	return r
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		next.ServeHTTP(w, r)
	})
}

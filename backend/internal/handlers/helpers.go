package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"agora/backend/internal/config"
	"agora/backend/internal/middleware"
	"agora/backend/internal/models"
	"agora/backend/internal/realtime"

	"gorm.io/gorm"
)

type Handler struct {
	DB  *gorm.DB
	Cfg *config.Config
	Hub *realtime.Hub
}

func New(db *gorm.DB, cfg *config.Config, hub *realtime.Hub) *Handler {
	return &Handler{DB: db, Cfg: cfg, Hub: hub}
}

func (h *Handler) publish(event realtime.Event) {
	if h.Hub == nil {
		return
	}
	h.Hub.Publish(event)
}

func respond(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

func fail(w http.ResponseWriter, status int, message string) {
	respond(w, status, map[string]string{"error": message})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		fail(w, http.StatusBadRequest, "dados inválidos no corpo da requisição")
		return false
	}
	return true
}

func (h *Handler) projectScope(user *models.User) *gorm.DB {
	q := h.DB.Model(&models.Project{}).Where("projects.tenant_id = ?", user.TenantID)
	if user.IsAdmin() || user.IsGoverno() {
		return q
	}
	if user.SecretariatID != nil {
		sub := h.DB.Table("project_secretariats").Select("project_id").Where("secretariat_id = ?", *user.SecretariatID)
		return q.Where(
			"projects.responsible_secretariat_id = ? OR projects.created_by_id = ? OR projects.id IN (?)",
			*user.SecretariatID, user.ID, sub,
		)
	}
	return q.Where("projects.created_by_id = ?", user.ID)
}

func (h *Handler) projectVisibleTo(project *models.Project, user *models.User) bool {
	if project.TenantID != user.TenantID {
		return false
	}
	if user.IsAdmin() || user.IsGoverno() || project.CreatedByID == user.ID {
		return true
	}
	if user.SecretariatID == nil {
		return false
	}
	if project.ResponsibleSecretariatID == *user.SecretariatID {
		return true
	}
	for _, s := range project.Secretariats {
		if s.ID == *user.SecretariatID {
			return true
		}
	}
	return false
}

func (h *Handler) loadVisibleProject(user *models.User, id uint) (*models.Project, error) {
	var project models.Project
	err := h.DB.Preload("ResponsibleSecretariat").
		Preload("Secretariats").
		Preload("CreatedBy").
		Where("id = ? AND tenant_id = ?", id, user.TenantID).
		First(&project).Error
	if err != nil {
		return nil, err
	}
	if !h.projectVisibleTo(&project, user) {
		return nil, errors.New("projeto não encontrado")
	}
	return &project, nil
}

func canEditProject(user *models.User, project *models.Project) bool {
	if user.IsAdmin() {
		return true
	}
	if !user.HasPermission(models.PermProjectsEdit) || user.SecretariatID == nil {
		return false
	}
	return project.ResponsibleSecretariatID == *user.SecretariatID
}

func canManageProject(user *models.User, project *models.Project) bool {
	if user.IsAdmin() {
		return true
	}
	if !user.HasPermission(models.PermProjectsEdit) {
		return false
	}
	return user.SecretariatID != nil && project.ResponsibleSecretariatID == *user.SecretariatID
}

func canTransferProject(user *models.User, project *models.Project) bool {
	if user.IsAdmin() {
		return true
	}
	if !user.HasPermission(models.PermProjectsTransfer) {
		return false
	}
	return user.SecretariatID != nil && project.ResponsibleSecretariatID == *user.SecretariatID
}

func (h *Handler) audit(r *http.Request, action, entity string, entityID uint, details string) {
	user := middleware.CurrentUser(r)
	tenant := middleware.CurrentTenant(r)
	if user == nil || tenant == nil {
		return
	}
	_ = h.DB.Create(&models.AuditLog{
		TenantID: tenant.ID,
		UserID:   user.ID,
		UserName: user.Name,
		Action:   action,
		Entity:   entity,
		EntityID: entityID,
		Details:  details,
		IP:       clientIP(r),
	}).Error
	switch entity {
	case "projeto":
		h.publish(realtime.Event{
			Type:      realtime.EventProjectChanged,
			Action:    action,
			TenantID:  tenant.ID,
			ProjectID: entityID,
			Payload:   map[string]any{"details": details},
		})
	case "secretaria", "cargo", "usuario", "prefeitura":
		h.publish(realtime.Event{
			Type:     realtime.EventSettingsChanged,
			Action:   action,
			TenantID: tenant.ID,
			Payload:  map[string]any{"entity": entity, "entity_id": entityID, "details": details},
		})
	}
}

func (h *Handler) notifyUsers(tenantID uint, userIDs []uint, title, message, kind, link string) {
	seen := map[uint]bool{}
	for _, id := range userIDs {
		if id == 0 || seen[id] {
			continue
		}
		seen[id] = true
		notification := models.Notification{
			TenantID: tenantID,
			UserID:   id,
			Title:    title,
			Message:  message,
			Type:     kind,
			Link:     link,
		}
		if err := h.DB.Create(&notification).Error; err != nil {
			continue
		}
		h.publish(realtime.Event{
			Type:     realtime.EventNotificationCreated,
			Action:   kind,
			TenantID: tenantID,
			UserID:   id,
			Payload:  notification,
		})
		go h.deliverNotification(&notification)
	}
}

func (h *Handler) notifySecretariat(tenantID, secretariatID uint, title, message, kind, link string) {
	var ids []uint
	h.DB.Model(&models.User{}).
		Where("tenant_id = ? AND secretariat_id = ? AND active = ?", tenantID, secretariatID, true).
		Pluck("id", &ids)
	h.notifyUsers(tenantID, ids, title, message, kind, link)
}

func (h *Handler) notifyProjectInvolved(project *models.Project, excludeUserID uint, title, message, kind, link string) {
	var ids []uint
	secrets := map[uint]bool{project.ResponsibleSecretariatID: true}
	for _, s := range project.Secretariats {
		secrets[s.ID] = true
	}
	secretIDs := make([]uint, 0, len(secrets))
	for id := range secrets {
		secretIDs = append(secretIDs, id)
	}
	if len(secretIDs) > 0 {
		h.DB.Model(&models.User{}).
			Where("tenant_id = ? AND active = ? AND secretariat_id IN ?", project.TenantID, true, secretIDs).
			Pluck("id", &ids)
	}
	filtered := ids[:0]
	for _, id := range ids {
		if id != excludeUserID {
			filtered = append(filtered, id)
		}
	}
	h.notifyUsers(project.TenantID, filtered, title, message, kind, link)
}

func (h *Handler) notifyOnceToday(userID uint, kind, link, title, message string) bool {
	tenantID := uint(0)
	var user models.User
	if err := h.DB.Select("id, tenant_id").First(&user, userID).Error; err == nil {
		tenantID = user.TenantID
	}
	if userID == 0 || tenantID == 0 {
		return false
	}
	start := startOfDay(time.Now())
	var count int64
	h.DB.Model(&models.Notification{}).
		Where("user_id = ? AND type = ? AND link = ? AND created_at >= ?", userID, kind, link, start).
		Count(&count)
	if count > 0 {
		return false
	}
	h.notifyUsers(tenantID, []uint{userID}, title, message, kind, link)
	return true
}

func clientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		return strings.TrimSpace(strings.Split(fwd, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

func parseDateValue(raw *string) (*time.Time, error) {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil, nil
	}
	s := strings.TrimSpace(*raw)
	layouts := []string{"2006-01-02", time.RFC3339, "2006-01-02T15:04:05", "02/01/2006"}
	for _, layout := range layouts {
		if t, err := time.ParseInLocation(layout, s, time.Local); err == nil {
			return &t, nil
		}
	}
	return nil, fmt.Errorf("data inválida: %s", s)
}

func dateString(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02")
}

func startOfDay(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

func queryInt(r *http.Request, key string, fallback int) int {
	v, err := strconv.Atoi(r.URL.Query().Get(key))
	if err != nil {
		return fallback
	}
	return v
}

func queryUint(r *http.Request, key string) uint {
	v, err := strconv.ParseUint(r.URL.Query().Get(key), 10, 64)
	if err != nil {
		return 0
	}
	return uint(v)
}

func contains(values []string, value string) bool {
	for _, v := range values {
		if v == value {
			return true
		}
	}
	return false
}

package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/smtp"
	"strings"
	"time"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"
	"agora/backend/internal/realtime"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	q := h.DB.Where("tenant_id = ? AND user_id = ?", user.TenantID, user.ID)
	if r.URL.Query().Get("unread") == "true" {
		q = q.Where("read_at IS NULL")
	}
	var items []models.Notification
	if err := q.Order("created_at desc").Limit(100).Find(&items).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível carregar as notificações")
		return
	}
	var unread int64
	h.DB.Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND read_at IS NULL", user.TenantID, user.ID).
		Count(&unread)
	respond(w, http.StatusOK, map[string]any{"items": items, "unread_count": unread})
}

func (h *Handler) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var notification models.Notification
	if err := h.DB.Where("id = ? AND tenant_id = ? AND user_id = ?",
		parseID(chi.URLParam(r, "id")), user.TenantID, user.ID).
		First(&notification).Error; err != nil {
		fail(w, http.StatusNotFound, "notificação não encontrada")
		return
	}
	if notification.ReadAt == nil {
		now := time.Now()
		h.DB.Model(&notification).Update("read_at", now)
	}
	h.publish(realtime.Event{
		Type:     realtime.EventNotificationRead,
		Action:   "NOTIFICACAO_LIDA",
		TenantID: user.TenantID,
		UserID:   user.ID,
		Payload:  map[string]any{"id": notification.ID, "all": false},
	})
	respond(w, http.StatusOK, map[string]string{"message": "notificação lida"})
}

func (h *Handler) MarkAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	now := time.Now()
	h.DB.Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND read_at IS NULL", user.TenantID, user.ID).
		Update("read_at", now)
	h.publish(realtime.Event{
		Type:     realtime.EventNotificationRead,
		Action:   "NOTIFICACOES_LIDAS",
		TenantID: user.TenantID,
		UserID:   user.ID,
		Payload:  map[string]any{"all": true},
	})
	respond(w, http.StatusOK, map[string]string{"message": "notificações marcadas como lidas"})
}

type notificationPreferenceRequest struct {
	Phone          string `json:"phone"`
	NotifyEmail    bool   `json:"notify_email"`
	NotifyWhatsApp bool   `json:"notify_whatsapp"`
}

func (h *Handler) GetNotificationPreferences(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	respond(w, http.StatusOK, map[string]any{
		"phone": user.Phone, "notify_email": user.NotifyEmail, "notify_whatsapp": user.NotifyWhatsApp,
		"email_configured": h.Cfg.SMTPHost != "", "whatsapp_configured": h.Cfg.WhatsAppWebhookURL != "",
	})
}

func (h *Handler) UpdateNotificationPreferences(w http.ResponseWriter, r *http.Request) {
	var req notificationPreferenceRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Phone = strings.TrimSpace(req.Phone)
	if req.NotifyWhatsApp && req.Phone == "" {
		fail(w, http.StatusBadRequest, "informe o telefone para receber mensagens no WhatsApp")
		return
	}
	user := middleware.CurrentUser(r)
	if err := h.DB.Model(user).Updates(map[string]any{
		"phone": req.Phone, "notify_email": req.NotifyEmail, "notify_whats_app": req.NotifyWhatsApp,
	}).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível salvar as preferências")
		return
	}
	user.Phone = req.Phone
	user.NotifyEmail = req.NotifyEmail
	user.NotifyWhatsApp = req.NotifyWhatsApp
	h.audit(r, "PREFERENCIAS_NOTIFICACAO_ATUALIZADAS", "usuario", user.ID, "Preferências de notificação atualizadas")
	respond(w, http.StatusOK, map[string]any{
		"phone": user.Phone, "notify_email": user.NotifyEmail, "notify_whatsapp": user.NotifyWhatsApp,
	})
}

func (h *Handler) deliverNotification(notification *models.Notification) {
	var user models.User
	if err := h.DB.Select("id, tenant_id, name, email, phone, notify_email, notify_whats_app").
		First(&user, notification.UserID).Error; err != nil {
		return
	}
	if user.NotifyEmail && user.Email != "" {
		status, errText := h.sendNotificationEmail(&user, notification)
		h.recordDelivery(notification, user.ID, "EMAIL", status, errText)
	}
	if user.NotifyWhatsApp && user.Phone != "" {
		status, errText := h.sendNotificationWhatsApp(&user, notification)
		h.recordDelivery(notification, user.ID, "WHATSAPP", status, errText)
	}
}

func (h *Handler) recordDelivery(notification *models.Notification, userID uint, channel, status, errText string) {
	_ = h.DB.Create(&models.NotificationDelivery{
		TenantID: notification.TenantID, NotificationID: notification.ID, UserID: userID,
		Channel: channel, Status: status, Error: errText,
	}).Error
}

func (h *Handler) sendNotificationEmail(user *models.User, notification *models.Notification) (string, string) {
	if h.Cfg.SMTPHost == "" || h.Cfg.SMTPFrom == "" {
		return "SEM_CONFIGURACAO", "SMTP nao configurado"
	}
	from := h.Cfg.SMTPFrom
	to := user.Email
	subject := notification.Title
	body := notification.Message
	if notification.Link != "" {
		body += "\n\n" + strings.TrimRight(h.Cfg.PublicBaseURL, "/") + notification.Link
	}
	headers := []string{
		"From: " + from,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
	}
	message := []byte(strings.Join(headers, "\r\n") + "\r\n\r\n" + body)
	addr := fmt.Sprintf("%s:%d", h.Cfg.SMTPHost, h.Cfg.SMTPPort)
	var auth smtp.Auth
	if h.Cfg.SMTPUser != "" {
		auth = smtp.PlainAuth("", h.Cfg.SMTPUser, h.Cfg.SMTPPass, h.Cfg.SMTPHost)
	}
	if err := smtp.SendMail(addr, auth, from, []string{to}, message); err != nil {
		return "ERRO", err.Error()
	}
	return "ENVIADO", ""
}

func (h *Handler) sendNotificationWhatsApp(user *models.User, notification *models.Notification) (string, string) {
	if h.Cfg.WhatsAppWebhookURL == "" {
		return "SEM_CONFIGURACAO", "webhook de WhatsApp nao configurado"
	}
	payload := map[string]any{
		"to": user.Phone, "title": notification.Title, "message": notification.Message,
		"link": strings.TrimRight(h.Cfg.PublicBaseURL, "/") + notification.Link, "name": user.Name,
	}
	raw, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, h.Cfg.WhatsAppWebhookURL, bytes.NewReader(raw))
	if err != nil {
		return "ERRO", err.Error()
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "ERRO", err.Error()
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "ERRO", fmt.Sprintf("webhook respondeu %d", resp.StatusCode)
	}
	return "ENVIADO", ""
}

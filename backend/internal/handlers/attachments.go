package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"agora/backend/internal/middleware"
	"agora/backend/internal/models"

	"github.com/go-chi/chi/v5"
)

const maxUploadSize = 10 << 20

var allowedExtensions = map[string]bool{
	".pdf": true, ".png": true, ".jpg": true, ".jpeg": true, ".webp": true,
	".doc": true, ".docx": true, ".xls": true, ".xlsx": true,
	".txt": true, ".csv": true, ".odt": true, ".ods": true,
}

func (h *Handler) ListAttachments(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	var items []models.Attachment
	h.DB.Preload("UploadedBy").
		Where("project_id = ? AND activity_id IS NULL", project.ID).
		Order("created_at desc").
		Find(&items)
	respond(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) ListActivityAttachments(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	activity, _, err := h.loadVisibleActivity(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "atividade não encontrada")
		return
	}
	var items []models.Attachment
	h.DB.Preload("UploadedBy").
		Where("activity_id = ?", activity.ID).
		Order("created_at desc").
		Find(&items)
	respond(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) UploadAttachment(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	project, err := h.loadVisibleProject(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "projeto não encontrado")
		return
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode anexar documentos")
		return
	}
	attachment, ok := h.storeAttachment(w, r, project, nil)
	if !ok {
		return
	}
	h.audit(r, "ANEXO_ENVIADO", "projeto", project.ID, fmt.Sprintf("Arquivo \"%s\" anexado", attachment.Name))
	respond(w, http.StatusCreated, map[string]any{"attachment": attachment})
}

func (h *Handler) UploadActivityAttachment(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	activity, project, err := h.loadVisibleActivity(user, parseID(chi.URLParam(r, "id")))
	if err != nil {
		fail(w, http.StatusNotFound, "atividade não encontrada")
		return
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode anexar documentos")
		return
	}
	attachment, ok := h.storeAttachment(w, r, project, &activity.ID)
	if !ok {
		return
	}
	detail := fmt.Sprintf("Arquivo \"%s\" anexado à atividade \"%s\"", attachment.Name, activity.Title)
	h.audit(r, "ANEXO_ENVIADO", "projeto", project.ID, detail)
	respond(w, http.StatusCreated, map[string]any{"attachment": attachment})
}

func (h *Handler) storeAttachment(w http.ResponseWriter, r *http.Request, project *models.Project, activityID *uint) (*models.Attachment, bool) {
	user := middleware.CurrentUser(r)
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize+1<<20)
	if err := r.ParseMultipartForm(maxUploadSize + 1<<20); err != nil {
		fail(w, http.StatusBadRequest, "arquivo acima de 10 MB ou formulário inválido")
		return nil, false
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		fail(w, http.StatusBadRequest, "selecione um arquivo")
		return nil, false
	}
	defer file.Close()
	if header.Size > maxUploadSize {
		fail(w, http.StatusBadRequest, "o arquivo deve ter no máximo 10 MB")
		return nil, false
	}
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedExtensions[ext] {
		fail(w, http.StatusBadRequest, "formato não permitido; envie PDF, imagem, planilha, documento ou texto")
		return nil, false
	}
	random := make([]byte, 16)
	if _, err := rand.Read(random); err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível processar o arquivo")
		return nil, false
	}
	storedName := hex.EncodeToString(random) + ext
	destination := filepath.Join(h.Cfg.UploadDir, storedName)
	out, err := os.Create(destination)
	if err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível salvar o arquivo")
		return nil, false
	}
	if _, err := io.Copy(out, file); err != nil {
		out.Close()
		_ = os.Remove(destination)
		fail(w, http.StatusInternalServerError, "não foi possível salvar o arquivo")
		return nil, false
	}
	out.Close()

	version := 1
	if raw := strings.TrimSpace(r.FormValue("version")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 {
			_ = os.Remove(destination)
			fail(w, http.StatusBadRequest, "versão do documento inválida")
			return nil, false
		}
		version = parsed
	}

	attachment := models.Attachment{
		TenantID:     user.TenantID,
		ProjectID:    project.ID,
		ActivityID:   activityID,
		Name:         header.Filename,
		StoredName:   storedName,
		MimeType:     header.Header.Get("Content-Type"),
		Size:         header.Size,
		Category:     strings.TrimSpace(r.FormValue("category")),
		Description:  strings.TrimSpace(r.FormValue("description")),
		Version:      version,
		UploadedByID: user.ID,
	}
	expiresRaw := strings.TrimSpace(r.FormValue("expires_at"))
	if expiresRaw != "" {
		expiresAt, err := parseDateValue(&expiresRaw)
		if err != nil {
			_ = os.Remove(destination)
			fail(w, http.StatusBadRequest, "validade do documento inválida")
			return nil, false
		}
		attachment.ExpiresAt = expiresAt
	}
	if err := h.DB.Create(&attachment).Error; err != nil {
		_ = os.Remove(destination)
		fail(w, http.StatusInternalServerError, "não foi possível registrar o anexo")
		return nil, false
	}
	h.DB.Preload("UploadedBy").First(&attachment, attachment.ID)
	return &attachment, true
}

func (h *Handler) DownloadAttachment(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var attachment models.Attachment
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&attachment).Error; err != nil {
		fail(w, http.StatusNotFound, "anexo não encontrado")
		return
	}
	if _, err := h.loadVisibleProject(user, attachment.ProjectID); err != nil {
		fail(w, http.StatusNotFound, "anexo não encontrado")
		return
	}
	path := filepath.Join(h.Cfg.UploadDir, attachment.StoredName)
	if _, err := os.Stat(path); err != nil {
		fail(w, http.StatusNotFound, "arquivo não encontrado no armazenamento")
		return
	}
	safeName := strings.ReplaceAll(attachment.Name, "\"", "")
	w.Header().Set("Content-Disposition",
		fmt.Sprintf("attachment; filename=\"%s\"; filename*=UTF-8''%s", safeName, url.QueryEscape(attachment.Name)))
	if attachment.MimeType != "" {
		w.Header().Set("Content-Type", attachment.MimeType)
	}
	http.ServeFile(w, r, path)
}

func (h *Handler) DeleteAttachment(w http.ResponseWriter, r *http.Request) {
	user := middleware.CurrentUser(r)
	var attachment models.Attachment
	if err := h.DB.Where("id = ? AND tenant_id = ?", parseID(chi.URLParam(r, "id")), user.TenantID).
		First(&attachment).Error; err != nil {
		fail(w, http.StatusNotFound, "anexo não encontrado")
		return
	}
	project, err := h.loadVisibleProject(user, attachment.ProjectID)
	if err != nil {
		fail(w, http.StatusNotFound, "anexo não encontrado")
		return
	}
	if !canEditProject(user, project) {
		fail(w, http.StatusForbidden, "somente a secretaria responsável pode remover anexos")
		return
	}
	if err := h.DB.Delete(&attachment).Error; err != nil {
		fail(w, http.StatusInternalServerError, "não foi possível remover o anexo")
		return
	}
	_ = os.Remove(filepath.Join(h.Cfg.UploadDir, attachment.StoredName))
	h.audit(r, "ANEXO_EXCLUIDO", "projeto", project.ID, fmt.Sprintf("Arquivo \"%s\" removido", attachment.Name))
	respond(w, http.StatusOK, map[string]string{"message": "anexo removido"})
}

func (h *Handler) loadVisibleActivity(user *models.User, id uint) (*models.Activity, *models.Project, error) {
	var activity models.Activity
	if err := h.DB.Where("id = ? AND tenant_id = ?", id, user.TenantID).First(&activity).Error; err != nil {
		return nil, nil, err
	}
	project, err := h.loadVisibleProject(user, activity.ProjectID)
	if err != nil {
		return nil, nil, err
	}
	return &activity, project, nil
}

package realtime

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 4096
	sendBuffer     = 32
)

const (
	EventProjectChanged      = "project.changed"
	EventSettingsChanged     = "settings.changed"
	EventNotificationCreated = "notification.created"
	EventNotificationRead    = "notification.read"
)

type Event struct {
	Type      string    `json:"type"`
	Action    string    `json:"action,omitempty"`
	TenantID  uint      `json:"tenant_id"`
	UserID    uint      `json:"user_id,omitempty"`
	ProjectID uint      `json:"project_id,omitempty"`
	Payload   any       `json:"payload,omitempty"`
	At        time.Time `json:"at"`
}

type client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	tenantID uint
	userID   uint
}

type Hub struct {
	mu       sync.RWMutex
	rooms    map[uint]map[*client]struct{}
	upgrader websocket.Upgrader
}

func NewHub(allowedOrigins string) *Hub {
	origins := make(map[string]bool)
	for _, origin := range strings.Split(allowedOrigins, ",") {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			origins[origin] = true
		}
	}
	return &Hub{
		rooms: make(map[uint]map[*client]struct{}),
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				if len(origins) == 0 {
					return true
				}
				origin := r.Header.Get("Origin")
				if origin == "" {
					return true
				}
				return origins[origin]
			},
		},
	}
}

func (h *Hub) Publish(event Event) {
	if event.At.IsZero() {
		event.At = time.Now()
	}
	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("realtime: falha ao serializar evento %s: %v", event.Type, err)
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.rooms[event.TenantID] {
		if event.UserID != 0 && c.userID != event.UserID {
			continue
		}
		select {
		case c.send <- payload:
		default:
			go c.close()
		}
	}
}

func (h *Hub) Serve(w http.ResponseWriter, r *http.Request, tenantID, userID uint) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	c := &client{hub: h, conn: conn, send: make(chan []byte, sendBuffer), tenantID: tenantID, userID: userID}
	h.register(c)
	go c.writePump()
	c.readPump()
}

func (h *Hub) register(c *client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[c.tenantID] == nil {
		h.rooms[c.tenantID] = make(map[*client]struct{})
	}
	h.rooms[c.tenantID][c] = struct{}{}
}

func (h *Hub) unregister(c *client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if room, ok := h.rooms[c.tenantID]; ok {
		if _, ok := room[c]; ok {
			delete(room, c)
			close(c.send)
			if len(room) == 0 {
				delete(h.rooms, c.tenantID)
			}
		}
	}
}

func (c *client) close() {
	c.hub.unregister(c)
	_ = c.conn.Close()
}

func (c *client) readPump() {
	defer c.close()
	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		if strings.EqualFold(strings.TrimSpace(string(message)), "ping") {
			_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		}
	}
}

func (c *client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

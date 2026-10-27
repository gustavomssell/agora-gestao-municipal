package database

import (
	"fmt"
	"io/fs"
	"log"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"agora/backend/migrations"

	"gorm.io/gorm"
)

var migrationFilePattern = regexp.MustCompile(`^([0-9]+)_.+\.sql$`)

type migration struct {
	version int64
	name    string
}

func Migrate(db *gorm.DB) error {
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS public.schema_migrations (
			version BIGINT PRIMARY KEY,
			name TEXT NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`).Error; err != nil {
		return fmt.Errorf("criar tabela schema_migrations: %w", err)
	}

	entries, err := fs.ReadDir(migrations.Files, ".")
	if err != nil {
		return fmt.Errorf("ler migrações: %w", err)
	}

	list := make([]migration, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		matches := migrationFilePattern.FindStringSubmatch(entry.Name())
		if matches == nil {
			continue
		}
		version, err := strconv.ParseInt(matches[1], 10, 64)
		if err != nil {
			return fmt.Errorf("versão inválida na migração %s: %w", entry.Name(), err)
		}
		list = append(list, migration{version: version, name: entry.Name()})
	}
	sort.Slice(list, func(i, j int) bool { return list[i].version < list[j].version })

	applied := make(map[int64]bool)
	rows, err := db.Raw("SELECT version FROM public.schema_migrations").Rows()
	if err != nil {
		return fmt.Errorf("consultar migrações aplicadas: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var version int64
		if err := rows.Scan(&version); err != nil {
			return fmt.Errorf("ler migração aplicada: %w", err)
		}
		applied[version] = true
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("ler migrações aplicadas: %w", err)
	}

	if len(applied) == 0 && len(list) > 0 {
		var legacySchema bool
		if err := db.Raw("SELECT to_regclass('public.tenants') IS NOT NULL").Scan(&legacySchema).Error; err != nil {
			return fmt.Errorf("verificar schema legado: %w", err)
		}
		if legacySchema {
			first := list[0]
			if err := db.Exec(
				"INSERT INTO public.schema_migrations (version, name) VALUES (?, ?)",
				first.version,
				first.name,
			).Error; err != nil {
				return fmt.Errorf("registrar schema legado: %w", err)
			}
			applied[first.version] = true
			log.Printf("migração marcada como aplicada (schema existente): %s", first.name)
		}
	}

	for _, item := range list {
		if applied[item.version] {
			continue
		}
		body, err := migrations.Files.ReadFile(item.name)
		if err != nil {
			return fmt.Errorf("ler migração %s: %w", item.name, err)
		}
		if strings.TrimSpace(string(body)) == "" {
			return fmt.Errorf("migração vazia: %s", item.name)
		}
		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec(string(body)).Error; err != nil {
				return err
			}
			return tx.Exec(
				"INSERT INTO public.schema_migrations (version, name) VALUES (?, ?)",
				item.version,
				item.name,
			).Error
		})
		if err != nil {
			return fmt.Errorf("migração %s falhou: %w", item.name, err)
		}
		log.Printf("migração aplicada: %s", item.name)
	}

	return nil
}

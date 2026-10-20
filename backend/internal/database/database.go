package database

import (
	"log"
	"time"

	"agora/backend/internal/config"
	"agora/backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg *config.Config) *gorm.DB {
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		Logger:  logger.Default.LogMode(logger.Warn),
		NowFunc: func() time.Time { return time.Now().Local() },
	})
	if err != nil {
		log.Fatalf("falha ao conectar no PostgreSQL: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("falha ao obter o pool de conexões: %v", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	return db
}

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.Tenant{},
		&models.Secretariat{},
		&models.Cargo{},
		&models.User{},
		&models.Project{},
		&models.Activity{},
		&models.ProjectTransfer{},
		&models.DeadlineChange{},
		&models.Risk{},
		&models.Action5W2H{},
		&models.SwotItem{},
		&models.Lesson{},
		&models.Attachment{},
		&models.Notification{},
		&models.AuditLog{},
		&models.ProjectApproval{},
		&models.Supplier{},
		&models.BudgetLine{},
		&models.Commitment{},
		&models.Contract{},
		&models.Payment{},
		&models.ProjectDocument{},
		&models.Stakeholder{},
		&models.ActivityDependency{},
		&models.Milestone{},
		&models.ProjectIndicator{},
		&models.ProjectTemplate{},
		&models.SavedReport{},
		&models.ReportSchedule{},
		&models.NotificationDelivery{},
	)
}

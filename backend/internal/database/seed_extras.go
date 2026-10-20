package database

import (
	"encoding/json"
	"time"

	"agora/backend/internal/models"

	"gorm.io/gorm"
)

func seedExtras(db *gorm.DB, tenant models.Tenant, ana, carlos, mariana *models.User, projects []*models.Project, base time.Time) {
	p1, p2, p3, p4, p5 := projects[0], projects[1], projects[2], projects[3], projects[4]
	day := func(days int) *time.Time {
		value := base.AddDate(0, 0, days)
		return &value
	}

	_ = db.Model(p1).Updates(map[string]any{
		"ppa": "Saúde perto de você", "ldo": "Ação 2031 - Requalificação de UBS",
		"loa": "Elemento 44.90.51", "baseline_start": p1.PlannedStart, "baseline_end": p1.PlannedEnd,
		"baseline_budget": p1.BudgetPlanned,
	}).Error
	_ = db.Model(p2).Updates(map[string]any{
		"ppa": "Educação que acolhe", "ldo": "Ação 2045 - Ampliação de creches",
		"loa": "Elemento 44.90.51", "baseline_start": p2.PlannedStart, "baseline_end": p2.PlannedEnd,
		"baseline_budget": p2.BudgetPlanned,
	}).Error

	supplier := func(name, document, category, email, phone string) *models.Supplier {
		item := models.Supplier{
			TenantID: tenant.ID, Name: name, Document: document, Category: category,
			Email: email, Phone: phone, Active: true,
		}
		_ = db.Create(&item).Error
		return &item
	}
	construtora := supplier("Construtora Serra Azul Ltda.", "12.345.678/0001-90", "Obras", "contato@serraazul.example", "(21) 99999-1000")
	medica := supplier("MedSupply Distribuidora Ltda.", "98.765.432/0001-10", "Saúde", "vendas@medsupply.example", "(21) 99999-2000")
	grafica := supplier("Gráfica Cidade Imperial Ltda.", "11.222.333/0001-44", "Comunicação", "atendimento@graficaci.example", "(21) 99999-3000")

	line1 := models.BudgetLine{
		TenantID: tenant.ID, ProjectID: p1.ID, Code: "04.122.0031.2031.4490.51",
		Description: "Requalificação da UBS Central", Source: "LOA 2026", Planned: 850000,
	}
	line2 := models.BudgetLine{
		TenantID: tenant.ID, ProjectID: p1.ID, Code: "04.122.0031.2031.3390.30",
		Description: "Equipamentos e mobiliário", Source: "Emenda parlamentar", Planned: 120000,
	}
	line3 := models.BudgetLine{
		TenantID: tenant.ID, ProjectID: p2.ID, Code: "12.365.0012.2045.4490.51",
		Description: "Ampliação da creche municipal", Source: "LOA 2026", Planned: 480000,
	}
	for _, line := range []*models.BudgetLine{&line1, &line2, &line3} {
		_ = db.Create(line).Error
	}

	commitment1 := models.Commitment{
		TenantID: tenant.ID, ProjectID: p1.ID, BudgetLineID: &line1.ID, SupplierID: &construtora.ID,
		Number: "2026NE000318", Description: "Primeira medição da reforma da UBS Central",
		Amount: 520000, Status: "PAGO", IssuedAt: day(-40), CreatedByID: carlos.ID,
	}
	commitment2 := models.Commitment{
		TenantID: tenant.ID, ProjectID: p1.ID, BudgetLineID: &line2.ID, SupplierID: &medica.ID,
		Number: "2026NE000402", Description: "Aquisição de mobiliário e equipamentos",
		Amount: 100000, Status: "EMPENHADO", IssuedAt: day(-12), CreatedByID: carlos.ID,
	}
	commitment3 := models.Commitment{
		TenantID: tenant.ID, ProjectID: p2.ID, BudgetLineID: &line3.ID, SupplierID: &construtora.ID,
		Number: "2026NE000455", Description: "Mobilização inicial da obra da creche",
		Amount: 90000, Status: "PAGO", IssuedAt: day(-8), CreatedByID: carlos.ID,
	}
	for _, item := range []*models.Commitment{&commitment1, &commitment2, &commitment3} {
		_ = db.Create(item).Error
	}
	for _, payment := range []models.Payment{
		{TenantID: tenant.ID, ProjectID: p1.ID, CommitmentID: commitment1.ID, Amount: 520000, PaidAt: day(-5), Note: "Pagamento da primeira medição", CreatedByID: ana.ID},
		{TenantID: tenant.ID, ProjectID: p2.ID, CommitmentID: commitment3.ID, Amount: 90000, PaidAt: day(-2), Note: "Mobilização da obra", CreatedByID: carlos.ID},
	} {
		_ = db.Create(&payment).Error
	}

	contract := models.Contract{
		TenantID: tenant.ID, ProjectID: p1.ID, CommitmentID: &commitment1.ID, SupplierID: &construtora.ID,
		Number: "CT-2026-018", Object: "Execução da reforma e ampliação da UBS Central",
		Value: 850000, Status: "VIGENTE", StartDate: day(-45), EndDate: day(90), SignedAt: day(-48),
	}
	_ = db.Create(&contract).Error

	approval := func(projectID uint, stage, status, comment, signature string, approverID *uint, decided *time.Time) {
		_ = db.Create(&models.ProjectApproval{
			TenantID: tenant.ID, ProjectID: projectID, Stage: stage, Status: status,
			Comment: comment, Signature: signature, ApproverID: approverID, DecidedAt: decided,
		}).Error
	}
	approval(p1.ID, "TECNICA", "APROVADO", "Projeto executivo e planilha conferidos.", "Carlos Lima", &carlos.ID, day(-35))
	approval(p1.ID, "ORCAMENTARIA", "APROVADO", "Dotação e empenho compatíveis com a LOA.", "Ana Souza", &ana.ID, day(-30))
	approval(p1.ID, "JURIDICA", "PENDENTE", "", "", nil, nil)
	approval(p2.ID, "TECNICA", "APROVADO", "Escopo e cronograma validados.", "Carlos Lima", &carlos.ID, day(-10))
	approval(p2.ID, "ORCAMENTARIA", "PENDENTE", "", "", nil, nil)
	approval(p2.ID, "JURIDICA", "PENDENTE", "", "", nil, nil)
	for _, project := range []*models.Project{p3, p4, p5} {
		for _, stage := range []string{"TECNICA", "ORCAMENTARIA", "JURIDICA"} {
			approval(project.ID, stage, "PENDENTE", "", "", nil, nil)
		}
	}

	document := func(projectID uint, name, category, status, note string, required bool, _ *time.Time) {
		_ = db.Create(&models.ProjectDocument{
			TenantID: tenant.ID, ProjectID: projectID, Name: name, Category: category,
			Status: status, Note: note, Required: required,
		}).Error
	}
	document(p1.ID, "Termo de referência ou projeto básico", "PLANEJAMENTO", "RECEBIDO", "Aprovado pela área técnica.", true, nil)
	document(p1.ID, "Planilha orçamentária", "ORCAMENTO", "RECEBIDO", "Planilha revisada em "+day(-38).Format("02/01/2006")+".", true, nil)
	document(p1.ID, "Licença ou dispensa ambiental", "LICENCIAMENTO", "DISPENSADO", "Dispensa emitida pela Secretaria de Meio Ambiente.", false, nil)
	document(p1.ID, "ART/RRT do responsável técnico", "TECNICO", "RECEBIDO", "ART do engenheiro responsável.", false, day(180))
	document(p1.ID, "Contrato ou instrumento equivalente", "CONTRATO", "RECEBIDO", "Contrato CT-2026-018 assinado.", true, nil)
	document(p1.ID, "Nota de empenho", "FINANCEIRO", "RECEBIDO", "Empenho 2026NE000318.", true, nil)
	document(p1.ID, "Registro fotográfico da execução", "EXECUCAO", "RECEBIDO", "Fotos da primeira medição anexadas.", false, nil)
	document(p1.ID, "Termo de recebimento provisório", "ENTREGA", "PENDENTE", "Será emitido após a conclusão.", true, nil)
	document(p1.ID, "Termo de recebimento definitivo", "ENTREGA", "PENDENTE", "Aguardando o prazo de observação.", true, nil)
	document(p2.ID, "Termo de referência ou projeto básico", "PLANEJAMENTO", "RECEBIDO", "Projeto de reforma aprovado.", true, nil)
	document(p2.ID, "Planilha orçamentária", "ORCAMENTO", "RECEBIDO", "Planilha base da licitação.", true, nil)
	document(p2.ID, "Contrato ou instrumento equivalente", "CONTRATO", "PENDENTE", "Aguardando assinatura.", true, nil)

	stakeholder := func(projectID uint, name, kind, organization, email, phone, role string, influence, interest int, notes string) {
		_ = db.Create(&models.Stakeholder{
			TenantID: tenant.ID, ProjectID: projectID, Name: name, Kind: kind, Organization: organization,
			Email: email, Phone: phone, Role: role, Influence: influence, Interest: interest, Notes: notes,
		}).Error
	}
	stakeholder(p1.ID, "Carlos Lima", "EQUIPE", "Secretaria de Obras", "gestor.obras@guapimirim.gov.br", "(21) 99999-1001", "Gestor do projeto", 5, 5, "Responsável pela execução e prestação de contas.")
	stakeholder(p1.ID, "Mariana Castro", "ORGAO", "Secretaria de Saúde", "gestor.saude@guapimirim.gov.br", "(21) 99999-1002", "Área demandante", 4, 5, "Valida os requisitos assistenciais da unidade.")
	stakeholder(p1.ID, "Conselho Municipal de Saúde", "COMUNIDADE", "Conselho Municipal de Saúde", "conselho.saude@example.org", "", "Controle social", 3, 5, "Acompanha as obras e a continuidade do atendimento.")
	stakeholder(p1.ID, "Construtora Serra Azul Ltda.", "FORNECEDOR", "Construtora Serra Azul Ltda.", "contato@serraazul.example", "(21) 99999-1000", "Executora do contrato", 4, 3, "Contrato CT-2026-018.")
	stakeholder(p2.ID, "Paulo Mendes", "EQUIPE", "Secretaria de Educação", "gestor.educacao@guapimirim.gov.br", "(21) 99999-1003", "Coordenação pedagógica", 4, 5, "Garante a obra sem interromper as aulas.")
	stakeholder(p3.ID, "Luciana Rocha", "EQUIPE", "Secretaria de Meio Ambiente", "gestor.meioambiente@guapimirim.gov.br", "(21) 99999-1004", "Coordenadora do programa", 4, 5, "Responsável pelos mutirões e pelo estoque de vacinas.")

	var p1Activities, p2Activities []models.Activity
	db.Where("project_id = ?", p1.ID).Order("id asc").Find(&p1Activities)
	db.Where("project_id = ?", p2.ID).Order("id asc").Find(&p2Activities)
	for i := 0; i < len(p1Activities)-1; i++ {
		_ = db.Create(&models.ActivityDependency{
			TenantID: tenant.ID, ProjectID: p1.ID,
			PredecessorID: p1Activities[i].ID, SuccessorID: p1Activities[i+1].ID,
		}).Error
	}
	for i := 0; i < len(p2Activities)-1; i++ {
		_ = db.Create(&models.ActivityDependency{
			TenantID: tenant.ID, ProjectID: p2.ID,
			PredecessorID: p2Activities[i].ID, SuccessorID: p2Activities[i+1].ID,
		}).Error
	}

	milestone := func(projectID uint, name, description string, due *time.Time, status string, completed *time.Time) {
		_ = db.Create(&models.Milestone{
			TenantID: tenant.ID, ProjectID: projectID, Name: name, Description: description,
			DueDate: due, Status: status, CompletedAt: completed,
		}).Error
	}
	milestone(p1.ID, "Licitação concluída", "Contrato assinado com a empresa vencedora.", day(-48), "CONCLUIDO", day(-48))
	milestone(p1.ID, "Primeira medição aprovada", "Execução de 40% da obra validada pela fiscalização.", day(-5), "CONCLUIDO", day(-5))
	milestone(p1.ID, "Conclusão da obra", "Entrega física da unidade reformada.", day(60), "EM_ANDAMENTO", nil)
	milestone(p1.ID, "Entrega à população", "Vistoria sanitária e início do atendimento.", day(75), "PENDENTE", nil)
	milestone(p2.ID, "Início da obra", "Mobilização da empresa e canteiro instalado.", day(21), "PENDENTE", nil)
	milestone(p2.ID, "Entrega da creche", "Conclusão da reforma e das duas novas salas.", day(45), "PENDENTE", nil)
	milestone(p3.ID, "Primeiro mutirão realizado", "Meta de 150 castrações no primeiro dia.", day(15), "PENDENTE", nil)

	indicator := func(projectID uint, name, unit string, target, current float64, notes string) {
		_ = db.Create(&models.ProjectIndicator{
			TenantID: tenant.ID, ProjectID: projectID, Name: name, Unit: unit,
			Target: target, Current: current, Notes: notes,
		}).Error
	}
	indicator(p1.ID, "Atendimentos diários após a reforma", "atendimentos/dia", 320, 0, "Capacidade projetada para a nova UBS.")
	indicator(p1.ID, "Área reformada", "m²", 1200, 480, "Medição acumulada da primeira etapa.")
	indicator(p2.ID, "Vagas adicionais em creche", "vagas", 40, 0, "Duas novas salas.")
	indicator(p5.ID, "Área de praça recuperada", "m²", 2500, 1200, "Execução parcial do paisagismo.")

	template := func(name, description, priority string, duration int, activities []map[string]any) {
		raw, _ := json.Marshal(activities)
		_ = db.Create(&models.ProjectTemplate{
			TenantID: tenant.ID, Name: name, Description: description, Priority: priority,
			DurationDays: duration, Activities: string(raw), Active: true,
		}).Error
	}
	template("Reforma de unidade pública", "Modelo para reformas de UBS, escolas e equipamentos públicos.", models.PriorityAlta, 120, []map[string]any{
		{"title": "Diagnóstico e levantamento de necessidades", "duration_days": 15},
		{"title": "Projeto básico e orçamento", "duration_days": 30},
		{"title": "Licitação e contratação", "duration_days": 30},
		{"title": "Execução da obra", "duration_days": 45},
		{"title": "Recebimento e entrega", "duration_days": 10},
	})
	template("Campanha de saúde", "Modelo para campanhas de vacinação, mutirões e ações preventivas.", models.PriorityMedia, 60, []map[string]any{
		{"title": "Planejamento e definição de metas", "duration_days": 7},
		{"title": "Mobilização de equipe e insumos", "duration_days": 10},
		{"title": "Divulgação para a comunidade", "duration_days": 10},
		{"title": "Execução da campanha", "duration_days": 25},
		{"title": "Consolidação dos resultados", "duration_days": 8},
	})

	filters, _ := json.Marshal(map[string]any{"status": "EM_ANDAMENTO,EM_ATRASO", "priority": "ALTA,CRITICA"})
	_ = db.Create(&models.SavedReport{
		TenantID: tenant.ID, UserID: ana.ID, Name: "Projetos prioritários em execução", Filters: string(filters),
	}).Error
	nextRun := base.AddDate(0, 0, 7)
	_ = db.Create(&models.ReportSchedule{
		TenantID: tenant.ID, UserID: ana.ID, Name: "Resumo semanal da gestão",
		Frequency: "WEEKLY", Filters: string(filters), Active: true, NextRun: &nextRun,
	}).Error

	_ = db.Model(ana).Updates(map[string]any{"phone": "(21) 99999-0001", "notify_email": true}).Error
	_ = db.Model(carlos).Updates(map[string]any{"phone": "(21) 99999-0002", "notify_email": true, "notify_whats_app": true}).Error
	_ = db.Model(mariana).Updates(map[string]any{"phone": "(21) 99999-0003", "notify_email": true}).Error
	_ = grafica
}

package database

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"agora/backend/internal/auth"
	"agora/backend/internal/config"
	"agora/backend/internal/models"
	"agora/backend/internal/service"

	"gorm.io/gorm"
)

func Seed(db *gorm.DB, cfg *config.Config) error {
	var count int64
	if err := db.Model(&models.Tenant{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	demoPassword := cfg.SeedPassword
	if demoPassword == "" {
		return fmt.Errorf("SEED_PASSWORD deve ser definido quando SEED=true")
	}

	now := time.Now()
	base := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)
	day := func(days int) *time.Time {
		t := base.AddDate(0, 0, days)
		return &t
	}

	guapimirim := models.Tenant{Name: "Prefeitura de Guapimirim", Slug: "guapimirim", City: "Guapimirim", State: "RJ", PrimaryColor: "#123b33", SecondaryColor: "#c8a34a", Active: true}
	mage := models.Tenant{Name: "Prefeitura de Magé", Slug: "mage", City: "Magé", State: "RJ", PrimaryColor: "#1d3f6e", SecondaryColor: "#d9a428", Active: true}
	if err := db.Create(&guapimirim).Error; err != nil {
		return err
	}
	if err := db.Create(&mage).Error; err != nil {
		return err
	}

	sec := func(tenantID uint, name, acronym, color string) *models.Secretariat {
		s := models.Secretariat{TenantID: tenantID, Name: name, Acronym: acronym, Color: color, Active: true}
		_ = db.Create(&s).Error
		return &s
	}
	obras := sec(guapimirim.ID, "Secretaria de Obras e Serviços", "OBR", "#0F766E")
	saude := sec(guapimirim.ID, "Secretaria de Saúde", "SAU", "#2563EB")
	educacao := sec(guapimirim.ID, "Secretaria de Educação", "EDU", "#7C3AED")
	ambiente := sec(guapimirim.ID, "Secretaria de Meio Ambiente", "MA", "#15803D")
	administracao := sec(guapimirim.ID, "Secretaria de Administração", "ADM", "#B45309")
	gabinete := sec(guapimirim.ID, "Gabinete do Prefeito", "GAB", "#475569")

	mageObras := sec(mage.ID, "Secretaria de Obras", "OBR", "#0F766E")
	mageAdmin := sec(mage.ID, "Secretaria de Administração", "ADM", "#B45309")

	cargo := func(tenantID uint, name, description string) *models.Cargo {
		c := models.Cargo{TenantID: tenantID, Name: name, Description: description, Active: true}
		_ = db.Create(&c).Error
		return &c
	}
	cargoPrefeito := cargo(guapimirim.ID, "Prefeito(a)", "Chefia do Poder Executivo municipal")
	cargoSecretario := cargo(guapimirim.ID, "Secretário(a)", "Titular da pasta")
	cargoDiretor := cargo(guapimirim.ID, "Diretor(a)", "Direção de departamento")
	cargoCoordenador := cargo(guapimirim.ID, "Coordenador(a)", "Coordenação de equipe ou programa")
	cargoAssessor := cargo(guapimirim.ID, "Assessor(a)", "Assessoria técnica e institucional")
	cargoFiscal := cargo(guapimirim.ID, "Fiscal", "Fiscalização de contratos e serviços")
	cargoTecnico := cargo(guapimirim.ID, "Técnico(a)", "Execução técnica")
	cargoEstagiario := cargo(guapimirim.ID, "Estagiário(a)", "Apoio técnico em estágio")
	cargoOutro := cargo(guapimirim.ID, "Outro", "Função não listada")
	_ = cargoOutro

	mageDiretor := cargo(mage.ID, "Diretor(a)", "Direção de departamento")
	mageTecnico := cargo(mage.ID, "Técnico(a)", "Execução técnica")

	hash := func(password string) string {
		h, _ := auth.HashPassword(password)
		return h
	}
	user := func(tenantID, secretariatID, cargoID uint, name, email, password, role string) *models.User {
		u := models.User{
			TenantID:      tenantID,
			SecretariatID: &secretariatID,
			CargoID:       &cargoID,
			Name:          name,
			Email:         email,
			PasswordHash:  hash(password),
			Role:          role,
			Active:        true,
		}
		_ = db.Create(&u).Error
		return &u
	}

	ana := user(guapimirim.ID, administracao.ID, cargoDiretor.ID, "Ana Souza", "admin@guapimirim.gov.br", demoPassword, models.RoleAdmin)
	carlos := user(guapimirim.ID, obras.ID, cargoDiretor.ID, "Carlos Lima", "gestor.obras@guapimirim.gov.br", demoPassword, models.RoleGestor)
	gabriel := user(guapimirim.ID, obras.ID, cargoEstagiario.ID, "Gabriel Alves", "editor.obras@guapimirim.gov.br", demoPassword, models.RoleEditor)
	prefeito := user(guapimirim.ID, gabinete.ID, cargoPrefeito.ID, "Roberto Nunes", "prefeito@guapimirim.gov.br", demoPassword, models.RoleGoverno)
	mariana := user(guapimirim.ID, saude.ID, cargoSecretario.ID, "Mariana Castro", "gestor.saude@guapimirim.gov.br", demoPassword, models.RoleGestor)
	paulo := user(guapimirim.ID, educacao.ID, cargoCoordenador.ID, "Paulo Mendes", "gestor.educacao@guapimirim.gov.br", demoPassword, models.RoleGestor)
	luciana := user(guapimirim.ID, ambiente.ID, cargoTecnico.ID, "Luciana Rocha", "gestor.meioambiente@guapimirim.gov.br", demoPassword, models.RoleGestor)
	_ = cargoAssessor
	_ = cargoFiscal

	felipe := user(mage.ID, mageAdmin.ID, mageDiretor.ID, "Felipe Torres", "admin@mage.gov.br", demoPassword, models.RoleAdmin)
	_ = mageTecnico
	_ = gabriel

	type projectSpec struct {
		name           string
		justification  string
		objectives     string
		requirements   string
		riskAssessment string
		govPlan        bool
		govDetail      string
		priority       string
		responsible    *models.Secretariat
		involved       []*models.Secretariat
		createdBy      *models.User
		plannedStart   *time.Time
		plannedEnd     *time.Time
		budgetPlanned  float64
		budgetExecuted float64
	}
	createProject := func(tenantID uint, spec projectSpec) *models.Project {
		p := models.Project{
			TenantID:                 tenantID,
			Name:                     spec.name,
			Justification:            spec.justification,
			Objectives:               spec.objectives,
			Requirements:             spec.requirements,
			RiskAssessment:           spec.riskAssessment,
			GovernmentPlan:           spec.govPlan,
			GovernmentPlanDetail:     spec.govDetail,
			Priority:                 spec.priority,
			Status:                   models.StatusNaoIniciado,
			ResponsibleSecretariatID: spec.responsible.ID,
			PlannedStart:             spec.plannedStart,
			PlannedEnd:               spec.plannedEnd,
			BudgetPlanned:            spec.budgetPlanned,
			BudgetExecuted:           spec.budgetExecuted,
			CreatedByID:              spec.createdBy.ID,
			CreatedAt:                base.AddDate(0, 0, -140),
			UpdatedAt:                base.AddDate(0, 0, -1),
		}
		_ = db.Create(&p).Error
		code := fmt.Sprintf("PRJ-%d-%04d", now.Year(), p.ID)
		_ = db.Model(&p).Update("code", code)
		p.Code = code
		secretariats := make([]models.Secretariat, 0, len(spec.involved))
		for _, s := range spec.involved {
			secretariats = append(secretariats, *s)
		}
		_ = db.Model(&p).Association("Secretariats").Replace(secretariats)
		return &p
	}

	activity := func(projectID uint, title, description string, plannedStart, plannedEnd, realStart, realEnd *time.Time, late bool) {
		a := models.Activity{
			TenantID:     guapimirim.ID,
			ProjectID:    projectID,
			Title:        title,
			Description:  description,
			PlannedStart: plannedStart,
			PlannedEnd:   plannedEnd,
			RealStart:    realStart,
			RealEnd:      realEnd,
		}
		service.NormalizeActivity(&a, now)
		_ = db.Create(&a).Error
		_ = late
	}

	// Projeto 1 — em atraso
	p1 := createProject(guapimirim.ID, projectSpec{
		name:           "Reforma da UBS Central",
		justification:  "A unidade de saúde central apresenta problemas estruturais que comprometem o atendimento à população e exigem intervenção imediata.",
		objectives:     "Ampliar e modernizar a UBS Central, garantindo acessibilidade, conforto e segurança para usuários e servidores.",
		requirements:   "Projeto executivo aprovado, licença sanitária, orçamento de obra, empresa contratada e fiscalização técnica.",
		riskAssessment: "Risco alto de atraso na licitação e de desvio de orçamento. Necessária antecipação do edital e fiscalização semanal.",
		govPlan:        true,
		govDetail:      "Saúde perto de você: ampliação e requalificação das unidades básicas de saúde.",
		priority:       models.PriorityCritica,
		responsible:    obras,
		involved:       []*models.Secretariat{obras, saude},
		createdBy:      carlos,
		plannedStart:   day(-120),
		plannedEnd:     day(-5),
		budgetPlanned:  850000,
		budgetExecuted: 520000,
	})
	activity(p1.ID, "Levantamento e diagnóstico estrutural", "Vistoria técnica e laudo da estrutura existente.", day(-120), day(-100), day(-118), day(-102), false)
	activity(p1.ID, "Projeto arquitetônico e executivo", "Elaboração do projeto e detalhamento das instalações.", day(-95), day(-60), day(-90), day(-55), false)
	activity(p1.ID, "Licitação da obra", "Publicação do edital, propostas e contratação.", day(-55), day(-20), day(-50), nil, false)
	activity(p1.ID, "Execução da obra", "Obra civil, instalações e acabamento.", day(-15), day(60), nil, nil, false)
	activity(p1.ID, "Vistoria sanitária e entrega", "Vistoria final da Vigilância Sanitária e entrega à população.", day(61), day(75), nil, nil, false)

	// Projeto 2 — em andamento
	p2 := createProject(guapimirim.ID, projectSpec{
		name:           "Reforma da Creche Municipal",
		justification:  "A creche municipalize atende acima da capacidade e precisa de reforma para manter o atendimento em segurança.",
		objectives:     "Reformar a creche, ampliar duas salas e adequar a cozinha e o pátio.",
		requirements:   "Projeto de reforma, orçamento detalhado, licitação e plano de execução sem interromper o atendimento.",
		riskAssessment: "Risco médio de fornecedor único e de interferência no calendário escolar. Planejar obra por etapas.",
		govPlan:        true,
		govDetail:      "Educação que acolhe: ampliação de vagas em creches municipais.",
		priority:       models.PriorityAlta,
		responsible:    obras,
		involved:       []*models.Secretariat{obras, educacao},
		createdBy:      carlos,
		plannedStart:   day(-30),
		plannedEnd:     day(45),
		budgetPlanned:  480000,
		budgetExecuted: 90000,
	})
	activity(p2.ID, "Diagnóstico e levantamento de necessidades", "Avaliação das salas, cozinha e área externa.", day(-30), day(-15), day(-28), day(-16), false)
	activity(p2.ID, "Projeto e orçamentação", "Projeto de reforma e planilha orçamentária.", day(-14), day(5), day(-14), nil, false)
	activity(p2.ID, "Licitação e contratação", "Processo licitatório e assinatura do contrato.", day(6), day(20), nil, nil, false)
	activity(p2.ID, "Execução e entrega", "Obra por etapas com entrega final.", day(21), day(45), nil, nil, false)

	// Projeto 3 — concluído
	p3 := createProject(guapimirim.ID, projectSpec{
		name:           "Programa de Castração e Controle Animal",
		justification:  "O município precisa reduzir a população de animais abandonados e controlar zoonoses.",
		objectives:     "Realizar castrações e ações de conscientização sobre posse responsável.",
		requirements:   "Clínica credenciada, equipe veterinária, veículo de transporte e campanha de comunicação.",
		riskAssessment: "Risco baixo, limitado à adesão da população e à capacidade da clínica.",
		govPlan:        true,
		govDetail:      "Bem-estar animal e saúde pública.",
		priority:       models.PriorityMedia,
		responsible:    ambiente,
		involved:       []*models.Secretariat{ambiente, saude},
		createdBy:      luciana,
		plannedStart:   day(-200),
		plannedEnd:     day(-150),
		budgetPlanned:  120000,
		budgetExecuted: 108000,
	})
	activity(p3.ID, "Credenciamento da clínica e planejamento", "Seleção da clínica e definição do calendário.", day(-200), day(-185), day(-200), day(-190), false)
	activity(p3.ID, "Mutirões de castração", "Realização dos mutirões nos bairros.", day(-184), day(-160), day(-180), day(-165), false)
	activity(p3.ID, "Campanha educativa e prestação de contas", "Distribuição de material e relatório final.", day(-159), day(-150), day(-158), day(-151), false)

	// Projeto 4 — não iniciado
	p4 := createProject(guapimirim.ID, projectSpec{
		name:           "Ampliação da Escola Municipal Vila Nova",
		justification:  "A escola opera com salas superlotadas e não possui espaço adequado para atividades complementares.",
		objectives:     "Construir quatro novas salas, quadra coberta e refeitório.",
		requirements:   "Estudo de demanda, projeto arquitetônico, licenciamento e orçamento de obra.",
		riskAssessment: "Risco de atraso no licenciamento e de indisponibilidade orçamentária no exercício.",
		govPlan:        true,
		govDetail:      "Educação em tempo integral e ampliação da rede.",
		priority:       models.PriorityAlta,
		responsible:    educacao,
		involved:       []*models.Secretariat{educacao, obras},
		createdBy:      paulo,
		plannedStart:   day(10),
		plannedEnd:     day(120),
		budgetPlanned:  1200000,
		budgetExecuted: 0,
	})
	activity(p4.ID, "Estudo de demanda e projeto", "Levantamento de demanda e contratação do projeto.", day(10), day(45), nil, nil, false)
	activity(p4.ID, "Licitação e execução", "Licitação, obra e entrega.", day(46), day(120), nil, nil, false)

	// Projeto 5 — concluído com atraso
	p5 := createProject(guapimirim.ID, projectSpec{
		name:           "Revitalização da Praça Central",
		justification:  "A praça central está degradada e é o principal espaço de convivência do município.",
		objectives:     "Revitalizar calçamento, iluminação, paisagismo e mobiliário urbano.",
		requirements:   "Projeto paisagístico, orçamento, licitação e plano de manutenção.",
		riskAssessment: "Risco de atraso por chuvas e de depredação após a entrega.",
		govPlan:        false,
		priority:       models.PriorityMedia,
		responsible:    obras,
		involved:       []*models.Secretariat{obras, ambiente},
		createdBy:      carlos,
		plannedStart:   day(-180),
		plannedEnd:     day(-100),
		budgetPlanned:  310000,
		budgetExecuted: 338000,
	})
	activity(p5.ID, "Projeto e licitação", "Projeto paisagístico e processo licitatório.", day(-180), day(-150), day(-178), day(-148), false)
	activity(p5.ID, "Obra e paisagismo", "Execução da obra e plantio.", day(-149), day(-110), day(-145), day(-105), false)
	activity(p5.ID, "Entrega e inauguração", "Vistoria e entrega à população.", day(-109), day(-100), day(-104), day(-101), false)

	// Projeto 6 — em andamento (saúde)
	p6 := createProject(guapimirim.ID, projectSpec{
		name:           "Campanha de Vacinação 2026",
		justification:  "Necessidade de ampliar a cobertura vacinal e proteger grupos prioritários.",
		objectives:     "Vacinar crianças, idosos e gestantes, com busca ativa nos bairros.",
		requirements:   "Equipes volantes, insumos, divulgação e sala de vacinação nas UBS.",
		riskAssessment: "Risco de baixa adesão e de desabastecimento de doses.",
		govPlan:        true,
		govDetail:      "Saúde preventiva e cobertura vacinal.",
		priority:       models.PriorityAlta,
		responsible:    saude,
		involved:       []*models.Secretariat{saude},
		createdBy:      mariana,
		plannedStart:   day(-20),
		plannedEnd:     day(40),
		budgetPlanned:  95000,
		budgetExecuted: 42000,
	})
	activity(p6.ID, "Planejamento e mobilização", "Definição de metas, equipes e comunicação.", day(-20), day(-5), day(-20), day(-7), false)
	activity(p6.ID, "Mutirões de vacinação", "Aplicação das doses e busca ativa.", day(-4), day(20), day(-4), nil, false)
	activity(p6.ID, "Consolidação e relatório", "Fechamento de cobertura vacinal.", day(21), day(40), nil, nil, false)

	// Projeto 7 — suspenso
	p7 := createProject(guapimirim.ID, projectSpec{
		name:           "Plano Municipal de Saneamento Básico",
		justification:  "O município precisa atualizar o plano de saneamento para acessar recursos federais.",
		objectives:     "Elaborar diagnóstico, metas e plano de investimentos em água, esgoto e resíduos.",
		requirements:   "Contrato de consultoria, dados operacionais e participação social.",
		riskAssessment: "Risco de atraso por pendências na contratação e de baixa participação popular.",
		govPlan:        true,
		govDetail:      "Cidade sustentável e saneamento para todos.",
		priority:       models.PriorityAlta,
		responsible:    ambiente,
		involved:       []*models.Secretariat{ambiente, obras},
		createdBy:      luciana,
		plannedStart:   day(-90),
		plannedEnd:     day(180),
		budgetPlanned:  260000,
		budgetExecuted: 30000,
	})
	activity(p7.ID, "Diagnóstico e mobilização social", "Coleta de dados e audiências públicas.", day(-90), day(-30), day(-89), nil, false)

	// Projeto 8 — em andamento (administração)
	p8 := createProject(guapimirim.ID, projectSpec{
		name:           "Digitalização do Protocolo Municipal",
		justification:  "O protocolo em papel gera atrasos, perda de documentos e falta de transparência.",
		objectives:     "Digitalizar a entrada e o trâmite de processos, reduzir prazos e permitir consulta pública.",
		requirements:   "Sistema de protocolo, digitalização de acervo, treinamento e política de arquivo digital.",
		riskAssessment: "Risco de resistência da equipe e de perda de documentos na migração.",
		govPlan:        true,
		govDetail:      "Governo digital e transparência.",
		priority:       models.PriorityMedia,
		responsible:    administracao,
		involved:       []*models.Secretariat{administracao, gabinete},
		createdBy:      ana,
		plannedStart:   day(-60),
		plannedEnd:     day(30),
		budgetPlanned:  150000,
		budgetExecuted: 72000,
	})
	activity(p8.ID, "Mapeamento dos fluxos e requisitos", "Levantamento dos processos e definição do sistema.", day(-60), day(-30), day(-58), day(-25), false)
	activity(p8.ID, "Implantação e treinamento", "Configuração, migração e capacitação das equipes.", day(-20), day(30), day(-18), nil, false)

	// Projeto 9 — em atraso (saúde)
	p9 := createProject(guapimirim.ID, projectSpec{
		name:           "Mutirão de Consultas Especializadas",
		justification:  "A fila de consultas especializadas cresceu e há demanda reprimida.",
		objectives:     "Realizar mutirões para zerar a fila de consultas em cardiologia e oftalmologia.",
		requirements:   "Credenciamento de especialistas, agenda extra e transporte de pacientes.",
		riskAssessment: "Risco de falta de especialistas e de absenteísmo dos pacientes.",
		govPlan:        true,
		govDetail:      "Saúde com acesso e redução de filas.",
		priority:       models.PriorityCritica,
		responsible:    saude,
		involved:       []*models.Secretariat{saude},
		createdBy:      mariana,
		plannedStart:   day(-45),
		plannedEnd:     day(-3),
		budgetPlanned:  180000,
		budgetExecuted: 96000,
	})
	activity(p9.ID, "Credenciamento dos especialistas", "Contratação de cardiologistas e oftalmologistas.", day(-45), day(-30), day(-44), day(-34), false)
	activity(p9.ID, "Agendamento e transporte", "Convocação dos pacientes e logística.", day(-29), day(-10), day(-28), nil, false)
	activity(p9.ID, "Realização dos mutirões", "Atendimentos e encaminhamentos.", day(-9), day(-3), nil, nil, false)

	// Projeto 10 — não iniciado (ambiente/educação)
	p10 := createProject(guapimirim.ID, projectSpec{
		name:           "Horta Comunitária nas Escolas",
		justification:  "Projeto de educação ambiental e alimentação saudável em escolas municipais.",
		objectives:     "Implantar hortas em quatro escolas e envolver alunos e famílias.",
		requirements:   "Materiais, capacitação de professores, parceria com agricultores e água para irrigação.",
		riskAssessment: "Risco de descontinuidade por falta de manutenção e de baixa adesão.",
		govPlan:        true,
		govDetail:      "Educação ambiental e alimentação saudável.",
		priority:       models.PriorityBaixa,
		responsible:    ambiente,
		involved:       []*models.Secretariat{ambiente, educacao},
		createdBy:      luciana,
		plannedStart:   day(20),
		plannedEnd:     day(100),
		budgetPlanned:  45000,
		budgetExecuted: 0,
	})
	activity(p10.ID, "Seleção das escolas e projeto", "Escolha das escolas e desenho das hortas.", day(20), day(45), nil, nil, false)

	// Segunda prefeitura
	mageP1 := createProject(mage.ID, projectSpec{
		name:           "Reforma da Escola Municipal Magé",
		justification:  "A escola precisa de reforma nas salas e na quadra.",
		objectives:     "Reformar a estrutura e entregar a escola à comunidade.",
		requirements:   "Projeto, orçamento e licitação.",
		riskAssessment: "Risco de atraso na licitação.",
		govPlan:        true,
		govDetail:      "Educação de qualidade.",
		priority:       models.PriorityAlta,
		responsible:    mageObras,
		involved:       []*models.Secretariat{mageObras},
		createdBy:      felipe,
		plannedStart:   day(5),
		plannedEnd:     day(80),
		budgetPlanned:  540000,
		budgetExecuted: 0,
	})
	_ = mageP1
	mageP2 := createProject(mage.ID, projectSpec{
		name:           "Programa de Arborização Urbana",
		justification:  "Ampliar a arborização e melhorar o conforto térmico.",
		objectives:     "Plantar mudas e implantar viveiro municipal.",
		requirements:   "Mudas, equipe e plano de manutenção.",
		riskAssessment: "Risco de perda de mudas por falta de irrigação.",
		govPlan:        false,
		priority:       models.PriorityMedia,
		responsible:    mageAdmin,
		involved:       []*models.Secretariat{mageAdmin},
		createdBy:      felipe,
		plannedStart:   day(-20),
		plannedEnd:     day(40),
		budgetPlanned:  70000,
		budgetExecuted: 25000,
	})
	ma := models.Activity{TenantID: mage.ID, ProjectID: mageP2.ID, Title: "Plantio e viveiro", PlannedStart: day(-20), PlannedEnd: day(20), RealStart: day(-18)}
	service.NormalizeActivity(&ma, now)
	_ = db.Create(&ma).Error

	projectIDs := []uint{p1.ID, p2.ID, p3.ID, p4.ID, p5.ID, p6.ID, p7.ID, p8.ID, p9.ID, p10.ID}
	for _, id := range projectIDs {
		_ = service.RecomputeProject(db, id)
	}
	_ = service.RecomputeProject(db, mageP2.ID)
	_ = db.Model(&models.Project{}).Where("id = ?", p7.ID).Update("status", models.StatusSuspenso)

	// Riscos
	risk := func(projectID uint, description, category string, g, u, t int, owner, response, status string) {
		r := models.Risk{
			TenantID:    guapimirim.ID,
			ProjectID:   projectID,
			Description: description,
			Category:    category,
			Gravity:     g,
			Urgency:     u,
			Tendency:    t,
			Score:       g * u * t,
			Status:      status,
			Response:    response,
			Owner:       owner,
			CreatedByID: carlos.ID,
		}
		switch {
		case r.Score >= 100:
			r.Level = "CRITICO"
		case r.Score >= 60:
			r.Level = "ALTO"
		case r.Score >= 30:
			r.Level = "MEDIO"
		default:
			r.Level = "BAIXO"
		}
		_ = db.Create(&r).Error
	}
	risk(p1.ID, "Atraso na licitação da obra", "Prazo", 5, 4, 4, "Carlos Lima", "Antecipar a publicação do edital e acompanhar semanalmente.", "ABERTO")
	risk(p1.ID, "Desvio de orçamento", "Orçamento", 5, 3, 4, "Ana Souza", "Revisar medições e manter reserva de contingência.", "ABERTO")
	risk(p1.ID, "Falta de mão de obra especializada", "Equipe", 4, 3, 3, "Carlos Lima", "Exigir comprovação de equipe na licitação.", "MITIGADO")
	risk(p2.ID, "Fornecedor único no mercado local", "Fornecedor", 4, 3, 3, "Carlos Lima", "Pesquisar alternativas na região metropolitana.", "ABERTO")

	var riskLicitacao models.Risk
	db.Where("project_id = ? AND description LIKE ?", p1.ID, "%licitação%").First(&riskLicitacao)

	// Planos 5W2H
	actions := []models.Action5W2H{
		{
			TenantID: guapimirim.ID, ProjectID: p1.ID, RiskID: &riskLicitacao.ID,
			What: "Antecipar a publicação do edital de licitação", Why: "Reduzir o risco de atraso na contratação",
			Where: "Secretaria de Obras", When: "Até 30 dias", Who: "Carlos Lima",
			How: "Revisar o termo de referência e obter aprovação jurídica em paralelo", HowMuch: "R$ 0", Status: "EM_EXECUCAO",
		},
		{
			TenantID: guapimirim.ID, ProjectID: p1.ID,
			What: "Criar comitê semanal de acompanhamento da obra", Why: "Monitorar prazos e orçamento",
			Where: "Sala de reuniões da Obras", When: "Todas as segundas", Who: "Ana Souza e Carlos Lima",
			How: "Reunião de 30 minutos com ata e plano de ação", HowMuch: "R$ 0", Status: "PLANEJADA",
		},
		{
			TenantID: guapimirim.ID, ProjectID: p2.ID,
			What: "Realizar obra por etapas fora do horário de aula", Why: "Não interromper o calendário escolar",
			Where: "Creche Municipal", When: "Julho de 2026", Who: "Equipe de obras",
			How: "Cronograma noturno e fins de semana", HowMuch: "R$ 25.000", Status: "PLANEJADA",
		},
	}
	for i := range actions {
		_ = db.Create(&actions[i]).Error
	}

	// SWOT
	swot := func(quadrant, description string) {
		_ = db.Create(&models.SwotItem{
			TenantID: guapimirim.ID, ProjectID: p1.ID, Quadrant: quadrant,
			Description: description, CreatedByID: carlos.ID,
		}).Error
	}
	swot(models.SwotForca, "Equipe técnica experiente e dedicada")
	swot(models.SwotForca, "Boa relação com a comunidade e com a Vigilância Sanitária")
	swot(models.SwotFraqueza, "Orçamento apertado para imprevistos de obra")
	swot(models.SwotFraqueza, "Prazo curto para a licitação")
	swot(models.SwotOportunidade, "Possibilidade de emenda parlamentar para ampliação")
	swot(models.SwotAmeaca, "Aumento de preços de materiais de construção")
	swot(models.SwotAmeaca, "Período de chuvas intensas no inverno")

	// Lições aprendidas
	_ = db.Create(&models.Lesson{
		TenantID: guapimirim.ID, ProjectID: p1.ID, Title: "Antecipar a análise jurídica do edital",
		Description: "A análise jurídica em paralelo com a revisão técnica reduziu o tempo de publicação do edital.",
		Category:    "Licitação", CreatedByID: carlos.ID,
	}).Error
	_ = db.Create(&models.Lesson{
		TenantID: guapimirim.ID, ProjectID: p3.ID, Title: "Planejar mutirões com antecedência",
		Description: "A divulgação com duas semanas de antecedência aumentou a adesão aos mutirões de castração.",
		Category:    "Planejamento", CreatedByID: luciana.ID,
	}).Error
	_ = db.Create(&models.Lesson{
		TenantID: guapimirim.ID, ProjectID: p5.ID, Title: "Prever cláusula de manutenção no contrato",
		Description: "A praça precisou de reparos pouco depois da entrega; incluir manutenção no contrato teria evitado custos extras.",
		Category:    "Fornecedores", CreatedByID: carlos.ID,
	}).Error

	// Transferências
	_ = db.Create(&models.ProjectTransfer{
		TenantID: guapimirim.ID, ProjectID: p1.ID, FromSecretariatID: &saude.ID, ToSecretariatID: obras.ID,
		ChangedByID: ana.ID, Note: "A execução da obra passa a ser conduzida pela Secretaria de Obras.",
		CreatedAt: base.AddDate(0, 0, -115),
	}).Error
	_ = db.Create(&models.ProjectTransfer{
		TenantID: guapimirim.ID, ProjectID: p4.ID, FromSecretariatID: &obras.ID, ToSecretariatID: educacao.ID,
		ChangedByID: ana.ID, Note: "A Educação assume a coordenação pedagógica e a Obras apoia a execução.",
		CreatedAt: base.AddDate(0, 0, -5),
	}).Error

	// Alteração de prazo com justificativa
	oldEnd := day(-20).Format("2006-01-02")
	newEnd := day(-5).Format("2006-01-02")
	_ = db.Create(&models.DeadlineChange{
		TenantID: guapimirim.ID, ProjectID: p1.ID, EntityType: "projeto", EntityID: p1.ID,
		EntityName: p1.Name, Field: "planned_end", OldValue: oldEnd, NewValue: newEnd,
		Justification: "Atraso na análise jurídica do edital e necessidade de revisão do termo de referência.",
		ChangedByID:   carlos.ID, CreatedAt: base.AddDate(0, 0, -22),
	}).Error

	// Notificações
	notify := func(userID uint, title, message, kind, link string, daysAgo int) {
		read := base.AddDate(0, 0, daysAgo)
		var readAt *time.Time
		if daysAgo > 0 {
			readAt = &read
		}
		_ = db.Create(&models.Notification{
			TenantID: guapimirim.ID, UserID: userID, Title: title, Message: message,
			Type: kind, Link: link, ReadAt: readAt, CreatedAt: base.AddDate(0, 0, -daysAgo),
		}).Error
	}
	notify(carlos.ID, "Projeto encaminhado para sua secretaria",
		"O projeto Reforma da UBS Central foi encaminhado de Saúde para Obras.", "TRANSFERENCIA", "/projetos/"+fmt.Sprint(p1.ID), 0)
	notify(carlos.ID, "Atividades em atraso",
		"O projeto Reforma da UBS Central possui 1 atividade em atraso.", "ATRASO", "/projetos/"+fmt.Sprint(p1.ID), 0)
	notify(ana.ID, "Prazo de projeto alterado",
		"O término previsto da Reforma da UBS Central foi atualizado.", "PRAZO", "/projetos/"+fmt.Sprint(p1.ID), 2)
	notify(prefeito.ID, "Painel atualizado",
		"Os indicadores da gestão foram atualizados com os dados mais recentes.", "SISTEMA", "/painel", 1)

	// Auditoria demonstrativa
	audit := func(userName, action, entity string, entityID uint, details string, daysAgo int) {
		_ = db.Create(&models.AuditLog{
			TenantID: guapimirim.ID, UserID: 2, UserName: userName, Action: action,
			Entity: entity, EntityID: entityID, Details: details, IP: "127.0.0.1",
			CreatedAt: base.AddDate(0, 0, -daysAgo),
		}).Error
	}
	audit("Ana Souza", "PROJETO_CRIADO", "projeto", p1.ID, "Projeto PRJ-2026-0001 criado", 140)
	audit("Carlos Lima", "ATIVIDADE_CONCLUIDA", "projeto", p1.ID, "Atividade \"Levantamento e diagnóstico estrutural\" concluída", 102)
	audit("Ana Souza", "PROJETO_ENCAMINHADO", "projeto", p1.ID, "Encaminhado para Secretaria de Obras e Serviços", 115)
	audit("Carlos Lima", "PRAZO_ALTERADO", "projeto", p1.ID, "Prazo de término alterado de "+oldEnd+" para "+newEnd, 22)
	audit("Sistema", "ALERTA_ENVIADO", "projeto", p1.ID, "Projeto em atraso notificado", 0)

	// Anexo demonstrativo
	samplePath := filepath.Join(cfg.UploadDir, "demo-termo-de-referencia.txt")
	content := "TERMO DE REFERÊNCIA (documento de demonstração)\n\nProjeto: Reforma da UBS Central\n\nEste arquivo ilustra o recurso de documentação que legitima a execução do projeto."
	_ = os.WriteFile(samplePath, []byte(content), 0o644)
	_ = db.Create(&models.Attachment{
		TenantID: guapimirim.ID, ProjectID: p1.ID, Name: "termo-de-referencia.txt",
		StoredName: "demo-termo-de-referencia.txt", MimeType: "text/plain",
		Size: int64(len(content)), UploadedByID: carlos.ID,
	}).Error

	seedExtras(db, guapimirim, ana, carlos, mariana, []*models.Project{p1, p2, p3, p4, p5}, base)

	return nil
}

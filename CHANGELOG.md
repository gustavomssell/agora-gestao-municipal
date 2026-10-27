# Changelog

Todas as mudanças relevantes deste projeto são registradas neste arquivo.

## [Não lançado]

### Segurança

- Migrações SQL versionadas em `backend/migrations`, com controle em `schema_migrations`, substituindo `AutoMigrate`.
- JWT movido do `localStorage` para cookie `HttpOnly`, com expiração de 16 horas e `Secure` em produção.
- Proteção CSRF por token vinculado à sessão para requisições de escrita.

### Alterado

- WebSocket autenticado pelo cookie de sessão, sem token na query string.
- Frontend dividido por rota com carregamento sob demanda, reduzindo o chunk inicial de ~1,05 MB para ~259 kB.
- Status do projeto derivado de atividades, prazos e aprovações, com o novo estado `AGUARDANDO_APROVACAO`.
- Alteração manual de status restrita a cancelar, suspender e retomar; a retomada recalcula o status.
- Ações de atividade para suspender, cancelar e retomar.
- Kanban com quatro colunas, incluindo aguardando aprovação.

### Corrigido

- Projetos só concluem com todas as atividades não canceladas terminadas e as etapas técnica, orçamentária e jurídica aprovadas.
- Atividades canceladas deixam de contar no progresso e na conclusão; atividades suspensas bloqueiam a conclusão.
- Início e conclusão de atividades respeitam dependências; predecessor cancelado é ignorado.
- Reabertura de atividade é bloqueada quando sucessoras já iniciaram, exige perfil administrador e não pode ser contornada pelas ações de início.
- Retomar uma atividade suspensa ou cancelada preserva o início real já registrado.
- A exclusão de uma atividade remove suas dependências.
- Encaminhamento entre secretarias exige permissão própria, independente da edição do projeto.
- Status derivado é atualizado também nas leituras de dashboard, kanban, gantt, relatórios, alertas e portal público.
- Decisão e reabertura de aprovação recalculam o status do projeto.
- Responsividade do header, painel, kanban, administração, projeto, cronograma e formulários em telas mobile/tablet.
- Alvos de toque ampliados para 44 px em dispositivos com ponteiro grosso.
- Abas administrativas com quebra de linha e abas de projeto com indicação de rolagem horizontal.
- Checklist documental reorganizado em coluna no mobile.
- Tabelas administrativas de usuários e secretarias substituídas por cards até `lg`.
- Matriz de permissões e trilha de auditoria substituídas por cards até `xl`.
- Filtros da auditoria ocupam a largura no mobile.
- Contraste do badge de status no hero do portal público corrigido.

## [0.1.2] - 2026-10-20

### Segurança

- Remoção de credenciais demo versionadas do código, documentação e histórico Git.
- Senha inicial das contas demo agora é definida por `SEED_PASSWORD` e não possui valor padrão.

## [0.1.1] - 2026-10-20

### Corrigido

- Sincronização do `package-lock.json` para permitir `npm ci` no CI e no build Docker do frontend.

## [0.1.0] - 2026-10-20

### Adicionado

- Gestão multi-prefeitura de projetos, atividades, riscos, 5W2H, SWOT, lições e anexos.
- Painel executivo, kanban, cronograma Gantt e busca global.
- Aprovações internas por etapa técnica, orçamentária e jurídica.
- Financeiro por projeto com dotações, empenhos, pagamentos e contratos.
- Checklist documental, marcos, dependências, indicadores e partes interessadas.
- Modelos de projeto com atividades padrão.
- Relatórios em XLSX e PDF, filtros salvos e agendamentos periódicos.
- Portal público de transparência por prefeitura.
- Notificações em tempo real, preferências por e-mail e WhatsApp.
- Permissões granulares por usuário e auditoria de ações.
- Seed demonstrativo para Guapimirim e Magé.
- Docker Compose, CI e documentação de arquitetura, telas e API.

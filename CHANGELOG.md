# Changelog

Todas as mudanças relevantes deste projeto são registradas neste arquivo.

## [Não lançado]

### Corrigido

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

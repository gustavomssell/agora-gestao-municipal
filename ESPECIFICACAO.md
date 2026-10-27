# Ágora — Especificação do Produto

**Gestão de projetos, protocolos e governança entre secretarias municipais**

Versão: 0.1 (documento de alinhamento)
Base: requisitos AGEVAP (PDF "Requisitos AGEVAP") + decisões de arquitetura do projeto
Status: em aprovação

Detalhamento de telas, campos, validações e fluxos: [`TELAS.md`](./TELAS.md).

---

## 1. Visão

Ágora é um SaaS multi-prefeitura para planejar, executar e acompanhar os projetos da gestão municipal. O sistema conecta secretarias em torno de um mesmo projeto, controla prazos e riscos, registra evidências e entrega ao prefeito uma leitura rápida da execução do plano de governo.

O produto nasce da necessidade de substituir um portal fragmentado por uma experiência simples, padronizada e auditável: um projeto tem uma secretaria responsável por vez, pode ser encaminhado formalmente para outra secretaria e mantém histórico completo de tudo que aconteceu.

### 1.1 Problema atual (extraído dos requisitos)

- Layout e linguagem inconsistentes entre telas.
- Projetos organizados por datas previstas, não pelo que está acontecendo de fato.
- Excesso de abas e recursos visuais que não ajudam a decisão (abas Estudo/Obra, emojis de status).
- Secretarias trabalham isoladas e cadastram o mesmo projeto mais de uma vez.
- Não existe fluxo claro de encaminhamento de um projeto entre secretarias.
- Notificações e alertas existem, mas não funcionam.
- Relatórios são limitados e não permitem recortes.
- Seis níveis de acesso dificultam a gestão e a segurança.
- Prazos são alterados sem justificativa e sem rastreabilidade.

### 1.2 Proposta

Uma única fonte de verdade por projeto, com:

- painel executivo simples para o prefeito;
- quadro kanban e lista operacional para as secretarias;
- protocolo de encaminhamento entre secretarias;
- progresso calculado a partir das atividades;
- prazos previstos e reais sempre visíveis;
- justificativa obrigatória para alteração de prazo;
- riscos com matriz GUT e planos de ação 5W2H;
- relatórios em planilha com os mesmos filtros da tela;
- trilha de auditoria e histórico de atualizações;
- notificações e alertas funcionando de verdade.

---

## 2. Escopo

### 2.1 Dentro do escopo (MVP/POC completo)

| Módulo | Descrição |
|---|---|
| Multi-tenant | Várias prefeituras isoladas na mesma instância |
| Autenticação | Login por prefeitura + e-mail + senha, JWT em cookie, CSRF, troca de senha |
| Dashboard | Indicadores, gráficos, projetos em atraso, próximos prazos |
| Projetos | Cadastro, edição, exclusão, status, prioridade, orçamento, plano de governo |
| Atividades | Cadastro, execução, prazos previstos/reais, conclusão |
| Kanban | Não iniciado, Em andamento, Concluído |
| Protocolo | Encaminhamento entre secretarias com justificativa e histórico |
| Riscos | Matriz GUT por risco e nível de prioridade |
| 5W2H | Plano de ação vinculado ou não a um risco |
| SWOT | Forças, fraquezas, oportunidades e ameaças por projeto |
| Lições aprendidas | Banco de lições por projeto e visão consolidada |
| Anexos | Documentação de execução do projeto |
| Relatórios | Exportação XLSX com projetos, atividades, riscos e lições |
| Notificações | Alertas de transferência, prazo, status e atrasos |
| Auditoria | Log enxuto de acessos, ações e notificações |
| Histórico | Linha do tempo das alterações do projeto e dos prazos |
| Administração | Usuários, cargos, secretarias, perfis, identidade visual e logs |
| Identidade visual | Cores primária e secundária por prefeitura, com tema claro e escuro |
| Cronograma | Gantt de projetos e de atividades |
| Manual | Guia de uso dentro do sistema |

### 2.2 Fora do escopo da POC

- Integração real com o sistema financeiro da PMG (será criada uma interface de integração e documentação do contrato).
- Cobrança/billing do SaaS.
- Aplicativo mobile nativo.
- Envio de e-mail, SMS ou WhatsApp (as notificações são in-app).
- Assinatura digital de documentos.
- Armazenamento em nuvem (os anexos ficam em disco local na POC).
- MFA, SSO e recuperação de senha por e-mail.
- BI avançado ou data warehouse.

### 2.3 Evoluções previstas

- PostgreSQL com isolamento por schema ou RLS.
- Storage S3/MinIO para anexos.
- Integração financeira via API/arquivo.
- Templates de projeto e plano de governo.
- Relatórios agendados.
- Portal público de transparência.
- Aplicativo para campo (fiscalização de obras).

---

## 3. Modelo SaaS e multi-tenancy

- **Tenant = prefeitura.** Cada prefeitura tem nome, slug, cidade, estado e as cores primária e secundária da sua identidade visual.
- Todo registro de negócio carrega `tenant_id`; nenhuma consulta cruza tenants.
- Login identifica o tenant pelo slug (ex.: `guapimirim`), pelo e-mail e pela senha.
- Usuários pertencem a um tenant e, opcionalmente, a uma secretaria.
- E-mail é único dentro do tenant.
- O mesmo e-mail pode existir em prefeituras diferentes.
- JWT carrega `user_id`, `tenant_id`, `role` e `secretariat_id`; o backend recarrega usuário e tenant a cada requisição e valida se continuam ativos.
- Exclusões de projeto são lógicas (soft delete), preservando histórico.
- Dados de demonstração: uma prefeitura principal e uma segunda prefeitura para provar o isolamento.

### 3.1 White-label

- Cores primária e secundária por tenant, aplicadas ao menu, às ações, aos destaques e aos gráficos. Implementado na POC.
- Tema claro e escuro por usuário, com preferência preservada no navegador. Implementado na POC.
- Nome e logotipo por tenant: evolução.
- Subdomínio por prefeitura (`guapimirim.agora.app`): evolução.
- Domínio próprio no plano enterprise: evolução.

---

## 4. Perfis e permissões

Foram reduzidos os seis níveis atuais (Gestor, Consultor, Secretário, Administrador, Governo e Controle) para quatro papéis claros.

**Cargo e perfil de acesso são conceitos distintos.** Cargo é a função organizacional (Secretário, Diretor, Fiscal, Estagiário) e não concede permissão. Perfil de acesso é a permissão efetiva (Administrador, Gestor, Editor, Governo). O cargo é um catálogo por prefeitura, gerenciado pelo Administrador.

| Papel | Escopo de leitura | Pode criar | Pode editar | Pode excluir | Administração |
|---|---|---|---|---|---|
| **Administrador** | Todos os projetos do tenant | Sim | Sim, inclusive campos institucionais | Sim (exclusivo) | Usuários, secretarias, cargos, perfis, identidade visual e logs |
| **Gestor** | Projetos da própria secretaria + projetos compartilhados | Sim, da própria secretaria | Projetos sob responsabilidade da própria secretaria | Não | Não |
| **Editor** | Projetos da própria secretaria + projetos compartilhados | Sim, da própria secretaria | Projetos sob responsabilidade da própria secretaria | Não | Não |
| **Governo** | Todos os projetos do tenant | Não | Não | Não | Não (não acessa área de cadastro) |

### 4.1 Regras de visibilidade

- A secretaria responsável e as secretarias envolvidas veem o projeto.
- Secretarias não envolvidas não veem o projeto.
- Apenas a secretaria **responsável no momento** edita o projeto, atividades, riscos e anexos.
- Secretarias envolvidas podem acompanhar, mas não alterar.
- O perfil Governo vê todos os projetos, dashboards, kanban e relatórios, em modo somente leitura, e não acessa usuários, secretarias e logs.
- O Administrador vê tudo e é o único que exclui projetos.
- Quem criou o projeto continua vendo o projeto mesmo após encaminhá-lo.
- Toda ação sensível gera registro de auditoria.

### 4.2 Permissões por recurso

| Ação | Admin | Gestor | Editor | Governo |
|---|---|---|---|---|
| Criar projeto | Sim | Sim | Sim | Não |
| Editar projeto da própria secretaria | Sim | Sim | Sim | Não |
| Editar projeto de outra secretaria | Sim | Não | Não | Não |
| Encaminhar projeto | Sim | Sim (se responsável) | Sim (se responsável) | Não |
| Cancelar/suspender projeto | Sim | Sim (se responsável) | Sim (se responsável) | Não |
| Excluir projeto | Sim | Não | Não | Não |
| Gerenciar atividades/riscos/SWOT/lições/anexos | Sim | Sim (se responsável) | Sim (se responsável) | Não |
| Exportar relatórios | Sim | Sim | Sim | Sim |
| Gerenciar usuários e secretarias | Sim | Não | Não | Não |
| Consultar logs | Sim | Não | Não | Não |

Além do perfil, cada usuário pode receber permissões granulares (`projects.view`, `projects.create`, `projects.edit`, `projects.delete`, `projects.transfer`, `risks.edit`, `approvals.view`, `approvals.decide`, `finance.view`, `finance.edit`, `documents.edit`, `planning.edit`, `stakeholders.edit`, `reports.export`, `search.global`, `suppliers.manage`, `templates.manage`, `admin.users`, `admin.settings`, `admin.audit`, `portal.manage`). O perfil define o padrão e o administrador pode ajustar o que o usuário pode fazer.

---

## 5. Regras de negócio

### RN-01 — Código do projeto
O código é gerado automaticamente no formato `PRJ-<ano>-<sequencial>` (ex.: `PRJ-2026-0042`) e não pode ser editado.

### RN-02 — Campos obrigatórios do projeto
Nome, secretaria responsável, justificativa, objetivos, requisitos, avaliação de risco, prioridade e prazos previstos. Se o projeto atende ao plano de governo, a descrição da proposta é obrigatória.

### RN-03 — Imutabilidade dos campos institucionais
Justificativa, objetivos, requisitos, avaliação de risco e resposta do plano de governo (sim/não + qual) não podem ser alterados após o cadastro. O Administrador pode corrigir com registro explícito no histórico. Demais perfis recebem erro ao tentar alterar.

### RN-04 — Progresso do projeto
```
progresso = atividades concluídas ÷ total de atividades cadastradas × 100
```
- Atividades canceladas ou suspensas continuam no denominador.
- Projeto sem atividades tem progresso 0%.
- O progresso é sempre calculado, nunca digitado.
- Exibido como barra de progresso, substituindo emojis de status.

### RN-05 — Datas reais do projeto
- **Início real do projeto** = menor data de início real entre as atividades.
- **Término real do projeto** = maior data de término real quando todas as atividades estiverem concluídas.
- Enquanto alguma atividade não estiver concluída, o término real fica vazio.
- Datas reais não são preenchidas manualmente no projeto; vêm das atividades.

### RN-06 — Status do projeto
Status possíveis: `Não iniciado`, `Em andamento`, `Em atraso`, `Aguardando aprovação`, `Concluído`, `Concluído com atraso`, `Cancelado`, `Suspenso`.

Regras de cálculo automático:

1. Se o projeto estiver cancelado ou suspenso, o status manual é preservado.
2. Atividades canceladas são ignoradas no total e no progresso. Atividades suspensas contam no total e impedem a conclusão.
3. Todas as atividades não canceladas concluídas:
   - se alguma etapa de aprovação (`TÉCNICA`, `ORÇAMENTÁRIA`, `JURÍDICA`) não estiver aprovada → **Aguardando aprovação**;
   - alguma conclusão após o prazo ou término real após o término previsto → **Concluído com atraso**;
   - caso contrário → **Concluído**.
4. Data atual após o término previsto e projeto não concluído → **Em atraso**.
5. Existe atividade iniciada → **Em andamento**.
6. Caso contrário → **Não iniciado**.

O usuário pode cancelar, suspender e retomar (recalcular) o projeto. O status não pode ser escolhido livremente. Projetos legados sem etapas de aprovação cadastradas são tratados como aprovados.

### RN-07 — Status das atividades
Status possíveis: `Não iniciada`, `Em andamento`, `Em atraso`, `Concluída`, `Concluída com atraso`, `Cancelada`, `Suspensa`.

- Conclusão registra a data real de término.
- Conclusão após o término previsto vira **Concluída com atraso**.
- Início registra a data real de início.
- Atividade não concluída com término previsto no passado vira **Em atraso**.
- Cancelada e suspensa são estados manuais. Cancelada sai do total e do progresso; suspensa continua no total e bloqueia a conclusão do projeto.
- Suspender, cancelar e retomar uma atividade ficam disponíveis nas ações da atividade. Retomar valida as dependências antes de reiniciar e preserva o início real já registrado.
- Reabrir uma atividade concluída é exclusivo do administrador.

### RN-07A — Dependências entre atividades
- Uma atividade com predecessora não concluída não pode ser iniciada nem concluída. Predecessora cancelada é ignorada.
- Uma atividade concluída não pode ser reaberta se alguma sucessora já tiver sido iniciada.
- Não é possível criar dependência para uma sucessora já iniciada, duplicada ou que forme ciclo.
- A exclusão de uma atividade remove suas dependências.

### RN-08 — Alteração de prazos
Toda alteração de prazo previsto (do projeto ou de uma atividade) exige justificativa obrigatória. O sistema registra:
- quem alterou;
- data e hora;
- campo alterado;
- valor anterior e novo valor;
- justificativa.

O evento aparece no histórico do projeto e gera notificação para as secretarias envolvidas.

### RN-09 — Encaminhamento entre secretarias (protocolo)
- O projeto sempre tem uma secretaria responsável por vez.
- Só a secretaria responsável (ou Administrador) pode encaminhar.
- O destino precisa ser uma secretaria envolvida no projeto.
- Encaminhar exige justificativa.
- A secretaria de origem continua visualizando o projeto.
- A secretaria de destino passa a editá-lo.
- Cada encaminhamento gera um registro imutável com origem, destino, autor, data e justificativa.
- A secretaria de destino recebe notificação.

### RN-10 — Cancelamento e suspensão
- Cancelar/suspender exige que o usuário seja da secretaria responsável ou Administrador.
- O motivo é opcional, mas recomendado e registrado na auditoria.
- O projeto sai do kanban operacional e permanece acessível na lista com filtro.
- Ao retomar, o status é recalculado pelas regras da RN-06.

### RN-11 — Exclusão de projeto
Somente o Administrador exclui. A exclusão é lógica (soft delete), mantendo o registro para auditoria. Projetos excluídos não aparecem em listas, dashboards nem relatórios.

### RN-12 — Ordenação e filtros
- O portal organiza projetos pelas datas reais de início e término, com fallback para as previstas.
- Filtros: busca por nome/código, status, prioridade, secretaria, atraso, período e ordenação.
- O kanban usa o status macro: não iniciado, em andamento e concluído.
- Cancelados e suspensos não aparecem no kanban.

### RN-13 — Matriz GUT
Cada risco recebe notas de 1 a 5 para:

| Dimensão | Pergunta |
|---|---|
| Gravidade | Qual o impacto se o risco acontecer? |
| Urgência | Quão rápido precisamos agir? |
| Tendência | Qual a chance de piorar? |

```
GUT = Gravidade × Urgência × Tendência  (1 a 125)
```

Classificação:

| Pontuação | Nível |
|---|---|
| 100 a 125 | Crítico |
| 60 a 99 | Alto |
| 30 a 59 | Médio |
| 1 a 29 | Baixo |

Riscos são ordenados por pontuação. Cada risco pode ter responsável, resposta planejada e status (aberto, mitigado, encerrado).

### RN-14 — Plano de ação 5W2H
Cada ação registra: o que, por que, onde, quando, quem, como e quanto custa. Pode estar vinculada a um risco. Status: planejada, em execução, concluída ou cancelada.

### RN-15 — Plano de governo
- Campo booleano "O projeto atende proposta do plano de governo?".
- Se sim, abre o campo "Qual?" obrigatório.
- Ambos ficam imutáveis após o cadastro (RN-03).
- O dashboard executivo destaca a aderência ao plano de governo.

### RN-16 — Orçamento
- Orçamento previsto e executado, em reais, não negativos.
- Executado acima do previsto é permitido, mas sinalizado visualmente.
- O dashboard mostra previsto versus executado por secretaria.

### RN-17 — Anexos
- Documentação que legitima a execução do projeto (substitui o nome atual do recurso).
- Anexos podem ser vinculados ao projeto ou a uma atividade específica.
- Limite de 10 MB por arquivo.
- Formatos aceitos: PDF, imagens, planilhas e documentos Office.
- Download apenas para usuários com visibilidade sobre o projeto.
- Exclusão apenas pela secretaria responsável ou Administrador.
- Todo upload e remoção é auditado.

### RN-18 — Notificações e alertas
Eventos que geram notificação:
- projeto encaminhado para a secretaria;
- alteração de prazo de projeto ou atividade;
- mudança de status;
- projeto ou atividade em atraso (alerta);
- prazo previsto próximo do vencimento (7 dias);
- projeto compartilhado com nova secretaria.

Regras:
- notificações in-app por usuário;
- contador de não lidas no topo;
- marcação individual ou em massa como lida;
- alertas automáticos deduplicados por dia para não gerar spam;
- cada alerta enviado é registrado na auditoria.

### RN-19 — Auditoria e histórico
Log enxuto com: login, usuário, ação, entidade, identificador, detalhes, IP e data/hora. Consultas disponíveis:
- **Histórico do projeto**: alterações do projeto, mudanças de prazo e encaminhamentos, com filtro por tipo e paginação incremental.
- **Auditoria global** (Administrador): filtros por usuário, ação, entidade e período, com exportação CSV.

Tentativas de login inválidas também são auditadas. A conta é bloqueada por 15 minutos após cinco tentativas consecutivas. Nenhum log pode ser alterado ou excluído pela aplicação.

### RN-20 — Relatórios
- Exportação em XLSX com filtros aplicados na tela.
- Abas: Projetos, Atividades, Riscos e Lições aprendidas.
- Respeita a visibilidade do perfil: Governo exporta tudo; secretarias exportam apenas o que veem.
- Colunas de projetos: código, nome, secretaria responsável, secretarias envolvidas, status, prioridade, progresso, datas previstas e reais, orçamento, aderência ao plano de governo.

### RN-21 — Lições aprendidas
- Registro por projeto com título, descrição, categoria e autor.
- Banco consolidado com filtros por projeto, categoria e secretaria.
- Disponível para todos os perfis com acesso aos projetos correspondentes.
- Exclusão pelo autor, secretaria responsável ou Administrador.

### RN-22 — SWOT
- Itens classificados em forças, fraquezas, oportunidades e ameaças.
- Vinculados a um projeto.
- Qualquer usuário com permissão de edição do projeto pode incluir e remover itens.

### RN-23 — Configuração de idioma e linguagem
- Interface integralmente em português do Brasil.
- Termos padronizados em todas as telas (ex.: "projeto", "atividade", "secretaria", "encaminhamento").
- Datas no formato `dd/mm/aaaa`; valores em `R$`.
- Status nunca representados por emoji.

---

## 6. Modelo de dados

### 6.1 Entidades

| Entidade | Campos principais | Relações |
|---|---|---|
| Tenant | nome, slug, cidade, estado, ativo | 1:N secretarias, usuários, projetos |
| Secretariat | nome, sigla, cor, ativo | N:N projetos; 1:N usuários |
| Cargo | nome, descrição, ativo | N:1 tenant; 1:N usuários |
| User | nome, e-mail, senha (hash), cargo, papel, ativo, último login | N:1 tenant, secretaria, cargo |
| Project | código, nome, justificativa, objetivos, requisitos, avaliação de risco, plano de governo, prioridade, status, datas previstas/reais, orçamento | N:1 tenant, secretaria responsável, criador; N:N secretarias; 1:N atividades, riscos, ações, SWOT, lições, anexos, transferências |
| Activity | título, descrição, status, datas previstas/reais, ordem | N:1 projeto |
| ProjectTransfer | origem, destino, autor, justificativa, data | N:1 projeto |
| DeadlineChange | entidade, campo, valor antigo, valor novo, justificativa, autor | N:1 projeto |
| Risk | descrição, categoria, gravidade, urgência, tendência, GUT, nível, resposta, responsável, status | N:1 projeto |
| Action5W2H | o quê, por quê, onde, quando, quem, como, quanto | N:1 projeto, risco (opcional) |
| SwotItem | quadrante, descrição | N:1 projeto |
| Lesson | título, descrição, categoria, autor | N:1 projeto |
| Attachment | nome, arquivo armazenado, tipo, tamanho, autor | N:1 projeto |
| Notification | título, mensagem, tipo, link, lida em | N:1 usuário |
| AuditLog | usuário, ação, entidade, entidade_id, detalhes, IP | N:1 tenant |

### 6.2 Diagrama simplificado

```
Tenant 1─N Secretariat 1─N User
  │              │
  │              └──N:N── Project ──1:N── Activity
  │                          │
  │                          ├──1:N── Risk ──1:N── Action5W2H
  │                          ├──1:N── SwotItem
  │                          ├──1:N── Lesson
  │                          ├──1:N── Attachment
  │                          ├──1:N── ProjectTransfer
  │                          └──1:N── DeadlineChange
  │
  └──1:N Notification / AuditLog
```

### 6.3 Enums

**Terminologia canônica:** `Projeto` e `Atividade`. "Processo" e "tarefa" não aparecem na interface.

**Papéis:** `ADMIN`, `GESTOR`, `EDITOR`, `GOVERNO`

**Prioridade:** `BAIXA`, `MEDIA`, `ALTA`, `CRITICA`

**Status do projeto:** `NAO_INICIADO`, `EM_ANDAMENTO`, `EM_ATRASO`, `AGUARDANDO_APROVACAO`, `CONCLUIDO`, `CONCLUIDO_COM_ATRASO`, `CANCELADO`, `SUSPENSO`

**Status de atividade:** `NAO_INICIADA`, `EM_ANDAMENTO`, `EM_ATRASO`, `CONCLUIDA`, `CONCLUIDA_COM_ATRASO`, `CANCELADA`, `SUSPENSA`

**SWOT:** `FORCA`, `FRAQUEZA`, `OPORTUNIDADE`, `AMEACA`

**Notificação:** `PROJETO`, `PRAZO`, `STATUS`, `TRANSFERENCIA`, `ATRASO`, `SISTEMA`

---

## 7. Arquitetura técnica

### 7.1 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript + Vite |
| Estilo | Tailwind CSS + shadcn/ui |
| Roteamento | React Router |
| Dados no cliente | TanStack Query (cache, invalidação e optimistic updates) |
| Tempo real | WebSocket nativo (gorilla/websocket) + eventos invalidando o cache do TanStack Query |
| Gráficos | Recharts |
| Formulários | React Hook Form + Zod |
| Backend | Go 1.24 + Chi |
| ORM | GORM |
| Banco | PostgreSQL 16 (via Docker Compose no desenvolvimento) |
| Autenticação | JWT + bcrypt |
| Planilhas | Excelize |
| Ícones | Lucide |
| Toasts | Sonner |

### 7.2 Estrutura do repositório

```
poc-ERP/
├── ESPECIFICACAO.md
├── README.md
├── docker-compose.yml       # PostgreSQL 16 para desenvolvimento
├── backend/
│   ├── main.go
│   ├── data/                # uploads (não versionados)
│   ├── migrations/          # migrações SQL versionadas
│   └── internal/
│       ├── auth/            # JWT, CSRF e senha
│       ├── config/
│       ├── database/        # conexão, runner de migrações e seed
│       ├── handlers/        # endpoints HTTP
│       ├── middleware/      # autenticação, CSRF e papéis
│       ├── models/
│       ├── realtime/        # hub WebSocket por tenant
│       ├── service/         # regras de status e progresso
│       └── server/          # rotas e CORS
└── frontend/
    ├── src/
    │   ├── components/      # UI e componentes de domínio
    │   ├── pages/
    │   ├── lib/             # API client, formatação, permissões
    │   ├── hooks/
    │   └── types/
    └── vite.config.ts
```

### 7.3 Decisões

- **PostgreSQL** como banco único, isolamento por `tenant_id` em todas as consultas. O desenvolvimento usa Docker Compose com volume persistente.
- **Tempo real por WebSocket** nativo, com hub em memória separado por tenant. Eventos publicados: `project.changed`, `settings.changed`, `notification.created` e `notification.read`. O frontend escuta em `/api/ws` usando o cookie de sessão e invalida queries específicas do TanStack Query, sem refetch manual.
- **TanStack Query** como única fonte de estado de servidor (cache, stale time, invalidação e optimistic updates). Estado de UI fica local.
- **JWT em cookie `HttpOnly`** com `SameSite=Lax` e `Secure` em produção. Requisições de escrita usam token CSRF vinculado à sessão. Refresh token continua como evolução.
- **Anexos em disco** (`backend/data/uploads`) na POC. Em produção: storage de objetos.
- **REST** sob `/api`, com erros em JSON `{ "error": "mensagem" }`; WebSocket em `/api/ws`.
- **CORS** restrito às origens do frontend; a origem também é validada no upgrade do WebSocket.
- **Seed idempotente** com dados demonstrativos realistas.
- **Sem DnD no Kanban** na POC: status é derivado das atividades e alterado na tela de atividades.

### 7.4 Segurança

- Senhas com bcrypt.
- Nenhuma resposta expõe hash de senha.
- JWT de sessão em cookie `HttpOnly`; o frontend não armazena o token.
- Token CSRF obrigatório em requisições de escrita autenticadas por cookie.
- CORS com credenciais permitido apenas nas origens configuradas.
- Autorização checada no backend em toda operação (nunca só na UI).
- Escopo de tenant aplicado em todas as consultas.
- Validação de arquivos por tamanho e extensão.
- Logs sem dados sensíveis.
- Bloqueio temporário de login após cinco tentativas inválidas.
- Cabeçalhos de segurança nas respostas e timeouts no servidor HTTP.
- Rate limiting e HTTPS obrigatórios em produção (evolução).

---

## 8. API (REST)

Prefixo: `/api`

### 8.1 Públicos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/public/tenants` | Lista prefeituras ativas para o login |
| POST | `/auth/login` | Login por prefeitura, e-mail e senha; define cookie de sessão e retorna token CSRF |
| GET | `/health` | Saúde do serviço |

### 8.2 Autenticados

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/auth/me` | Todos | Usuário, tenant e permissões |
| GET | `/auth/csrf` | Todos | Retorna o token CSRF da sessão atual |
| POST | `/auth/logout` | Todos | Encerra a sessão e remove o cookie |
| PUT | `/auth/profile` | Todos | Atualiza o próprio nome |
| POST | `/auth/change-password` | Todos | Troca de senha |
| GET | `/dashboard` | Todos | Indicadores, gráficos e listas |
| GET | `/search?q=` | Todos | Busca global por projetos; pessoas apenas para Admin |
| GET | `/projects` | Todos | Lista com filtros e paginação |
| POST | `/projects` | Admin/Gestor/Editor | Cria projeto |
| GET | `/projects/{id}` | Visível | Detalhe + permissões |
| PUT | `/projects/{id}` | Responsável/Admin | Atualiza projeto |
| DELETE | `/projects/{id}` | Admin | Exclusão lógica |
| PATCH | `/projects/{id}/status` | Responsável/Admin | Cancela, suspende ou retoma |
| POST | `/projects/{id}/transfer` | Responsável/Admin | Encaminha para outra secretaria |
| GET | `/projects/{id}/history` | Visível | Histórico, prazos e transferências |
| GET | `/projects/kanban` | Todos | Quadro por status macro |
| GET | `/projects/gantt` | Todos | Cronograma macro |
| GET | `/projects/{id}/activities` | Visível | Atividades |
| POST | `/projects/{id}/activities` | Responsável/Admin | Cria atividade |
| PUT | `/activities/{id}` | Responsável/Admin | Atualiza atividade |
| DELETE | `/activities/{id}` | Responsável/Admin | Remove atividade |
| GET | `/projects/{id}/risks` | Visível | Riscos |
| POST | `/projects/{id}/risks` | Responsável/Admin | Cria risco (GUT calculado) |
| PUT | `/risks/{id}` | Responsável/Admin | Atualiza risco |
| DELETE | `/risks/{id}` | Responsável/Admin | Remove risco |
| GET | `/projects/{id}/actions` | Visível | Planos 5W2H |
| POST | `/projects/{id}/actions` | Responsável/Admin | Cria plano |
| PUT | `/actions/{id}` | Responsável/Admin | Atualiza plano |
| DELETE | `/actions/{id}` | Responsável/Admin | Remove plano |
| GET | `/projects/{id}/swot` | Visível | Itens SWOT |
| POST | `/projects/{id}/swot` | Responsável/Admin | Cria item |
| DELETE | `/swot/{id}` | Responsável/Admin | Remove item |
| GET | `/projects/{id}/lessons` | Visível | Lições do projeto |
| POST | `/projects/{id}/lessons` | Responsável/Admin | Cria lição |
| DELETE | `/lessons/{id}` | Autor/Responsável/Admin | Remove lição |
| GET | `/lessons` | Todos | Banco consolidado |
| GET | `/projects/{id}/attachments` | Visível | Anexos do projeto |
| POST | `/projects/{id}/attachments` | Responsável/Admin | Envia anexo do projeto |
| GET | `/activities/{id}/attachments` | Visível | Anexos da atividade |
| POST | `/activities/{id}/attachments` | Responsável/Admin | Envia anexo da atividade |
| GET | `/attachments/{id}/download` | Visível | Baixa anexo |
| DELETE | `/attachments/{id}` | Responsável/Admin | Remove anexo |
| GET | `/reports/projects.xlsx` | Todos | Relatório XLSX com filtros e período |
| GET | `/reports/summary` | Todos | Contagem de projetos, atividades e riscos no filtro |
| GET | `/notifications` | Todos | Notificações do usuário |
| POST | `/notifications/{id}/read` | Dono | Marca como lida |
| POST | `/notifications/read-all` | Dono | Marca todas como lidas |
| GET | `/secretariats` | Todos | Secretarias do tenant |
| POST/PUT/DELETE | `/secretariats/{id}` | Admin | Gestão de secretarias |
| GET | `/cargos` | Todos | Catálogo de cargos |
| POST/PUT/DELETE | `/cargos/{id}` | Admin | Gestão de cargos |
| GET | `/users` | Admin | Usuários do tenant |
| POST/PUT/DELETE | `/users/{id}` | Admin | Gestão de usuários |
| PUT | `/settings/branding` | Admin | Cores primária e secundária da prefeitura |
| GET | `/logs` | Admin | Auditoria com filtros |
| GET | `/logs/export` | Admin | Exporta a auditoria filtrada em CSV |

### 8.3 Tempo real (WebSocket)

Conexão: `ws://localhost:8090/api/ws` com o cookie de sessão. O token é validado no upgrade; a conexão é isolada por tenant.

| Evento | Origem | Uso no frontend |
|---|---|---|
| `project.changed` | Criação/edição/exclusão de projeto, atividade, risco, 5W2H, SWOT, lição, anexo, prazo, status ou transferência | Invalidar `projects`, `project`, `dashboard`, `kanban`, `gantt` e o histórico do projeto |
| `settings.changed` | Alterações de secretaria, cargo ou usuário | Invalidar `secretariats`, `cargos`, `users` |
| `notification.created` | Nova notificação para um usuário | Invalidar `notifications` e exibir toast |
| `notification.read` | Notificação marcada como lida | Invalidar `notifications` |

Envelope:

```json
{
  "type": "project.changed",
  "action": "ATIVIDADE_ATUALIZADA",
  "tenant_id": 1,
  "user_id": 2,
  "project_id": 1,
  "payload": { "details": "Atividade \"...\"" },
  "at": "2026-10-19T19:57:34-03:00"
}
```

O cliente envia `ping` como texto e o servidor responde com `pong` de controle. Reconexão com backoff e invalidação geral ao reconectar ficam a cargo do frontend.

---

## 9. Telas e experiência

O detalhamento completo de layout, campos, validações, estados e microcopy está em [`TELAS.md`](./TELAS.md).

### 9.1 Mapa de navegação

```
Login
└── Aplicação
    ├── Painel executivo        (todos)
    ├── Projetos
    │   ├── Lista               (todos)
    │   ├── Kanban              (todos)
    │   ├── Novo projeto        (Admin/Gestor/Editor)
    │   └── Detalhe
    │       ├── Visão geral
    │       ├── Atividades
    │       ├── Cronograma
    │       ├── Riscos e 5W2H
    │       ├── SWOT
    │       ├── Lições aprendidas
    │       ├── Anexos
    │       └── Histórico
    ├── Cronograma (Gantt)      (todos)
    ├── Relatórios              (todos)
    ├── Lições aprendidas       (todos)
    ├── Administração           (Admin)
    │   ├── Usuários
    │   ├── Secretarias
    │   └── Auditoria
    └── Manual do sistema       (todos)
```

### 9.2 Painel executivo

Leitura em menos de um minuto:

- total de projetos;
- em andamento;
- em atraso;
- concluídos;
- orçamento previsto versus executado;
- progresso médio;
- atividades atrasadas;
- gráfico de projetos por status;
- gráfico por secretaria;
- lista de projetos em atraso;
- próximos vencimentos;
- atividades recentes da equipe (quando permitido).

### 9.3 Projetos — lista

- Busca por nome ou código.
- Filtros por status, prioridade, secretaria, atraso e período.
- Intervalo de período considera a sobreposição com as datas efetivas do projeto (reais ou previstas).
- Ordenação por atualização, nome, prazo, prioridade e progresso.
- Cartões/linhas com código, nome, secretaria, status, progresso, prazo real ou previsto e orçamento.
- Ações conforme permissão: abrir, editar, encaminhar, cancelar, excluir.

### 9.4 Kanban

Três colunas: **Não iniciado**, **Em andamento**, **Concluído**.
Cada cartão mostra nome, secretaria, prioridade, progresso e prazo. Clique abre o projeto; botão de edição aparece apenas para quem pode editar. Cancelados e suspensos ficam fora do quadro.

### 9.5 Detalhe do projeto

Cabeçalho com código, nome, status, prioridade, barra de progresso, secretaria responsável e ações. Abas:

- **Visão geral**: justificativa, objetivos, requisitos, avaliação de risco, plano de governo, orçamento, secretarias envolvidas, prazos e responsáveis.
- **Atividades**: lista ordenada, criação/edição, início e conclusão, prazos previstos e reais. Alterar prazo abre justificativa. Cada atividade tem anexos próprios.
- **Cronograma**: Gantt das atividades.
- **Riscos e 5W2H**: tabela GUT ordenada por criticidade e planos de ação.
- **SWOT**: quatro quadrantes.
- **Lições aprendidas**: registros do projeto.
- **Anexos**: upload, download e exclusão.
- **Histórico**: linha do tempo de alterações, prazos e encaminhamentos.

### 9.6 Diretrizes visuais

- Linguagem visual sóbria e contemporânea, sem aparência de sistema legado.
- Paleta: verde institucional profundo + dourado para execução e progresso; neutros quentes para leitura prolongada. As cores primária e secundária são substituídas pelas da prefeitura.
- Tema claro e escuro, com alternância no topo do aplicativo e na tela de login.
- Tipografia clara, com hierarquia forte e números tabulares em indicadores.
- Barras de progresso no lugar de emojis.
- Status sempre com cor + texto (nunca só cor).
- Contraste WCAG AA, foco visível e navegação por teclado.
- Layout responsivo a partir de 360 px.
- Densidade controlada: dashboards arejados; listas densas e escaneáveis.

---

## 10. Notificações e alertas

### 10.1 In-app

Sino no topo com contador de não lidas. Painel lateral lista notificações por tipo, com link para o projeto. Ações: marcar como lida e marcar todas.

### 10.2 Alertas automáticos

Rotina executa na inicialização e a cada 6 horas:

- projeto em atraso;
- atividade em atraso;
- prazo previsto vencendo em até 7 dias.

Cada alerta é deduplicado por usuário, tipo e link no mesmo dia. O envio é auditado.

### 10.3 Evolução

E-mail transacional, preferências por tipo e resumo semanal.

---

## 11. Relatórios e integração financeira

### 11.1 XLSX

Arquivo com quatro abas:

1. **Projetos**: identificação, secretarias, status, prioridade, progresso, datas, orçamento, plano de governo.
2. **Atividades**: projeto, título, status, datas previstas e reais, atraso.
3. **Riscos**: projeto, descrição, GUT, nível, responsável, status.
4. **Lições aprendidas**: projeto, título, categoria, autor.

Filtros da tela são aplicados ao relatório e ao escopo de visibilidade do usuário.

### 11.2 Integração com o financeiro da PMG

Fora do escopo da POC. Será definida uma interface de integração com:

- contrato documentado (endpoints ou layout de arquivo);
- mapeamento de projeto → dotação/empenho;
- sincronização de orçamento previsto e executado;
- logs de sincronização e tratamento de erro.

Na POC, os valores de orçamento são editáveis manualmente.

---

## 12. Roadmap de implementação

| Fase | Entrega |
|---|---|
| 1 | Especificação e alinhamento (este documento) |
| 2 | Backend: modelos, autenticação, multi-tenant, projetos, atividades, regras de status |
| 3 | Seed com dados demonstrativos e quatro perfis |
| 4 | Frontend: login, shell, painel, lista e kanban |
| 5 | Detalhe do projeto: atividades, prazos, riscos, SWOT, lições, anexos, histórico |
| 6 | Encaminhamento, notificações, relatórios, administração e auditoria |
| 7 | Acabamento visual, responsividade, testes de fluxo e README |

---

## 13. Critérios de aceite (rastreabilidade AGEVAP)

| Requisito original | Como será atendido |
|---|---|
| Revisar layout geral e padronizar linguagem | Design system próprio, PT-BR padronizado, status sem emoji |
| Organizar projetos por datas reais | Início/término real calculados pelas atividades; ordenação e exibição priorizam o real |
| Portal mais simples / kanban | Kanban de três colunas |
| Eliminar abas Estudo e Obra | Não existem no novo modelo |
| Emojis → barras de progresso | Progresso calculado e exibido em barra |
| Revisar status de projetos e atividades | Enums e cálculo automático definidos (RN-06 e RN-07) |
| Dashboards básicos para o prefeito | Painel executivo somente leitura |
| Integração total entre secretarias | Projeto único, N:N de secretarias, sem duplicidade |
| Encaminhamento para próxima secretaria | Protocolo de transferência (RN-09) |
| Secretaria vê apenas seus projetos; prefeito vê tudo | Regras de visibilidade (seção 4.1) |
| Emitir relatórios filtráveis | XLSX com filtros e quatro abas |
| Gestão de riscos com GUT e 5W2H | Módulo de riscos e planos de ação |
| Melhorar consultas de projetos, usuários e log | Busca, filtros, auditoria e histórico |
| Manter Histórico de Atualizações | Aba de histórico por projeto |
| Enxugar níveis de acesso | Quatro papéis definidos |
| Exclusão apenas pelo Administrador | RN-11 |
| Justificativa ao editar prazos | RN-08 |
| Vincular datas reais do projeto às atividades | RN-05 |
| Notificações e alertas funcionando | Seção 10 |
| Revisar campos do projeto | Seção 5 e formulário de cadastro |
| Manual do sistema | Página interna em PT-BR |
| Banco de lições aprendidas | Módulo de lições |
| SWOT | Módulo SWOT |
| Gantt | Cronograma macro e por projeto |
| Integração financeira PMG | Fora da POC; interface documentada |

---

## 14. Dados de demonstração

Uma prefeitura principal com cinco secretarias (Obras, Educação, Saúde, Meio Ambiente e Administração), projetos em todos os status, atividades, riscos, planos 5W2H, SWOT, lições, anexos e histórico. Uma segunda prefeitura para validar isolamento.

**Contas planejadas:**

| Perfil | E-mail |
|---|---|
| Administrador | `admin@guapimirim.gov.br` |
| Gestor (Obras) | `gestor.obras@guapimirim.gov.br` |
| Editor (Obras) | `editor.obras@guapimirim.gov.br` |
| Governo (Prefeito) | `prefeito@guapimirim.gov.br` |
| Administrador (2º tenant) | `admin@mage.gov.br` |

A senha inicial é definida por `SEED_PASSWORD` e não é versionada.

Slug da prefeitura principal: `guapimirim`.

---

## 15. Como executar

```bash
# banco (PostgreSQL 16 em localhost:5434)
docker compose up -d

# backend (localhost:8090)
cd backend
go mod tidy
go run .

# frontend (localhost:5173)
cd frontend
npm install
npm run dev
```

Backend em `http://localhost:8090`, frontend em `http://localhost:5173`, PostgreSQL em `localhost:5434` (Docker Compose).

Variáveis do backend: `PORT`, `DATABASE_URL`, `UPLOAD_DIR`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `SEED` (ver `backend/.env.example`). Migrações são aplicadas de `backend/migrations` no boot. O WebSocket fica em `ws://localhost:8090/api/ws` e usa o cookie de sessão.

---

## 16. Definition of Done da POC

- Login e isolamento entre duas prefeituras funcionando.
- Quatro perfis aplicados no backend e refletidos na interface.
- CRUD de projetos e atividades com todas as regras de status e progresso.
- Encaminhamento com histórico e notificação.
- Prazos com justificativa obrigatória e auditoria.
- Riscos GUT, 5W2H, SWOT, lições e anexos operacionais.
- Dashboard e relatório XLSX coerentes com os dados.
- Notificações e alertas funcionando.
- Administração de usuários e secretarias.
- Manual interno.
- Fluxo completo testado no navegador.
- README com setup e arquitetura.

---

## 17. Decisões

### Já decididas

- Terminologia canônica: **Projeto** e **Atividade**.
- **Cargo** separado de **perfil de acesso**.
- Kanban sem arrastar e soltar: o status deriva da execução das atividades.
- Usuário é inativado, nunca excluído.

### Em aberto

1. **Aprovação dos documentos** `ESPECIFICACAO.md` e `TELAS.md` antes de retomar a implementação.
2. Nome do produto: manter **Ágora** ou usar a marca AGEVAP?
3. Os campos institucionais devem ser corrigíveis pelo Administrador (com auditoria) ou bloqueados para todos?
4. O perfil Governo pode exportar relatórios ou apenas visualizar dashboards e kanban?
5. Prazo de alerta de vencimento: 7 dias é adequado?
6. A integração financeira deve entrar na POC como simulação ou ficar apenas documentada?
7. Cancelamento de projeto é final para todos ou o Administrador pode retomar?
8. Cargos são catálogo por prefeitura ou lista global da plataforma?

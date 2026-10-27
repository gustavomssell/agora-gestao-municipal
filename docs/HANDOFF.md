# Handoff — estado do projeto

Última atualização: 2026-10-27

## Estado atual

- Branch de trabalho: `develop`, sincronizada com `origin/develop`.
- Release corrente: `v0.2.0`, com o hardening de produção e as correções de fluxo de projeto.
- Backend validado com `gofmt -l .`, `go vet ./...` e `go test ./...`.
- Frontend validado com `npm run lint` (0 erros) e `npm run build`.
- Fluxo de projeto validado via API: 44 verificações cobrindo dependências, aprovações, status derivado, ações de atividade, Kanban, dashboard, cronograma, transparência e permissões.
- Ambiente local: Docker Desktop + Postgres `agora-postgres` (`:5434`), API (`:8090`) e Vite (`:5173`).

## O que mudou em 0.2.0

### Segurança

- Migrações SQL versionadas em `backend/migrations`, com controle em `schema_migrations`, no lugar de `AutoMigrate`.
- Sessão em cookie `HttpOnly` de 16 horas, com `Secure` em produção e `SameSite=Lax`.
- CSRF obrigatório nas escritas, com token derivado da sessão e guardado apenas em `sessionStorage`.
- WebSocket autenticado pelo cookie, sem token na query string.

### Fluxo de projeto

- Status `AGUARDANDO_APROVACAO`: o projeto só conclui com as etapas técnica, orçamentária e jurídica aprovadas.
- Atividades canceladas saem do progresso; suspensas bloqueiam a conclusão.
- Alteração manual de status restrita a cancelar, suspender e retomar.
- Início, conclusão e reabertura de atividade respeitam dependências.
- Kanban com quatro colunas; indicadores atualizados em dashboard, cronograma, relatórios, alertas e portal público.

### Interface

- Rotas carregadas sob demanda: chunk principal em ~259 kB.
- Ajustes de responsividade em header, painel, kanban, administração, projeto, cronograma e portal público.
- Ações de suspender, cancelar e retomar atividade.

## Pendências

1. Purge do commit antigo com credencial no GitHub e encerramento do alerta GitGuardian, após rotação da senha exposta.
2. JWT stateless: o logout remove o cookie, mas não revoga tokens já emitidos.
3. Sem testes E2E, testes de carga e integrações reais de e-mail, WhatsApp, gov.br ou assinatura digital.
4. Produção exige HTTPS para o cookie `Secure`; deploy cross-site exigiria revisar `SameSite`.

## Comandos úteis

```powershell
cd backend
gofmt -l .
go vet ./...
go test ./...

cd ..\frontend
npm run lint
npm run build
```

## Observações

- `v0.1.0` continua com CI vermelho por lockfile antigo; use `v0.1.2` ou superior como release válida.
- Não há credenciais demo neste documento.

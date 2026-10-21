# Handoff — responsividade mobile/tablet

Última atualização: 2026-10-21

## Estado atual

- Branch de trabalho: `fix/responsividade-mobile`
- Último commit: `b0f1b08` (`fix(ui): improve responsive layout on mobile and tablet`)
- Ajustes desta rodada estão no working tree, ainda sem commit e sem push.
- Frontend validado com `npm run lint` (0 erros, 13 warnings) e `npm run build` (sucesso).
- Backend validado com `go test ./...` (sucesso); não foi alterado.
- Ambiente local ativo: Docker Desktop + Postgres `agora-postgres` (`:5434`), API (`:8090`) e Vite (`:5173`).
- Chrome DevTools MCP reconectado e usado na validação visual.

## O que foi ajustado

- Header mobile: tema movido para o menu lateral; título e sobretítulo sem truncamento excessivo; nome do usuário só aparece a partir de `lg`.
- Alvos de toque: botões, inputs, selects e abas com no mínimo 44 px em dispositivos `pointer: coarse` até 1023 px.
- `PageHeader`: empilha título e ações até `lg`, evitando apertos em 768 px.
- Dashboard: hero em coluna única até `lg`; filtros e botão ocupam a largura no mobile.
- Kanban: 2 colunas em tablet e 3 em desktop; filtros full-width no mobile.
- Administração: abas com wrap; lista de usuários/secretarias em cards até `lg`; coluna Cargo só em `xl`.
- Auditoria e perfis: matriz de permissões e trilha de auditoria em cards até `xl`, com tabela apenas em telas largas; entidade e IP só aparecem em `2xl` na tabela de auditoria.
- Filtros da auditoria ocupam a largura no mobile.
- Projeto: abas com scroll horizontal e gradiente de affordance; checklist documental empilhado no mobile.
- Cronograma: botão e filtro full-width no mobile.
- Portal público: badge de status do hero com texto branco e contraste adequado.

## Validação visual feita

- 320 px: relatórios e auditoria (demais rotas já validadas na rodada anterior).
- 390 px: painel, projetos, kanban, cronograma, relatórios, administração, perfil, projeto e portal público.
- 768 px: perfis e auditoria da administração (demais rotas já validadas).
- 1024 px: auditoria da administração.
- 1280 px: tabelas de perfis e auditoria.
- 1440 px: painel, kanban, relatórios, administração, portal público e detalhe público.
- Sem overflow horizontal de documento nas rotas verificadas.

## Pendências para continuar

1. Revisar e commitar os ajustes desta rodada; depois seguir Gitflow e rodar CI em `develop`/`main`.
2. Pendências externas de segurança: purge do commit antigo no GitHub e resolução do alerta GitGuardian.

## Comandos úteis

```powershell
cd frontend
npm run lint
npm run build
```

## Observações

- `v0.1.0` continua com CI vermelho por lockfile antigo; usar `v0.1.2` como release válida.
- Não há credenciais demo neste documento.

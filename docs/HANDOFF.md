# Handoff — responsividade mobile/tablet

Última atualização: 2026-10-20

## Estado atual

- Branch de trabalho: `fix/responsividade-mobile`
- Commit base: `4588a24` (`release: v0.1.2`)
- Alterações desta etapa commitadas nesta branch; sem push.
- Frontend validado com `npm run lint` (0 erros, 13 warnings) e `npm run build` (sucesso).
- Backend não foi alterado nesta etapa.
- API local em `:8090` e Vite em `:5173`.
- O Chrome DevTools MCP perdeu a conexão ao final; se for retomar a inspeção visual, reiniciar o navegador/MCP.

## O que foi ajustado

- Header mobile: tema movido para o menu lateral; título e sobretítulo sem truncamento excessivo; nome do usuário só aparece a partir de `lg`.
- Alvos de toque: botões, inputs, selects e abas com no mínimo 44 px em dispositivos `pointer: coarse` até 1023 px.
- `PageHeader`: empilha título e ações até `lg`, evitando apertos em 768 px.
- Dashboard: hero em coluna única até `lg`; filtros e botão ocupam a largura no mobile.
- Kanban: 2 colunas em tablet e 3 em desktop; filtros full-width no mobile.
- Administração: abas com wrap; lista de usuários/secretarias em cards até `lg`; coluna Cargo só em `xl`.
- Projeto: abas com scroll horizontal e gradiente de affordance; checklist documental empilhado no mobile.
- Cronograma: botão e filtro full-width no mobile.

## Validação visual feita

- 320 px: login, painel, projetos, cronograma, kanban, administração, projeto/documentos, relatórios e portal público.
- 768 px: painel, kanban, administração, login.
- 1024 px: administração.
- Sem overflow horizontal de documento nas rotas verificadas.

## Pendências para continuar

1. Revalidar em 390 px e 1440 px.
2. Revisar o restante da página de relatórios em 320/768.
3. Avaliar as tabelas de auditoria e perfis em 768/1024; elas ainda usam scroll horizontal.
4. Corrigir contraste do badge de status no hero do portal público.
5. Rodar CI após push e confirmar `main`/`develop`.
6. Pendências externas de segurança: purge do commit antigo no GitHub e resolução do alerta GitGuardian.

## Comandos úteis

```powershell
cd frontend
npm run lint
npm run build
```

## Observações

- `v0.1.0` continua com CI vermelho por lockfile antigo; usar `v0.1.2` como release válida.
- Não há credenciais demo neste documento.

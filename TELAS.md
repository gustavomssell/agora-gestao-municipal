# Ágora — Telas, Fluxos e Especificação de Interface

Complemento de `ESPECIFICACAO.md`. Este documento define como cada tela funciona, o que aparece para cada perfil, quais campos existem, quais validações se aplicam e como os fluxos se conectam.

Versão: 0.1
Status: em aprovação

---

## 1. Decisões de interface

| Tema | Decisão |
|---|---|
| Terminologia | **Projeto** e **Atividade** em toda a interface. "Processo" e "tarefa" não aparecem nas telas, para cumprir o requisito de linguagem padronizada. |
| Cargo | **Cargo** é a função organizacional (Secretário, Diretor, Fiscal, Estagiário). **Perfil de acesso** é a permissão (Administrador, Gestor, Editor, Governo). São campos separados. |
| Kanban | Visual e clicável, **sem arrastar cartões** na POC. O status deriva da execução das atividades; arrastar quebraria a integridade das regras RN-06 e RN-07. |
| Cancelamento | Projeto cancelado é final para Gestor e Editor. Administrador pode retomar. Projeto suspenso pode ser retomado pela secretaria responsável. |
| Exclusão de usuário | Não existe exclusão. Usuário é **inativado**, preservando autoria e auditoria. |
| Exclusão de secretaria/cargo | Bloqueada quando há vínculos. Nesses casos, o recurso é inativado. |
| Campos institucionais | Imutáveis para todos, exceto Administrador, que corrige com justificativa e registro no histórico. |
| Datas | Exibição `dd/mm/aaaa`. Datas reais do projeto são calculadas pelas atividades. |
| Status | Sempre cor + texto + ícone. Nunca apenas cor e nunca emoji. |
| Tema | Claro e escuro, alternável no cabeçalho e na tela de login. A preferência fica no navegador; na primeira visita, segue o sistema. |
| Identidade visual | Cada prefeitura define cor primária e secundária. As cores são convertidas em tons com contraste AA para texto, menu e ações. |
| Densidade | Painéis arejados; listas densas e escaneáveis. |

---

## 2. Estrutura do aplicativo

### 2.1 Shell desktop (≥ 1280 px)

```
┌──────────────────┬──────────────────────────────────────────────────────────────┐
│  ÁGORA           │  Prefeitura de Guapimirim        Notificações (3)   Gabriel  │
│  Gestão municipal├──────────────────────────────────────────────────────────────┤
│                  │  Início / Projetos / PRJ-2026-0042                           │
│  Painel          │                                                              │
│  Projetos        │  ┌────────────────────────────────────────────────────────┐  │
│  Cronograma      │  │  Conteúdo da tela                                      │  │
│  Relatórios      │  │                                                        │  │
│  Lições          │  │                                                        │  │
│                  │  └────────────────────────────────────────────────────────┘  │
│  ADMINISTRAÇÃO   │                                                              │
│  Usuários        │                                                              │
│  Secretarias     │                                                              │
│  Cargos          │                                                              │
│  Auditoria       │                                                              │
│                  │                                                              │
│  Manual          │                                                              │
│  Meu perfil      │                                                              │
└──────────────────┴──────────────────────────────────────────────────────────────┘
```

- Sidebar fixa de 256 px, fundo escuro institucional, item ativo com barra e contraste.
- Cabeçalho de 64 px com breadcrumb, sino de notificações e menu do usuário.
- Área de conteúdo com largura máxima de 1400 px e respiro de 24 a 32 px.
- Bloco "Administração" só aparece para Administrador.
- Em telas de projeto, o menu lateral permanece; o breadcrumb muda.

### 2.2 Shell tablet (768–1279 px)

- Sidebar recolhida em ícones (72 px) com tooltip.
- Tabelas mantêm rolagem horizontal.
- Filtros podem ocupar uma linha extra.
- Detalhe do projeto em coluna única.

### 2.3 Shell mobile (< 768 px)

- Sidebar vira painel lateral acionado pelo menu.
- Cabeçalho compacto: menu, título, notificações e avatar.
- Formulários em coluna única.
- Tabelas viram cartões.
- Kanban com rolagem horizontal e encaixe por coluna.
- Ações principais fixas no rodapé quando fizer sentido.
- Alvos de toque mínimos de 44 px.

### 2.4 Menu por perfil

| Item | Admin | Gestor | Editor | Governo |
|---|---|---|---|---|
| Painel | Sim | Sim | Sim | Sim |
| Projetos | Sim | Sim | Sim | Sim |
| Cronograma | Sim | Sim | Sim | Sim |
| Relatórios | Sim | Sim | Sim | Sim |
| Lições aprendidas | Sim | Sim | Sim | Sim |
| Usuários | Sim | Não | Não | Não |
| Secretarias | Sim | Não | Não | Não |
| Cargos | Sim | Não | Não | Não |
| Auditoria | Sim | Não | Não | Não |
| Manual | Sim | Sim | Sim | Sim |
| Meu perfil | Sim | Sim | Sim | Sim |

### 2.5 Cabeçalho

- **Breadcrumb** contextual: `Início / Projetos / PRJ-2026-0042`.
- **Tema:** botão sol/lua no cabeçalho alterna claro e escuro; a escolha é preservada no navegador.
- **Notificações:** botão com contador de não lidas; abre painel lateral.
- **Menu do usuário:** nome, cargo, secretaria e perfil; ações "Meu perfil", "Trocar senha" e "Sair". A troca de prefeitura exige novo login.
- **Busca global:** atalho `Ctrl+K` (ou `⌘K`) abre a paleta para projetos e pessoas; resultados respeitam a visibilidade do perfil e a busca de pessoas é restrita ao Administrador.

---

## 3. Mapa de telas

| Rota | Tela | Perfis | Objetivo |
|---|---|---|---|
| `/login` | Login | Público | Identificar prefeitura, usuário e senha |
| `/painel` | Painel executivo | Todos | Leitura rápida da execução |
| `/projetos` | Lista e kanban | Todos | Encontrar, acompanhar e operar projetos |
| `/projetos/novo` | Cadastro de projeto | Admin, Gestor, Editor | Criar projeto |
| `/projetos/:id` | Detalhe do projeto | Visível | Executar e acompanhar o projeto |
| `/projetos/:id/editar` | Edição de projeto | Responsável, Admin | Atualizar dados, prazos e orçamento |
| `/cronograma` | Cronograma macro | Todos | Ler prazos de todos os projetos |
| `/relatorios` | Relatórios | Todos | Filtrar e exportar XLSX |
| `/licoes` | Banco de lições | Todos | Consultar aprendizados |
| `/administracao` | Administração | Admin | Usuários, secretarias, cargos, perfis, identidade visual e auditoria |
| `/manual` | Manual do sistema | Todos | Aprender a usar |
| `/perfil` | Meu perfil | Todos | Dados pessoais e senha |

---

## 4. Componentes e padrões visuais

### 4.1 Status

| Status | Rótulo | Cor | Ícone |
|---|---|---|---|
| `NAO_INICIADO` | Não iniciado | Neutro | Círculo vazio |
| `EM_ANDAMENTO` | Em andamento | Azul | Seta em movimento |
| `EM_ATRASO` | Em atraso | Âmbar | Relógio |
| `CONCLUIDO` | Concluído | Verde | Check |
| `CONCLUIDO_COM_ATRASO` | Concluído com atraso | Verde + âmbar | Check com relógio |
| `CANCELADO` | Cancelado | Cinza | X |
| `SUSPENSO` | Suspenso | Roxo acinzentado | Pausa |

### 4.2 Prioridade

| Prioridade | Rótulo | Tratamento |
|---|---|---|
| `CRITICA` | Crítica | Faixa vermelha + texto |
| `ALTA` | Alta | Faixa âmbar |
| `MEDIA` | Média | Faixa azul |
| `BAIXA` | Baixa | Faixa neutra |

### 4.3 Componentes recorrentes

| Componente | Uso |
|---|---|
| Cabeçalho de página | Título, descrição curta, ações primárias |
| Cartão de indicador | Número grande, rótulo, variação e link |
| Barra de progresso | Progresso de projeto e atividade |
| Selo de status | Status padronizado com ícone |
| Barra de filtros | Busca, selects, toggles e limpar filtros |
| Tabela de dados | Cabeçalho fixo, linhas clicáveis, ações no fim |
| Estado vazio | Ícone, título, explicação e ação |
| Skeleton | Carregamento de cartões, tabelas e gráficos |
| Diálogo | Criação e edição |
| Diálogo de confirmação | Ações destrutivas |
| Painel lateral | Notificações, auditoria e ajuda contextual |
| Toast | Confirmação de ações |
| Linha do tempo | Histórico do projeto |

### 4.4 Estados obrigatórios

Toda tela deve prever:

1. **Carregando:** skeleton com a mesma estrutura do conteúdo.
2. **Vazio:** explicação e próximo passo.
3. **Erro:** mensagem clara e botão "Tentar novamente".
4. **Sem permissão:** conteúdo bloqueado com explicação, não apenas erro 403.
5. **Somente leitura:** ações de escrita ocultas, com aviso quando o perfil for Governo.

---

## 5. Login

### 5.1 Layout

```
┌───────────────────────────────┬────────────────────────────────────────┐
│                               │                                        │
│  ÁGORA                        │   Entrar                               │
│  Gestão municipal             │   Acesse o painel da sua prefeitura.   │
│                               │                                        │
│  Projetos conectados,         │   Prefeitura    [ Guapimirim      v ]  │
│  prazos sob controle e        │   E-mail        [ ................ ]   │
│  decisões com evidência.      │   Senha         [ ................ ]   │
│                               │                                        │
│  ─────────────────────        │   [ Entrar ]                           │
│  Requisitos AGEVAP            │                                        │
│                               │                                        │
│                               │                                        │
└───────────────────────────────┴────────────────────────────────────────┘
```

O botão de tema claro/escuro fica fixo no canto superior direito, disponível antes do login.

### 5.2 Campos

| Campo | Componente | Regra |
|---|---|---|
| Prefeitura | Select com busca | Obrigatório; carregado de `/public/tenants` |
| E-mail | Input | Obrigatório; formato de e-mail |
| Senha | Input com mostrar/ocultar | Obrigatório |

### 5.3 Comportamento

- Erro genérico: "E-mail ou senha inválidos", sem revelar qual campo falhou.
- Bloqueio de 15 minutos após cinco tentativas inválidas consecutivas; a tentativa é auditada.
- Sessão de 16 horas; ao expirar, redireciona para o login com aviso.
- Após login, redireciona para o painel.
- Ao trocar a prefeitura, as cores da identidade visual do tenant são aplicadas na hora à tela de login.
- O tema escolhido é preservado no navegador e reaplicado nas próximas visitas.
- Bloco de credenciais demo só aparece quando `SEED=true`.

### 5.4 Estados

- Carregando prefeituras: select desabilitado com skeleton.
- Prefeitura inativa: não aparece na lista.
- Erro de rede: alerta com "Tentar novamente".

---

## 6. Painel executivo

### 6.1 Objetivo

Permitir que o prefeito entenda a situação da gestão em menos de um minuto e que a secretaria identifique o que precisa de ação hoje.

### 6.2 Layout desktop

```
Painel executivo                                      [Secretaria v] [Período v]
Acompanhe a execução dos projetos da prefeitura.

┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Projetos      │ │ Em atraso     │ │ Concluídos    │ │ Execução      │
│ ativos        │ │               │ │ no período    │ │ orçamentária  │
│ 42            │ │ 7             │ │ 18            │ │ 68%           │
│ +3 no mês     │ │ 2 críticos    │ │ 4 com atraso  │ │ R$ 4,2 mi     │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘

┌─────────────────────────────────┐ ┌───────────────────────────────────┐
│ Projetos por status             │ │ Projetos por secretaria           │
│         (rosca)                 │ │ (barras empilhadas)               │
│                                 │ │                                   │
└─────────────────────────────────┘ └───────────────────────────────────┘

┌─────────────────────────────────┐ ┌───────────────────────────────────┐
│ Orçamento previsto x executado  │ │ Aderência ao plano de governo     │
│ (barras por secretaria)         │ │ (indicador + lista)               │
└─────────────────────────────────┘ └───────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│ Projetos em atraso                                    Ver todos       │
│ Código | Projeto | Secretaria | Prazo | Progresso | Responsável        │
└───────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐ ┌──────────────────────────────────┐
│ Próximos vencimentos (7 dias)    │ │ Atividades recentes              │
│ Lista compacta                   │ │ Linha do tempo                   │
└──────────────────────────────────┘ └──────────────────────────────────┘
```

### 6.3 Filtros

| Filtro | Perfis | Opções | Efeito |
|---|---|---|---|
| Secretaria | Admin, Governo | Secretarias ativas | Filtra todos os blocos |
| Período | Todos | Este ano, últimos 90 dias, todos | Afeta concluídos e execução |
| Apenas meus | Gestor, Editor | Liga/desliga | Restringe à própria secretaria |

Para Gestor e Editor, o painel já é limitado aos projetos visíveis. O filtro de secretaria mostra apenas a própria.

### 6.4 Indicadores

| Indicador | Definição |
|---|---|
| Projetos ativos | Projetos não iniciados, em andamento ou em atraso |
| Em atraso | Projetos com status Em atraso |
| Concluídos no período | Concluído + Concluído com atraso com término real no período |
| Execução orçamentária | Soma do executado ÷ soma do previsto dos projetos visíveis |
| Progresso médio | Média do progresso dos projetos ativos |
| Atividades atrasadas | Atividades não concluídas com término previsto no passado |

### 6.5 Gráficos

1. **Projetos por status:** rosca com todos os status, legenda com contagem.
2. **Projetos por secretaria:** barras horizontais empilhadas por situação (em dia, em atraso, concluído).
3. **Orçamento:** barras agrupadas previsto versus executado por secretaria, com valores em reais.
4. **Aderência ao plano de governo:** percentual de projetos que atendem ao plano, com contagem.

### 6.6 Listas

- **Projetos em atraso:** até 5, com código, nome, secretaria, prazo e progresso; link "Ver todos" abre a lista filtrada por atraso.
- **Próximos vencimentos:** projetos com término previsto em até 7 dias; ordenados por data.
- **Atividades recentes:** últimas 8 ações registradas no escopo do usuário, com autor, ação e horário relativo.

### 6.7 Variações por perfil

| Perfil | Diferenças |
|---|---|
| Governo | Sem botão "Novo projeto"; sem atalhos administrativos; vê todos os dados; somente leitura |
| Administrador | Vê todos; atalho para auditoria e usuários; pode abrir qualquer projeto |
| Gestor | Vê projetos da secretaria e compartilhados; indicadores refletem esse escopo |
| Editor | Igual ao Gestor; pode criar e editar projetos da secretaria |

### 6.8 Estados

- Vazio: "Ainda não há projetos cadastrados" + botão "Criar primeiro projeto" (quem pode criar).
- Sem atrasos: cartão positivo "Nenhum projeto em atraso".
- Sem próximos vencimentos: "Nada vence nos próximos 7 dias".
- Erro: bloco isolado com "Tentar novamente" sem derrubar a página.

---

## 7. Projetos — lista

### 7.1 Layout

```
Projetos                                             [Novo projeto]
Acompanhe e opere os projetos da prefeitura.

[ Lista ] [ Kanban ] [ Cronograma ]

┌──────────────────────────────────────────────────────────────────────────┐
│ Buscar por nome ou código   [Status v] [Prioridade v] [Secretaria v]     │
│ [Em atraso] [Incluir cancelados]                          Limpar filtros │
└──────────────────────────────────────────────────────────────────────────┘

Ordenar: [Última atualização v]

Código        Projeto                   Secretaria      Status      Progresso
PRJ-2026-0042 Reforma da UBS Central    Obras           Em atraso   62%  ██████░░░
...
```

### 7.2 Filtros e ordenação

| Filtro | Tipo | Regra |
|---|---|---|
| Busca | Texto | Nome ou código, sem diferenciar maiúsculas |
| Status | Multi-select | Padrão: todos, exceto cancelado |
| Prioridade | Select | Crítica, Alta, Média, Baixa |
| Secretaria | Select | Responsável ou envolvida |
| Em atraso | Toggle | Somente status Em atraso |
| Incluir cancelados | Toggle | Desligado por padrão |
| Ordenação | Select | Atualização, nome, término previsto, início, prioridade, progresso |

### 7.3 Colunas

| Coluna | Conteúdo | Responsivo |
|---|---|---|
| Código | `PRJ-2026-0042` em fonte tabular | Mantém |
| Projeto | Nome + secretarias envolvidas | Mantém |
| Secretaria responsável | Nome curto + sigla | Oculta no mobile |
| Status | Selo | Mantém |
| Prioridade | Selo | Oculta no mobile |
| Progresso | Barra + percentual + `x/y atividades` | Mantém |
| Prazo | Real quando existir; senão previsto; destaque de atraso | Mantém |
| Orçamento | Executado ÷ previsto | Oculta no mobile |
| Ações | Menu contextual | Mantém |

### 7.4 Ações por linha

- **Abrir projeto** (sempre).
- **Editar** (secretaria responsável ou Admin).
- **Encaminhar** (responsável ou Admin).
- **Cancelar/Suspender** (responsável ou Admin).
- **Excluir** (Admin; confirmação com o nome do projeto).

### 7.5 Responsividade

- Em telas menores, cada projeto vira um cartão com nome, status, progresso, prazo e menu.
- Filtros viram um botão "Filtros" que abre painel lateral com contagem de filtros ativos.

### 7.6 Estados

- Carregando: 8 linhas skeleton.
- Vazio sem projetos: convite para criar.
- Vazio com filtros: "Nenhum projeto encontrado com esses filtros" + limpar filtros.
- Erro: alerta com repetir.

---

## 8. Projetos — kanban

### 8.1 Layout

```
Projetos                                              [Novo projeto]
[ Lista ] [ Kanban ] [ Cronograma ]

[Busca] [Prioridade v] [Secretaria v]        Limpar filtros

┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ Não iniciado  (5)   │ │ Em andamento  (8)   │ │ Concluído  (12)     │
├─────────────────────┤ ├─────────────────────┤ ├─────────────────────┤
│ PRJ-2026-0051       │ │ PRJ-2026-0042       │ │ PRJ-2026-0018       │
│ Reforma da creche   │ │ Reforma da UBS      │ │ Castração animal    │
│ Obras               │ │ Obras               │ │ Meio Ambiente       │
│ Alta                │ │ Crítica             │ │ Média               │
│ ████░░░░░░ 40%      │ │ ██████░░░░ 62%      │ │ ██████████ 100%     │
│ 30/11/2026          │ │ 15/10/2026  Atrasado│ │ 02/09/2026          │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### 8.2 Regras

- Três colunas fixas: Não iniciado, Em andamento, Concluído.
- Mapeamento dos status detalhados:
  - Não iniciado ← `NAO_INICIADO`.
  - Em andamento ← `EM_ANDAMENTO` e `EM_ATRASO`.
  - Concluído ← `CONCLUIDO` e `CONCLUIDO_COM_ATRASO`.
- Cancelados e suspensos não aparecem no quadro; ficam acessíveis na lista.
- Sem arrastar e soltar na POC, conforme decisão da seção 1.
- Cartão inteiro é clicável e abre o detalhe.
- Menu de ações no cartão aparece no hover e no foco por teclado, respeitando permissões.
- A ordenação dentro da coluna é por término previsto; atrasados primeiro.

### 8.3 Anatomia do cartão

1. Código do projeto.
2. Nome em até duas linhas.
3. Secretaria responsável.
4. Prioridade.
5. Barra de progresso + percentual.
6. Prazo real ou previsto.
7. Indicador de atraso.
8. Quantidade de secretarias envolvidas.

### 8.4 Estados

- Coluna vazia: "Nenhum projeto nesta etapa".
- Quadro vazio: convite para criar projeto.
- Muitos cartões: rolagem interna por coluna, com contagem no cabeçalho.

---

## 9. Cadastro de projeto

### 9.1 Estrutura

Página inteira em duas colunas:

- **Coluna principal (2/3):** seções do formulário.
- **Coluna lateral (1/3):** resumo vivo, orientações e ações.

```
Novo projeto
Preencha as informações de planejamento. Campos com cadeado não poderão ser
alterados depois de salvos.

┌───────────────────────────────────────────┐ ┌──────────────────────────────┐
│ 1. Identificação                          │ │ Resumo                       │
│ Nome do projeto *                         │ │ Status: Não iniciado         │
│ [______________________________________]  │ │ Progresso: 0%                │
│ Secretaria responsável *                  │ │ Responsável: —               │
│ [Selecione___________________________ v]  │ │ Início previsto: —           │
│ Secretarias envolvidas *                  │ │ Término previsto: —          │
│ [Selecione uma ou mais_______________ v]  │ │ Secretarias: —               │
│ Prioridade *                              │ │                              │
│ ( ) Baixa  ( ) Média  (•) Alta ( ) Crítica│ │ Orientações                  │
│                                           │ │ • Justificativa, objetivos,  │
│ 2. Planejamento                           │ │   requisitos e riscos ficam  │
│ Início previsto *   Término previsto *    │ │   imutáveis após o cadastro. │
│ [__/__/____]        [__/__/____]          │ │ • As datas reais vêm das     │
│ Justificativa *                    🔒     │ │   atividades.                │
│ [______________________________________]  │ │                              │
│ Objetivos *                        🔒     │ │ [Cancelar]  [Salvar projeto] │
│ [______________________________________]  │ │                              │
│ ...                                       │ │                              │
└───────────────────────────────────────────┘ └──────────────────────────────┘
```

### 9.2 Seções e campos

#### Seção 1 — Identificação

| Campo | Componente | Obrigatório | Regras |
|---|---|---|---|
| Nome do projeto | Input | Sim | 3 a 200 caracteres; único por prefeitura (aviso, não bloqueio) |
| Secretaria responsável | Select | Sim | Apenas secretarias ativas; para Gestor/Editor, fixa na própria |
| Secretarias envolvidas | Multi-select com busca | Sim | Ao menos a responsável; apenas ativas; sem duplicidades |
| Prioridade | ToggleGroup | Sim | Baixa, Média, Alta, Crítica; padrão Média |

#### Seção 2 — Planejamento

| Campo | Componente | Obrigatório | Regras |
|---|---|---|---|
| Início previsto | Date picker | Sim | Aceita datas passadas |
| Término previsto | Date picker | Sim | Não anterior ao início |
| Justificativa | Textarea | Sim | 20 a 2000 caracteres; imutável após salvar |
| Objetivos | Textarea | Sim | 20 a 2000 caracteres; imutável após salvar |

#### Seção 3 — Requisitos e riscos

| Campo | Componente | Obrigatório | Regras |
|---|---|---|---|
| Requisitos do projeto | Textarea | Sim | 20 a 2000 caracteres; imutável após salvar |
| Avaliação de risco | Textarea | Sim | 20 a 2000 caracteres; imutável após salvar |

Texto de apoio: "Descreva o que é necessário para executar o projeto e os riscos identificados neste momento. Esses campos não poderão ser alterados depois."

#### Seção 4 — Plano de governo

| Campo | Componente | Obrigatório | Regras |
|---|---|---|---|
| Atende proposta do plano de governo? | Switch | Sim | Padrão desligado |
| Qual proposta? | Textarea | Se ligado | 20 a 1000 caracteres; imutável após salvar |

#### Seção 5 — Orçamento

| Campo | Componente | Obrigatório | Regras |
|---|---|---|---|
| Orçamento previsto | Campo monetário BRL | Não | ≥ 0; padrão R$ 0,00 |
| Orçamento executado | Campo monetário BRL | Não | ≥ 0; pode superar o previsto |

#### Seção 6 — Documentação

- Anexos são adicionados após o projeto existir, na aba "Anexos".
- Texto: "Salve o projeto para anexar documentos que legitimem a execução."

### 9.3 Regras de interface

- Campos imutáveis exibem cadeado e tooltip "Não editável após o cadastro".
- No modo de edição, esses campos ficam desabilitados para todos, exceto Administrador.
- Quando o Administrador edita um campo imutável, aparece alerta: "Esta é uma correção administrativa. A alteração será registrada no histórico."
- Alterar qualquer data prevista ao salvar abre o diálogo de justificativa, mostrando antes e depois.
- Secretarias envolvidas precisam incluir a responsável; ao remover a responsável, o sistema impede e explica.
- Ao trocar a secretaria responsável, orientar o uso de "Encaminhar" para manter o protocolo. O cadastro aceita troca apenas por Administrador.
- Botão "Salvar" fica desabilitado durante o envio e exibe spinner.
- Saída com alterações não salvas pede confirmação.

### 9.4 Diálogo de justificativa de prazo

```
┌────────────────────────────────────────────────────────────┐
│ Justificar alteração de prazo                              │
│                                                            │
│ Início previsto:  10/03/2026 → 18/03/2026                  │
│ Término previsto: 30/06/2026 → 15/07/2026                  │
│                                                            │
│ Justificativa *                                            │
│ [______________________________________________________]   │
│ [______________________________________________________]   │
│ Mínimo de 10 caracteres. Ficará registrada no histórico.   │
│                                                            │
│                              [Cancelar]  [Confirmar]       │
└────────────────────────────────────────────────────────────┘
```

### 9.5 Mensagens de erro

| Situação | Mensagem |
|---|---|
| Nome vazio | "Informe o nome do projeto." |
| Sem responsável | "Selecione a secretaria responsável." |
| Sem envolvidas | "Selecione ao menos uma secretaria envolvida." |
| Datas invertidas | "O término previsto não pode ser anterior ao início." |
| Texto curto | "Descreva com pelo menos 20 caracteres." |
| Plano de governo sem detalhe | "Informe qual proposta do plano de governo é atendida." |
| Data alterada sem justificativa | "Justifique a alteração de prazo para continuar." |
| Sem permissão | "Apenas a secretaria responsável pode editar este projeto." |

---

## 10. Edição de projeto

- Mesma estrutura do cadastro.
- Campos imutáveis desabilitados com cadeado (Admin vê botão "Corrigir" com confirmação).
- Cabeçalho exibe status atual, progresso e últimas datas reais.
- Bloco "Zona de risco" no fim da coluna lateral:
  - Suspender projeto (responsável/Admin).
  - Cancelar projeto (responsável/Admin).
  - Excluir projeto (Admin).
- Alteração de responsável não fica no formulário comum; é feita por "Encaminhar".
- Ações de risco pedem confirmação e motivo.

---

## 11. Detalhe do projeto

### 11.1 Cabeçalho

```
Início / Projetos / PRJ-2026-0042

Reforma da UBS Central                          [Em atraso] [Prioridade crítica]
Obras · Secretaria de Obras e Serviços
██████████████░░░░░░  62%  ·  8 de 13 atividades concluídas

[Editar] [Encaminhar] [Mais ações v]
```

Ações:

- **Editar:** responsável ou Admin.
- **Encaminhar:** responsável ou Admin.
- **Mais ações:** suspender, cancelar, excluir, copiar código, abrir relatório.
- Governo não vê ações de escrita.
- Secretaria envolvida não responsável vê somente "Copiar código".

### 11.2 Abas

1. Visão geral
2. Atividades
3. Aprovações
4. Financeiro
5. Documentos
6. Planejamento
7. Partes interessadas
8. Riscos e 5W2H
9. SWOT
10. Lições aprendidas
11. Anexos
12. Histórico

### 11.3 Visão geral

```
┌─────────────────────────────────────────────┐ ┌──────────────────────────┐
│ Sobre o projeto                             │ │ Prazos                   │
│ Justificativa                               │ │ Previsto  10/03–30/06    │
│ ...                                         │ │ Real      18/03–—        │
│                                             │ │ Situação: Em atraso      │
│ Objetivos                                   │ ├──────────────────────────┤
│ ...                                         │ │ Orçamento                │
│                                             │ │ Previsto   R$ 850.000    │
│ Requisitos                                  │ │ Executado  R$ 520.000    │
│ ...                                         │ │ ███████░░░ 61%           │
│                                             │ ├──────────────────────────┤
│ Avaliação de risco                          │ │ Secretarias              │
│ ...                                         │ │ Obras (responsável)      │
│                                             │ │ Saúde                    │
│ Plano de governo                            │ │ Educação                 │
│ Atende: Sim                                 │ ├──────────────────────────┤
│ Proposta: ...                               │ │ Governança               │
│                                             │ │ Criado por Ana em ...    │
└─────────────────────────────────────────────┘ └──────────────────────────┘
```

- Textos longos com "Ler mais".
- Orçamento com barra e alerta quando executado > previsto.
- Secretaria responsável destacada.
- Datas reais ausentes exibem "—" e explicação em tooltip.
- Aderência ao plano de governo com selo.

### 11.4 Ações rápidas

- Adicionar atividade.
- Adicionar risco.
- Anexar documento.
- Encaminhar projeto.

### 11.5 Aprovações

- Etapas técnica, orçamentária e jurídica, na ordem do fluxo.
- Cada etapa mostra status (`PENDENTE`, `APROVADO`, `REJEITADO`), responsável, parecer e data.
- "Decidir" abre diálogo com aprovar/rejeitar, parecer e assinatura interna.
- A assinatura é um registro interno e não substitui certificação ICP-Brasil.
- Exige `approvals.view` para consultar e `approvals.decide` para decidir.

### 11.6 Financeiro

- Indicadores de previsto, empenhado e pago.
- Dotações orçamentárias com código, descrição, fonte e valor previsto.
- Empenhos com fornecedor, valor, status e pagamentos vinculados.
- Contratos com fornecedor, número, objeto, vigência, valor e status.
- Exige `finance.view`; escrita exige `finance.edit`.

### 11.7 Documentos

- Checklist documental com item, categoria, obrigatoriedade e status.
- Status: `PENDENTE`, `RECEBIDO`, `DISPENSADO` e `VENCIDO`.
- Anexos aceitam categoria, descrição, versão e validade.
- Exige `documents.edit` para alterar.

### 11.8 Planejamento

- Dependências entre atividades (predecessora e sucessora).
- Marcos com data prevista, status e responsável.
- Indicadores com unidade, meta, valor atual e observações.
- Exige `planning.edit` para alterar.

### 11.9 Partes interessadas

- Cadastro com tipo, organização, contato, influência, interesse e estratégia.
- Influência e interesse usados para priorizar engajamento.
- Exige `stakeholders.edit` para alterar.

---

## 12. Atividades

### 12.1 Layout

```
Atividades                                      [Nova atividade]
13 atividades · 8 concluídas · 2 em atraso
██████████████░░░░░░ 62%

┌────┬──────────────────────┬────────────┬──────────┬──────────┬────────┬──────┐
│ #  │ Atividade            │ Status     │ Previsto │ Real     │ Resp.  │ Ações│
├────┼──────────────────────┼────────────┼──────────┼──────────┼────────┼──────┤
│ 1  │ Levantamento técnico │ Concluída  │ 10–20/03 │ 12–19/03 │ Obras  │ ...  │
│ 2  │ Projeto arquitetônico│ Em atraso  │ 21/03–15/05 │ 25/03–— │ Obras │ ...  │
└────┴──────────────────────┴────────────┴──────────┴──────────┴────────┴──────┘
```

Cada atividade tem um botão de clipe para abrir o diálogo de anexos, disponível para leitura e edição conforme a permissão no projeto.

### 12.2 Campos do formulário

| Campo | Obrigatório | Regras |
|---|---|---|
| Título | Sim | 3 a 200 caracteres |
| Descrição | Não | Até 2000 caracteres |
| Início previsto | Sim | Data |
| Término previsto | Sim | Não anterior ao início |
| Ordem | Não | Número; padrão fim da lista |

Datas reais não são digitadas no cadastro. São registradas pelas ações "Iniciar" e "Concluir". Na edição, Administrador pode corrigir datas reais com registro no histórico.

### 12.3 Ações rápidas

| Ação | Efeito | Regras |
|---|---|---|
| Iniciar | Define início real como hoje | Atividade não iniciada; responsável/Admin |
| Concluir | Define término real como hoje | Atividade em andamento ou atrasada |
| Reabrir | Remove término real | Administrador; gera histórico |
| Editar | Abre diálogo | Responsável/Admin |
| Excluir | Confirma e remove | Responsável/Admin |

### 12.4 Impactos automáticos

- Iniciar a primeira atividade define o início real do projeto.
- Concluir todas as atividades define o término real e o status do projeto.
- Concluir após o prazo marca a atividade e o projeto como atrasados.
- O progresso é recalculado a cada alteração.

### 12.5 Alteração de prazo

Ao salvar uma atividade com datas previstas alteradas, abre o mesmo diálogo de justificativa do projeto. A justificativa é registrada no histórico geral.

### 12.6 Estados

- Sem atividades: "Nenhuma atividade cadastrada" + "Adicionar primeira atividade".
- Todas concluídas: faixa verde "Projeto concluído".
- Atividades atrasadas: destaque no cabeçalho e na linha.

---

## 13. Cronograma (Gantt)

### 13.1 Visão por projeto

- Aba "Cronograma" do detalhe.
- Cabeçalho com escala: mês/semana.
- Linha do tempo horizontal com mês e ano.
- Linha vertical do dia atual.
- Cada atividade tem barra prevista e marcação real quando existir.
- Barra atrasada em âmbar; concluída em verde; futura em azul.
- Tooltip: título, previsto, real, status e progresso.
- Clique na barra abre a edição (se permitido).
- Sem datas: atividade aparece em uma faixa "Sem prazo definido".
- Responsivo: rolagem horizontal com primeira coluna fixa.

### 13.2 Visão macro

- Rota `/cronograma`.
- Lista de projetos com barra de início a término previsto.
- Filtro por secretaria.
- Agrupamento por secretaria (opcional).
- Indicador de atraso e progresso.
- Clique abre o projeto.
- Botão "Baixar imagem" exporta o cronograma em PNG, respeitando o filtro atual.

---

## 14. Riscos e 5W2H

### 14.1 Layout

```
Riscos                                        [Novo risco]

┌──────────────────────────────┬──────┬───┬───┬───┬─────┬────────┬──────────┐
│ Risco                        │ Cat. │ G │ U │ T │ GUT │ Nível  │ Ações    │
├──────────────────────────────┼──────┼───┼───┼───┼─────┼────────┼──────────┤
│ Atraso na licitação          │ Prazo│ 5 │ 4 │ 4 │ 80  │ Alto   │ ...      │
│ Falta de mão de obra         │ Equipe│4 │ 3 │ 3 │ 36  │ Médio  │ ...      │
└──────────────────────────────┴──────┴───┴───┴───┴─────┴────────┴──────────┘

Planos de ação 5W2H                           [Nova ação]
┌──────────────────────────────┬──────────────┬──────────┬──────────┬────────┐
│ O quê                        │ Quem         │ Quando   │ Custo    │ Status │
├──────────────────────────────┼──────────────┼──────────┼──────────┼────────┤
│ Antecipar edital             │ Ana / Obras  │ 30/04    │ R$ 0     │ Em exec│
└──────────────────────────────┴──────────────┴──────────┴──────────┴────────┘
```

### 14.2 Formulário de risco

| Campo | Obrigatório | Regras |
|---|---|---|
| Descrição | Sim | 10 a 1000 caracteres |
| Categoria | Não | Prazo, Orçamento, Equipe, Fornecedor, Técnico, Jurídico, Outro |
| Gravidade | Sim | 1 a 5 |
| Urgência | Sim | 1 a 5 |
| Tendência | Sim | 1 a 5 |
| Resposta planejada | Não | Até 2000 caracteres |
| Responsável | Não | Texto livre |
| Status | Sim | Aberto, Mitigado, Encerrado |

O formulário mostra o cálculo em tempo real:

```
GUT = 5 × 4 × 4 = 80  →  Nível Alto
```

Escala visual de cada dimensão com descrição:

- Gravidade: 1 leve, 3 moderada, 5 grave.
- Urgência: 1 pode esperar, 3 médio prazo, 5 imediata.
- Tendência: 1 melhora, 3 estável, 5 piora.

Riscos são ordenados por GUT decrescente. A lista destaca riscos críticos no topo do projeto.

### 14.3 Formulário 5W2H

| Campo | Rótulo | Obrigatório |
|---|---|---|
| What | O que será feito | Sim |
| Why | Por que | Sim |
| Where | Onde | Não |
| When | Quando | Não |
| Who | Quem | Não |
| How | Como | Sim |
| How much | Quanto custa | Não |
| Risk | Risco vinculado | Não |
| Status | Status da ação | Sim |

### 14.4 Estados

- Sem riscos: "Nenhum risco registrado" + ação.
- Sem planos: "Nenhum plano de ação" + ação.
- Risco crítico: alerta visual no topo da aba e no detalhe do projeto.

---

## 15. SWOT

### 15.1 Layout

```
SWOT                                           [Adicionar item]

┌──────────────────────────────┬──────────────────────────────┐
│ Forças                       │ Fraquezas                    │
│ + Equipe técnica experiente  │ - Orçamento limitado         │
│ + Apoio da comunidade        │ - Prazo curto                │
│ [Adicionar]                  │ [Adicionar]                  │
├──────────────────────────────┼──────────────────────────────┤
│ Oportunidades                │ Ameaças                      │
│ + Convênio estadual          │ - Período eleitoral          │
│ [Adicionar]                  │ [Adicionar]                  │
└──────────────────────────────┴──────────────────────────────┘
```

### 15.2 Regras

- Quatro quadrantes fixos.
- Inclusão inline: escrever e pressionar Enter ou clicar em "Adicionar".
- Item pode ser removido por quem edita o projeto.
- Contador por quadrante.
- Itens até 500 caracteres.
- Sem edição inline na POC; remover e adicionar novamente.
- Cores semânticas suaves: forças verde, fraquezas âmbar, oportunidades azul, ameaças vermelho.
- Acessibilidade: cada quadrante tem título e descrição, não depende de cor.

### 15.3 Estados

- Quadrante vazio: "Nenhum item".
- SWOT vazio: orientação sobre como usar a ferramenta.

---

## 16. Lições aprendidas

### 16.1 Aba do projeto

- Lista de cartões com título, categoria, autor e data.
- Botão "Nova lição".
- Diálogo: título, descrição, categoria.
- Exclusão pelo autor, responsável ou Admin.

### 16.2 Página consolidada (`/licoes`)

```
Lições aprendidas
Aprendizados registrados pelos projetos da prefeitura.

[Buscar] [Projeto v] [Secretaria v] [Categoria v]

┌──────────────────────────────────────────────────────────────┐
│ Planejamento antecipado da licitação                         │
│ Obras · Licitação · Ana Souza · 12/08/2026                   │
│ Descrição curta...                          Ver projeto →    │
└──────────────────────────────────────────────────────────────┘
```

- Filtros por projeto, secretaria, categoria e texto.
- Cartões com link para o projeto.
- Estado vazio com orientação.
- Escopo de visibilidade do usuário respeitado.

Categorias sugeridas: Planejamento, Licitação, Execução, Comunicação, Equipe, Orçamento, Fornecedores, Outro.

---

## 17. Anexos

### 17.1 Layout

- Área de arrastar e soltar no topo da aba.
- Texto: "Arraste arquivos ou clique para enviar. PDF, imagens, planilhas e documentos, até 10 MB."
- Tabela: ícone do tipo, nome, tamanho, autor, data, ações.
- Download e exclusão.

### 17.2 Regras

- Upload múltiplo permitido.
- Barra de progresso por arquivo.
- Erro por arquivo inválido sem cancelar os demais.
- Nome original preservado; armazenamento interno com nome aleatório.
- Exclusão apenas responsável/Admin.
- Todo upload e remoção registrado no histórico.

### 17.3 Estados

- Vazio: "Nenhum documento anexado".
- Enviando: item com progresso.
- Erro: mensagem específica ("Arquivo acima de 10 MB").

---

## 18. Encaminhamento de projeto

### 18.1 Diálogo

```
┌──────────────────────────────────────────────────────────────┐
│ Encaminhar projeto                                           │
│ O projeto sairá da responsabilidade de Obras e será         │
│ encaminhado para outra secretaria envolvida.                 │
│                                                              │
│ Secretaria de destino *                                      │
│ [Selecione_______________________________________________ v] │
│                                                              │
│ Justificativa *                                              │
│ [_________________________________________________________]  │
│ [_________________________________________________________]  │
│                                                              │
│ Você continuará visualizando o projeto. A secretaria de     │
│ destino poderá editá-lo e receberá uma notificação.          │
│                                                              │
│                                  [Cancelar]  [Encaminhar]    │
└──────────────────────────────────────────────────────────────┘
```

### 18.2 Regras

- Destino: apenas secretarias envolvidas, exceto a atual.
- Justificativa mínima de 10 caracteres.
- A secretaria atual perde a edição imediatamente após confirmar.
- Registro imutável com origem, destino, autor, data e justificativa.
- Notificação para todos os usuários ativos da secretaria de destino.
- Evento no histórico do projeto.
- Confirmação final antes de enviar.

### 18.3 Estados de erro

| Situação | Mensagem |
|---|---|
| Sem destino | "Selecione a secretaria de destino." |
| Destino igual | "O projeto já está com essa secretaria." |
| Destino não envolvido | "Encaminhe apenas para secretarias envolvidas no projeto." |
| Sem justificativa | "Informe a justificativa do encaminhamento." |

---

## 19. Cancelamento, suspensão e exclusão

### 19.1 Suspender

- Diálogo com motivo opcional.
- Status vira Suspenso; projeto sai do kanban.
- Responsável ou Admin.
- Pode ser retomado; status recalculado.

### 19.2 Cancelar

- Diálogo com aviso de irreversibilidade para Gestor/Editor.
- Motivo obrigatório.
- Status vira Cancelado; projeto sai do kanban.
- Apenas Admin retoma.

### 19.3 Excluir

- Apenas Admin.
- Diálogo de confirmação com código e nome do projeto.
- Exclusão lógica; some das listas, painel e relatórios.
- Registro na auditoria.

---

## 20. Histórico do projeto

### 20.1 Layout

```
Histórico

Hoje
  16:42  Ana Souza alterou o prazo de término do projeto
         30/06/2026 → 15/07/2026
         Justificativa: "Atraso na entrega do projeto executivo."
  14:10  Carlos Lima encaminhou o projeto de Obras para Saúde
         Justificativa: "Etapa de vistoria sanitária."

Ontem
  09:20  Ana Souza concluiu a atividade "Projeto arquitetônico"
```

### 20.2 Conteúdo

- Ações do projeto.
- Alterações de prazo com valores antigos e novos + justificativa.
- Encaminhamentos com origem e destino.
- Atividades criadas, editadas e concluídas.
- Anexos enviados e removidos.
- Agrupamento por dia, ordem decrescente.
- Ícone por tipo de ação.
- Filtro por tipo de evento.

### 20.3 Regras

- Somente leitura.
- Visível para todos que veem o projeto.
- Carregamento incremental por "Carregar mais", com total de eventos informado pela API.

---

## 21. Relatórios

### 21.1 Layout

```
Relatórios
Exporte os dados com os filtros aplicados.

┌──────────────────────────────────────────────────────────────┐
│ Período      [Este ano v]                                    │
│ Secretaria   [Todas v]       Status      [Todos v]           │
│ Prioridade   [Todas v]       Atrasados   [ ]                 │
│                                                              │
│ Resumo: 42 projetos · 128 atividades · 11 riscos             │
│                                                              │
│ [Exportar XLSX]                                              │
└──────────────────────────────────────────────────────────────┘

Prévia
┌──────────────────────────────────────────────────────────────┐
│ Código | Projeto | Secretaria | Status | Progresso | Prazo   │
└──────────────────────────────────────────────────────────────┘
```

### 21.2 Regras

- Filtros iguais aos da lista de projetos.
- Prévia paginada dos projetos filtrados.
- Exportação respeita visibilidade e filtros.
- Arquivo com quatro abas: Projetos, Atividades, Riscos, Lições.
- Nome do arquivo: `agora-relatorio-AAAA-MM-DD.xlsx`.
- Botão com estado de carregamento e toast de sucesso.
- Governo pode exportar o escopo total.
- Secretaria exporta apenas projetos visíveis.

### 21.3 Estados

- Sem dados: desabilitar exportação e orientar ajuste de filtros.
- Erro: toast com "Não foi possível gerar o relatório. Tente novamente."

---

## 22. Notificações

### 22.1 Painel lateral

```
┌──────────────────────────────────────────────┐
│ Notificações                 Marcar todas    │
│ [ Todas ] [ Não lidas (3) ]                  │
├──────────────────────────────────────────────┤
│ • Projeto recebido                   16:42   │
│   Reforma da UBS Central foi encaminhado     │
│   para sua secretaria.                       │
├──────────────────────────────────────────────┤
│ • Prazo de projeto alterado          14:10   │
│   O término de Reforma da Creche mudou.      │
├──────────────────────────────────────────────┤
│ • Atividade em atraso                08:00   │
│   "Projeto arquitetônico" venceu ontem.      │
└──────────────────────────────────────────────┘
```

### 22.2 Regras

- Sino mostra contador de não lidas.
- Clique marca como lida e navega para o link.
- "Marcar todas" atualiza o contador.
- Notificações antigas permanecem; sem expiração na POC.
- Escopo por usuário; nunca vaza entre tenants.
- Atualização a cada 60 segundos e ao focar a janela (evolução).
- Tipos: Projeto, Prazo, Status, Transferência, Atraso, Sistema.

### 22.3 Estados

- Vazio: "Você está em dia".
- Erro: mensagem discreta com "Tentar novamente".

---

## 23. Administração — Secretarias

### 23.1 Lista

```
Secretarias                                        [Nova secretaria]

┌────────────────────────────┬───────┬─────────┬─────────┬──────────┬───────┐
│ Nome                       │ Sigla │ Usuários│ Projetos│ Situação │ Ações │
├────────────────────────────┼───────┼─────────┼─────────┼──────────┼───────┤
│ Secretaria de Obras        │ OBR   │ 12      │ 18      │ Ativa    │ ...   │
│ Secretaria de Saúde        │ SAU   │ 8       │ 9       │ Ativa    │ ...   │
└────────────────────────────┴───────┴─────────┴─────────┴──────────┴───────┘
```

### 23.2 Formulário

| Campo | Obrigatório | Regras |
|---|---|---|
| Nome | Sim | 3 a 160 caracteres |
| Sigla | Sim | 2 a 8 caracteres; única no tenant |
| Cor | Não | Paleta de 8 cores institucionais |
| Ativa | Sim | Padrão ativa |

### 23.3 Regras

- Sigla única por prefeitura.
- Não é possível excluir secretaria com usuários ou projetos vinculados; oferecer inativação.
- Secretaria inativa não aparece em novos cadastros, mas projetos antigos continuam exibindo o nome.
- Trocar o nome atualiza a exibição em todos os projetos.
- Excluir ou inativar gera auditoria.

### 23.4 Edição inline

- Cor e sigla podem ser ajustadas rapidamente na lista.
- Demais alterações no diálogo.

---

## 24. Administração — Usuários

### 24.1 Lista

```
Usuários                                            [Novo usuário]

[Buscar] [Secretaria v] [Perfil v] [Situação v]

┌──────────────────┬───────────────────────┬──────────┬──────────┬────────┬────────┐
│ Nome             │ E-mail                │ Cargo    │ Secretaria│ Perfil │ Ações  │
├──────────────────┼───────────────────────┼──────────┼──────────┼────────┼────────┤
│ Ana Souza        │ ana@guapimirim.gov.br │ Diretora │ Obras    │ Gestor │ ...    │
│ Gabriel Alves    │ gabriel@guapimirim... │ Estagiário│ Obras   │ Editor │ ...    │
└──────────────────┴───────────────────────┴──────────┴──────────┴────────┴────────┘
```

Coluna "Último acesso" disponível em detalhe ou ordenação.

### 24.2 Formulário

**Dados pessoais**

| Campo | Obrigatório | Regras |
|---|---|---|
| Nome completo | Sim | 3 a 160 caracteres |
| E-mail | Sim | Formato válido; único no tenant |
| Cargo | Sim | Catálogo de cargos ativos; criação rápida |
| Secretaria | Sim | Secretarias ativas |
| Perfil de acesso | Sim | Administrador, Gestor, Editor, Governo |
| Ativo | Sim | Padrão ativo |

**Acesso**

| Campo | Obrigatório | Regras |
|---|---|---|
| Senha inicial | Sim no cadastro | Mínimo 6 caracteres; mostrar/ocultar |
| Confirmar senha | Sim no cadastro | Deve coincidir |
| Nova senha | Não na edição | Se preenchida, redefine |

### 24.3 Regras

- Apenas Administrador gerencia usuários.
- Administrador não pode inativar a si próprio.
- Administrador não pode remover o próprio perfil de Administrador.
- O tenant precisa ter ao menos um Administrador ativo.
- Criar outro Administrador exige confirmação adicional.
- Inativar impede login imediatamente.
- Usuário inativo permanece no histórico e em autores.
- E-mail é único dentro do tenant.
- Após criar, exibir credenciais iniciais uma vez, com opção de copiar.
- Não há envio de e-mail na POC; o Administrador entrega a senha inicial.
- Toda alteração é auditada.

### 24.4 Ações

- Editar.
- Redefinir senha.
- Inativar/Reativar.
- Ver atividades no histórico (evolução).

### 24.5 Estados

- Sem usuários: "Nenhum usuário cadastrado" + criar.
- Filtro sem resultado: limpar filtros.
- Erro de e-mail duplicado: "Este e-mail já está em uso nesta prefeitura."

---

## 25. Administração — Cargos

### 25.1 Conceito

Cargo é a função organizacional e **não concede permissão**. Quem define acesso é o perfil. Isso evita confundir "Secretário" (cargo) com "Administrador" (perfil).

### 25.2 Lista

```
Cargos                                              [Novo cargo]

┌──────────────────────┬───────────────────────────────┬─────────┬────────┐
│ Nome                 │ Descrição                     │ Usuários│ Ações  │
├──────────────────────┼───────────────────────────────┼─────────┼────────┤
│ Secretário(a)        │ Titular da secretaria          │ 5       │ ...    │
│ Diretor(a)           │ Direção de departamento        │ 12      │ ...    │
│ Fiscal               │ Fiscalização de contratos      │ 8       │ ...    │
│ Estagiário(a)        │ Apoio técnico                  │ 20      │ ...    │
└──────────────────────┴───────────────────────────────┴─────────┴────────┘
```

### 25.3 Formulário

| Campo | Obrigatório | Regras |
|---|---|---|
| Nome | Sim | 2 a 80 caracteres; único no tenant |
| Descrição | Não | Até 200 caracteres |

### 25.4 Regras

- Catálogo inicial: Secretário(a), Diretor(a), Coordenador(a), Assessor(a), Fiscal, Técnico(a), Estagiário(a), Outro.
- Cargo com usuários vinculados não pode ser excluído; pode ser inativado.
- Cargo inativo não aparece em novos usuários.
- Alterar o nome reflete em todos os usuários.
- Ordenação alfabética.
- Ações auditadas.

### 25.5 Estados

- Vazio: "Nenhum cargo cadastrado" + criar.
- Exclusão bloqueada: "Este cargo possui usuários vinculados. Inative-o em vez de excluir."

---

## 26. Administração — Perfis e permissões

Aba **Perfis** da Administração, somente leitura. Explica a matriz e os quatro perfis fixos da POC:

| Recurso | Administrador | Gestor | Editor | Governo |
|---|---|---|---|---|
| Ver todos os projetos | Sim | Não | Não | Sim |
| Ver projetos da secretaria e compartilhados | Sim | Sim | Sim | Sim |
| Criar projeto | Sim | Sim | Sim | Não |
| Editar projeto da secretaria | Sim | Sim | Sim | Não |
| Editar projeto de outra secretaria | Sim | Não | Não | Não |
| Encaminhar | Sim | Sim | Sim | Não |
| Excluir projeto | Sim | Não | Não | Não |
| Gerenciar usuários | Sim | Não | Não | Não |
| Gerenciar secretarias | Sim | Não | Não | Não |
| Gerenciar cargos | Sim | Não | Não | Não |
| Gerenciar identidade visual | Sim | Não | Não | Não |
| Exportar relatórios | Sim | Sim | Sim | Sim |
| Consultar auditoria | Sim | Não | Não | Não |

Cada perfil tem um cartão com descrição e link para o manual. Não é possível criar perfis personalizados na POC.

---

## 27. Administração — Identidade visual

### 27.1 Layout

Aba **Identidade** da Administração, disponível apenas para Administrador.

```
Identidade visual
As cores valem para toda a prefeitura: menu, botões, destaques e gráficos.

Cor primária     [■] [#123B33]
Cor secundária   [■] [#C8A34A]

[Salvar identidade] [Restaurar]

Prévia
┌─────────────────────────────────────┐
│ ■ Guapimirim                        │
│ [Ação principal] [Ação secundária]  │
│ (Destaque) ███████████░░░░░░        │
└─────────────────────────────────────┘
```

### 27.2 Comportamento

- Seletor nativo de cor e campo hexadecimal `#RRGGBB` para cada cor.
- A prévia do menu, das ações e dos destaques é atualizada em tempo real enquanto o usuário edita.
- **Salvar identidade** persiste as cores, registra `IDENTIDADE_ATUALIZADA` na auditoria e replica a mudança aos demais usuários conectados.
- **Restaurar** descarta a prévia e volta às cores salvas.
- Ao sair da aba sem salvar, a prévia é descartada e o tema volta às cores persistidas.
- As cores são convertidas em tons com contraste mínimo AA para texto, ícones e ações; a cor bruta é preservada como referência da marca.

### 27.3 Estados

- Carregando: campos desabilitados.
- Hexadecimal inválido: mensagem "Use o formato hexadecimal #RRGGBB." e salvamento bloqueado.
- Erro ao salvar: alerta com "Tentar novamente"; a prévia permanece.
- Sucesso: toast "Identidade visual atualizada."

### 27.4 Regras

- Apenas Administrador altera as cores.
- Cada prefeitura mantém a própria identidade; não há compartilhamento entre tenants.
- A alteração é auditada e propagada em tempo real.

---

## 28. Administração — Auditoria

### 28.1 Lista

```
Auditoria
Registro de acessos e ações do sistema.

[Buscar] [Ação v] [Entidade v] [Usuário v] [Período]

┌──────────────────┬──────────────────┬──────────────────────┬───────────────┐
│ Data/hora        │ Usuário          │ Ação                 │ Entidade      │
├──────────────────┼──────────────────┼──────────────────────┼───────────────┤
│ 19/10 16:42      │ Ana Souza        │ PRAZO_ALTERADO       │ Projeto #42   │
│ 19/10 15:10      │ Carlos Lima      │ PROJETO_ENCAMINHADO  │ Projeto #42   │
└──────────────────┴──────────────────┴──────────────────────┴───────────────┘
```

### 28.2 Filtros

- Texto livre em usuário e detalhes.
- Ação.
- Entidade.
- Usuário.
- Período.
- Paginação de 50.

### 28.3 Detalhe

Painel lateral com data, usuário, ação, entidade, IP e detalhes completos.

### 28.4 Regras

- Somente Administrador.
- Logs imutáveis: sem edição e sem exclusão.
- Retenção indefinida na POC.
- Exportação CSV dos registros filtrados, com proteção contra fórmulas em planilhas.

---

## 29. Manual do sistema

### 29.1 Estrutura

Menu lateral interno com:

1. Primeiros passos.
2. Perfis e permissões.
3. Cadastro de projeto.
4. Atividades e progresso.
5. Prazos e justificativas.
6. Encaminhamento entre secretarias.
7. Riscos e GUT.
8. Planos 5W2H.
9. SWOT.
10. Lições aprendidas.
11. Anexos.
12. Relatórios.
13. Perguntas frequentes.

### 29.2 Comportamento

- Conteúdo em português, com exemplos reais do sistema.
- Links contextuais "Saiba mais" em telas sensíveis.
- Busca interna por título, texto, perfil e regra, com contagem de resultados e estado vazio.
- Versão do manual exibida no rodapé.
- Acessível a todos os perfis.

---

## 30. Meu perfil

- Nome, e-mail, cargo, secretaria, perfil e último acesso (somente leitura, exceto nome).
- Nome editável pelo próprio usuário em diálogo, com auditoria `PERFIL_ATUALIZADO`.
- Troca de senha: senha atual, nova senha e confirmação.
- Sessão: botão "Sair".
- Aviso de segurança e dicas de senha.
- Notificações externas: telefone, e-mail e WhatsApp, com aviso quando SMTP ou webhook não estão configurados.

### 30.1 Portal público

- Rota `/transparencia/{slug}` fora da autenticação.
- Lista projetos públicos com busca, filtros de situação e secretaria, indicadores e detalhe.
- Detalhe `/transparencia/{slug}/projetos/{id}` mostra objetivo, plano de governo, atividades, marcos, contratos, pagamentos e empenhos.
- O acesso pelo painel fica em "Sistema → Portal público" e abre em nova aba.

---

## 31. Fluxos principais

### 31.1 Cadastro de projeto

1. Usuário com permissão clica em "Novo projeto".
2. Preenche identificação, planejamento, requisitos e riscos.
3. Responde ao plano de governo.
4. Informa orçamento.
5. Salva.
6. Sistema gera código, registra status "Não iniciado" e auditoria.
7. Usuário é levado ao detalhe com toast "Projeto cadastrado".
8. Próximos passos sugeridos: adicionar atividades e anexos.

### 31.2 Execução de atividade

1. Secretaria responsável abre o projeto e a aba Atividades.
2. Clica em "Iniciar" na primeira atividade.
3. Sistema grava início real, define início real do projeto e recalcula status.
4. Ao terminar, clica em "Concluir".
5. Sistema grava término real e recalcula progresso e status.
6. Quando todas forem concluídas, o projeto é concluído e recebe término real.
7. Secretarias envolvidas acompanham sem editar.

### 31.3 Alteração de prazo

1. Usuário edita datas previstas.
2. Ao salvar, o sistema detecta a mudança.
3. Diálogo exige justificativa.
4. Sistema grava a alteração, o histórico e notifica as secretarias envolvidas.
5. Projeto pode mudar de status após recálculo.

### 31.4 Encaminhamento

1. Secretaria responsável clica em "Encaminhar".
2. Escolhe secretaria envolvida de destino.
3. Escreve justificativa.
4. Confirma.
5. Sistema registra protocolo, troca a responsabilidade e notifica o destino.
6. Origem continua vendo; destino passa a editar.

### 31.5 Conclusão do projeto

1. Todas as atividades concluídas e com datas reais.
2. Sistema define término real como a maior data de conclusão.
3. Status vira Concluído ou Concluído com atraso.
4. Progresso chega a 100%.
5. Painel e relatórios refletem o resultado.

### 31.6 Criação de usuário

1. Administrador abre Usuários e clica em "Novo usuário".
2. Preenche dados, cargo, secretaria, perfil e senha inicial.
3. Sistema valida e-mail único e regras de Administrador.
4. Cria usuário ativo e registra auditoria.
5. Administrador entrega as credenciais iniciais.

---

## 32. Microcopy

### 32.1 Títulos e botões

| Contexto | Texto |
|---|---|
| Criar projeto | "Novo projeto" |
| Salvar | "Salvar projeto" |
| Adicionar atividade | "Nova atividade" |
| Encaminhar | "Encaminhar projeto" |
| Exportar | "Exportar XLSX" |
| Confirmar exclusão | "Excluir projeto" |
| Cancelar | "Cancelar" |
| Voltar | "Voltar" |

### 32.2 Confirmações

| Ação | Texto |
|---|---|
| Excluir projeto | "Excluir o projeto [nome]? Ele deixará de aparecer nas listas e relatórios. Esta ação é registrada na auditoria." |
| Cancelar projeto | "Cancelar o projeto [nome]? O cancelamento é final para o seu perfil." |
| Encaminhar | "Encaminhar [nome] para [secretaria]? Sua secretaria continuará vendo o projeto, mas só o destino poderá editá-lo." |
| Inativar usuário | "Inativar [nome]? A pessoa perderá o acesso imediatamente." |

### 32.3 Vazios

| Contexto | Texto |
|---|---|
| Sem projetos | "Ainda não há projetos cadastrados. Comece criando o primeiro projeto da gestão." |
| Sem atividades | "Nenhuma atividade cadastrada. As atividades definem o progresso do projeto." |
| Sem riscos | "Nenhum risco registrado. Use GUT para priorizar o que exige ação." |
| Sem notificações | "Você está em dia. Novos avisos aparecerão aqui." |
| Sem lições | "Nenhuma lição registrada. Compartilhe aprendizados para melhorar os próximos projetos." |

---

## 33. Acessibilidade e qualidade

- Contraste mínimo AA em texto e componentes.
- Foco visível em todos os elementos interativos.
- Navegação completa por teclado, incluindo diálogos e menus.
- Rótulos associados aos campos; erros anunciados por leitores de tela.
- Status não dependem apenas de cor.
- Tabelas com cabeçalhos semânticos e descrição de ações.
- Gráficos acompanhados de tabela ou resumo textual.
- Respeito a `prefers-reduced-motion`.
- Zoom até 200% sem perda de função.
- Textos de erro com o que aconteceu e como resolver.

---

## 34. Inventário de componentes (shadcn/ui)

| Área | Componentes |
|---|---|
| Shell | Sidebar, Breadcrumb, DropdownMenu, Sheet, Avatar, Badge, Tooltip, Separator, ScrollArea |
| Login | Card, Field, Input, Select, Button, Alert |
| Painel | Card, Chart, Progress, Table, Tabs, Skeleton, Empty, Button, Select |
| Projetos | Table, Badge, Progress, DropdownMenu, Input, Select, ToggleGroup, Button, Empty, Skeleton |
| Kanban | Card, Badge, Progress, DropdownMenu, ScrollArea, Empty |
| Formulários | FieldGroup, Field, FieldLabel, FieldDescription, Input, Textarea, Select, Switch, ToggleGroup, Calendar, Popover, InputGroup, Button, Alert |
| Atividades | Table, Dialog, AlertDialog, DropdownMenu, Badge, Progress |
| Riscos | Table, Dialog, Slider ou Select, Badge, Card, Progress |
| SWOT | Card, Textarea, Button, DropdownMenu |
| Anexos | Card, Table, Progress, Alert, Button |
| Histórico | Timeline customizada, Badge, Card, ScrollArea |
| Notificações | Sheet, Tabs, Badge, ScrollArea, Empty |
| Administração | Table, Dialog, AlertDialog, Select, Switch, Field, Input, Badge, DropdownMenu |
| Relatórios | Card, Select, Switch, Table, Button, Alert |
| Feedback | Sonner, Alert, Skeleton, Spinner, Empty |
| Gráficos | Chart (Recharts) |
| Datas | Calendar + Popover com formatação `dd/MM/yyyy` |

---

## 35. Ordem de implementação das telas

| Etapa | Telas |
|---|---|
| 1 | Shell, login, painel |
| 2 | Projetos (lista, kanban), cadastro, detalhe (visão geral) |
| 3 | Atividades, cronograma, histórico |
| 4 | Riscos/GUT, 5W2H, SWOT, lições, anexos |
| 5 | Encaminhamento, status, exclusão |
| 6 | Relatórios, notificações |
| 7 | Usuários, secretarias, cargos, perfis, auditoria |
| 8 | Manual, perfil, acabamento e testes |

---

## 36. Critérios de aceite de interface

1. Todos os status são exibidos com texto, cor e ícone; nenhum emoji.
2. Nenhuma tela permite ação não autorizada ao perfil.
3. Secretarias não envolvidas não conseguem abrir um projeto por URL.
4. Progresso e status sempre coerentes com as atividades.
5. Alterar prazo sem justificativa é impossível pela interface e pela API.
6. Encaminhamento só aceita secretarias envolvidas.
7. Kanban tem exatamente três colunas e não permite arrastar.
8. Campos institucionais aparecem bloqueados após o cadastro.
9. Governo não vê botões de escrita e não acessa administração.
10. Toda lista tem estado vazio, carregando e erro.
11. Login, painel, projetos, atividades, riscos e relatórios funcionam em 360 px.
12. Navegação por teclado alcança menus, diálogos e formulários.
13. Notificações levam ao recurso correto e atualizam o contador.
14. Relatório XLSX reflete os filtros e a visibilidade.
15. Cargo e perfil são campos distintos e explicados na interface.

---

## 37. Decisões pendentes

1. Nome do produto: manter **Ágora** ou usar a marca AGEVAP?
2. Governo pode exportar relatórios ou apenas visualizar dashboards e kanban?
3. Alertas de vencimento: 7 dias é o prazo adequado?
4. Integração financeira entra como simulação na POC ou apenas documentada?
5. Cancelamento deve ser final para todos, inclusive Administrador?
6. Cargos devem ser um catálogo por prefeitura ou uma lista global da plataforma?

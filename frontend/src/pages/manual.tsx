import { useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRightLeft,
  BookOpen,
  CircleDollarSign,
  FileSpreadsheet,
  Landmark,
  ScrollText,
  Search,
  Users,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const steps = [
  {
    title: "Cadastre o projeto",
    body: "Em Projetos → Novo projeto, informe justificativa, objetivos, requisitos e avaliação de riscos. Escolha a secretaria responsável e as envolvidas. Se o projeto atende ao plano de governo, descreva a proposta.",
  },
  {
    title: "Divida em atividades",
    body: "Na aba Atividades, crie entregas com início e término previstos. Iniciar a primeira atividade coloca o projeto em andamento; concluir todas conclui o projeto.",
  },
  {
    title: "Avalie riscos e planos",
    body: "Use a matriz GUT (gravidade × urgência × tendência) na aba Riscos e registre respostas no 5W2H com responsável, prazo e custo.",
  },
  {
    title: "Mantenha a governança",
    body: "Use SWOT para contexto, anexos para documentos e lições aprendidas para registrar o que deve ser repetido ou evitado.",
  },
]

const ruleGroups = [
  {
    icon: Landmark,
    title: "Escopo institucional",
    items: [
      "Justificativa, objetivos, requisitos, avaliação de riscos e vínculo com o plano de governo ficam imutáveis após o cadastro.",
      "Somente o administrador altera esses campos, e cada mudança é registrada na auditoria.",
      "Projetos marcados como plano de governo exigem a descrição da proposta atendida.",
    ],
  },
  {
    icon: ArrowRightLeft,
    title: "Prazos e encaminhamentos",
    items: [
      "Alterar datas de projeto ou atividade exige justificativa e notifica os envolvidos.",
      "O encaminhamento muda a secretaria responsável, mantém as envolvidas e registra autor, destino e motivo.",
      "A situação do projeto é derivada das atividades; suspender ou cancelar interrompe o cômputo de atraso.",
    ],
  },
  {
    icon: CircleDollarSign,
    title: "Orçamento",
    items: [
      "Informe o orçamento previsto e o executado. Valores negativos são recusados.",
      "O painel compara previsto e executado por secretaria para apoiar a prestação de contas.",
    ],
  },
  {
    icon: FileSpreadsheet,
    title: "Relatórios e exportação",
    items: [
      "Em Relatórios, aplique filtros e baixe a carteira em XLSX com os mesmos critérios da prévia.",
      "A planilha inclui código, situação, prioridade, secretaria, prazos, progresso e orçamento.",
    ],
  },
  {
    icon: ScrollText,
    title: "Auditoria e tempo real",
    items: [
      "Toda alteração gera um evento de auditoria com usuário, ação, detalhe e IP.",
      "As telas são sincronizadas por WebSocket: alterações aparecem sem recarregar a página.",
      "O indicador no topo mostra se a conexão em tempo real está ativa.",
    ],
  },
  {
    icon: BookOpen,
    title: "Atalhos",
    items: [
      "Buscar projetos: /projetos",
      "Quadro de fluxo: /kanban",
      "Cronograma: /cronograma",
      "Administração: /administracao",
    ],
  },
]

const roles = [
  { role: "Administrador", scope: "Toda a prefeitura", can: "Cria e exclui projetos, gerencia usuários, secretarias, cargos e auditoria. Único que altera o escopo institucional após o cadastro." },
  { role: "Gestor", scope: "Secretaria de vínculo", can: "Edita projetos e atividades da secretaria, encaminha, registra riscos, planos, SWOT, lições e anexos." },
  { role: "Editor", scope: "Secretaria de vínculo", can: "Atualiza atividades, riscos, planos e anexos dos projetos da secretaria. Não altera escopo institucional." },
  { role: "Governo", scope: "Somente leitura", can: "Acompanha indicadores, cronograma, relatórios e histórico. Não cria nem edita registros." },
]

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export default function ManualPage() {
  const [query, setQuery] = useState("")
  const term = normalize(query.trim())

  const filteredSteps = term
    ? steps.filter((step) => normalize(`${step.title} ${step.body}`).includes(term))
    : steps
  const filteredRoles = term
    ? roles.filter((item) => normalize(`${item.role} ${item.scope} ${item.can}`).includes(term))
    : roles
  const filteredRules = ruleGroups
    .map((group) => ({
      ...group,
      items: term
        ? group.items.filter((item) => normalize(`${group.title} ${item}`).includes(term))
        : group.items,
    }))
    .filter((group) => group.items.length > 0)

  const resultCount = filteredSteps.length + filteredRoles.length + filteredRules.reduce((total, group) => total + group.items.length, 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Manual do sistema"
        description="Referência rápida do fluxo de trabalho, permissões e regras do Ágora. Para o detalhamento de cada tela, consulte a documentação do repositório."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar no manual (ex.: prazo, anexo, orçamento)"
            className="pl-9"
            aria-label="Buscar no manual"
          />
        </div>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
          {resultCount} resultado(s)
        </p>
      </div>

      {resultCount === 0 ? (
        <Empty className="border border-border bg-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>Nenhum trecho encontrado</EmptyTitle>
            <EmptyDescription>Tente outra palavra, como projeto, atividade, risco ou auditoria.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}


      {filteredSteps.length ? (
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b border-border px-5 py-4">
          <CardTitle className="text-base">Fluxo em quatro etapas</CardTitle>
          <CardDescription>Do cadastro do projeto à prestação de contas.</CardDescription>
        </CardHeader>
        <ol className="divide-y divide-border">
          {filteredSteps.map((step) => (
            <li key={step.title} className="grid gap-2 px-5 py-4 sm:grid-cols-[2.5rem_1fr] sm:gap-4">
              <span className="font-mono text-xs text-signal">{String(steps.indexOf(step) + 1).padStart(2, "0")}</span>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>
      ) : null}

      {filteredRoles.length ? (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-muted-foreground" />
            Perfis e permissões
          </CardTitle>
          <CardDescription>Cada prefeitura é isolada: usuários de um município não acessam dados de outro.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-36">Perfil</TableHead>
                  <TableHead className="w-44">Escopo</TableHead>
                  <TableHead>Pode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((item) => (
                  <TableRow key={item.role}>
                    <TableCell className="font-medium">{item.role}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.scope}</TableCell>
                    <TableCell className="text-xs leading-relaxed">{item.can}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card md:hidden">
            {filteredRoles.map((item) => (
              <div key={item.role} className="flex flex-col gap-1.5 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">{item.role}</p>
                  <span className="shrink-0 border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted-foreground">
                    {item.scope}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{item.can}</p>
              </div>
            ))}
          </div>
                </CardContent>
      </Card>
      ) : null}

      {filteredRules.length ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regras de operação</CardTitle>
          <CardDescription>O que muda conforme o perfil e como o sistema registra cada decisão.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-x-10 gap-y-7 md:grid-cols-2">
          {filteredRules.map((group) => (
            <section key={group.title} className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <group.icon className="size-4 text-muted-foreground" />
                {group.title}
              </h3>
              <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-border" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </CardContent>
      </Card>
      ) : null}

      <Card className="gap-3 border-signal/40 bg-signal/5">
        <CardContent className="flex flex-col gap-1 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Ambiente de demonstração</p>
          <p>
            Os dados exibidos são fictícios. Para detalhes técnicos de API, regras e modelo de dados, consulte os arquivos
            ESPECIFICACAO.md e TELAS.md na raiz do repositório.
          </p>
          <p>
            <Link to="/projetos" className="underline underline-offset-4 hover:text-foreground">
              Ir para o portfólio
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

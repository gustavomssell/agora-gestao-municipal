import { useSearchParams } from "react-router-dom"
import { PageHeader } from "@/components/page-header"
import { UsersTab } from "@/components/admin/users-tab"
import { SecretariatsTab } from "@/components/admin/secretariats-tab"
import { CargosTab } from "@/components/admin/cargos-tab"
import { ProfilesTab } from "@/components/admin/profiles-tab"
import { AuditTab } from "@/components/admin/audit-tab"
import { BrandingTab } from "@/components/admin/branding-tab"
import { SuppliersTab } from "@/components/admin/suppliers-tab"
import { TemplatesTab } from "@/components/admin/templates-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const tabs = ["usuarios", "secretarias", "cargos", "fornecedores", "modelos", "perfis", "identidade", "auditoria"] as const

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const tab = tabs.find((value) => value === requestedTab) ?? "usuarios"

  function handleTabChange(value: string) {
    const next = new URLSearchParams(searchParams)
    next.set("tab", value)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Administração"
        description="Gerencie acessos, a estrutura administrativa, fornecedores, modelos de projeto, a identidade visual e acompanhe a trilha de auditoria da prefeitura."
      />

      <Tabs value={tab} onValueChange={handleTabChange} className="gap-5">
        <TabsList
          className="w-full flex-wrap justify-start gap-1 [&_[data-slot=tabs-trigger]]:h-9 [&_[data-slot=tabs-trigger]]:flex-none"
          style={{ height: "auto" }}
        >
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="secretarias">Secretarias</TabsTrigger>
          <TabsTrigger value="cargos">Cargos</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
          <TabsTrigger value="perfis">Perfis</TabsTrigger>
          <TabsTrigger value="identidade">Identidade</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          <UsersTab key={searchParams.get("search") ?? "all"} />
        </TabsContent>
        <TabsContent value="secretarias">
          <SecretariatsTab />
        </TabsContent>
        <TabsContent value="cargos">
          <CargosTab />
        </TabsContent>
        <TabsContent value="fornecedores">
          <SuppliersTab />
        </TabsContent>
        <TabsContent value="modelos">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="perfis">
          <ProfilesTab />
        </TabsContent>
        <TabsContent value="identidade">
          <BrandingTab />
        </TabsContent>
        <TabsContent value="auditoria">
          <AuditTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

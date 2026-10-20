import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
}

export function EditProfileDialog({ open, onOpenChange, currentName }: EditProfileDialogProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(currentName)
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 3 || trimmed.length > 120) {
      toast.error("Informe um nome entre 3 e 120 caracteres.")
      return
    }
    setSaving(true)
    try {
      await api.updateProfile(trimmed)
      await queryClient.invalidateQueries({ queryKey: ["me"] })
      toast.success("Nome atualizado.")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o nome.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Editar nome</DialogTitle>
            <DialogDescription>O novo nome aparece no sistema e na trilha de auditoria.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-name">Nome completo</Label>
            <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Salvar nome"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

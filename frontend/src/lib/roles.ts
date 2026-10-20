export const ROLES = {
  ADMIN: "ADMIN",
  GESTOR: "GESTOR",
  EDITOR: "EDITOR",
  GOVERNO: "GOVERNO",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_VALUES = [ROLES.ADMIN, ROLES.GESTOR, ROLES.EDITOR, ROLES.GOVERNO] as const

export const roleLabels: Record<Role, string> = {
  [ROLES.ADMIN]: "Administrador",
  [ROLES.GESTOR]: "Gestor",
  [ROLES.EDITOR]: "Editor",
  [ROLES.GOVERNO]: "Governo",
}

export function roleLabel(role: Role): string {
  return roleLabels[role]
}

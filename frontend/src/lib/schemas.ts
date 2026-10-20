import { z } from "zod"
import { ROLE_VALUES } from "@/lib/roles"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emailField = z
  .string()
  .trim()
  .min(1, "Informe o e-mail.")
  .refine((value) => emailPattern.test(value), "Informe um e-mail válido.")

export const activitySchema = z
  .object({
    title: z.string().trim().min(3, "Informe um título com pelo menos 3 caracteres."),
    description: z.string(),
    planned_start: z.string().min(1, "Informe o início previsto."),
    planned_end: z.string().min(1, "Informe o término previsto."),
    deadline_justification: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.planned_start && value.planned_end && value.planned_end < value.planned_start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["planned_end"],
        message: "O término previsto não pode ser anterior ao início.",
      })
    }
  })

export type ActivityFormValues = z.infer<typeof activitySchema>

export const riskSchema = z.object({
  description: z.string().trim().min(5, "Descreva o risco com pelo menos 5 caracteres."),
  category: z.string(),
  gravity: z.enum(["1", "2", "3", "4", "5"]),
  urgency: z.enum(["1", "2", "3", "4", "5"]),
  tendency: z.enum(["1", "2", "3", "4", "5"]),
  status: z.enum(["ABERTO", "MITIGADO", "ENCERRADO"]),
  response: z.string(),
  owner: z.string(),
})

export type RiskFormValues = z.infer<typeof riskSchema>

export const actionSchema = z.object({
  risk_id: z.string(),
  what: z.string().trim().min(3, "Descreva o que será feito."),
  why: z.string().trim().min(3, "Descreva o porquê."),
  where: z.string(),
  when: z.string(),
  who: z.string(),
  how: z.string().trim().min(3, "Descreva como será feito."),
  how_much: z.string(),
  status: z.enum(["PLANEJADA", "EM_EXECUCAO", "CONCLUIDA", "CANCELADA"]),
})

export type ActionFormValues = z.infer<typeof actionSchema>

export const lessonSchema = z.object({
  title: z.string().trim().min(3, "Informe um título."),
  description: z.string().trim().min(10, "Descreva a lição com pelo menos 10 caracteres."),
  category: z.string(),
})

export type LessonFormValues = z.infer<typeof lessonSchema>

export const userSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo."),
  email: emailField,
  password: z.string(),
  role: z.enum(ROLE_VALUES),
  secretariat_id: z.string(),
  cargo_id: z.string(),
  active: z.boolean(),
})

export type UserFormValues = z.infer<typeof userSchema>

export const secretariatSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome da secretaria."),
  acronym: z.string().trim().min(2, "Informe a sigla.").max(8, "Use no máximo 8 caracteres."),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Informe uma cor hexadecimal válida."),
  active: z.boolean(),
})

export type SecretariatFormValues = z.infer<typeof secretariatSchema>

export const cargoSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome do cargo."),
  description: z.string(),
  active: z.boolean(),
})

export type CargoFormValues = z.infer<typeof cargoSchema>

export const transferSchema = z.object({
  target_secretariat_id: z.string().min(1, "Selecione a secretaria de destino."),
  note: z.string().trim().min(5, "Explique o motivo do encaminhamento."),
})

export type TransferFormValues = z.infer<typeof transferSchema>

export const statusSchema = z.object({
  status: z.string().min(1, "Selecione a nova situação."),
  note: z.string(),
})

export type StatusFormValues = z.infer<typeof statusSchema>

export const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Informe a senha atual."),
    new_password: z.string().min(6, "A nova senha deve ter ao menos 6 caracteres."),
    confirm_password: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.new_password !== value.confirm_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirm_password"],
        message: "As senhas não conferem.",
      })
    }
  })

export type PasswordFormValues = z.infer<typeof passwordSchema>

export const loginSchema = z.object({
  tenant: z.string().min(1, "Selecione a prefeitura."),
  email: emailField,
  password: z.string().min(1, "Informe a senha."),
})

export type LoginFormValues = z.infer<typeof loginSchema>

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use o formato hexadecimal #RRGGBB.")

export const brandingSchema = z.object({
  primary_color: hexColor,
  secondary_color: hexColor,
})

export type BrandingFormValues = z.infer<typeof brandingSchema>

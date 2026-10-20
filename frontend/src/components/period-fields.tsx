import { Input } from "@/components/ui/input"

interface PeriodFieldsProps {
  idPrefix: string
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
}

export function PeriodFields({ idPrefix, from, to, onFromChange, onToChange }: PeriodFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-from`} className="text-xs font-medium text-muted-foreground">
          Período — de
        </label>
        <Input
          id={`${idPrefix}-from`}
          type="date"
          value={from}
          max={to || undefined}
          onChange={(event) => onFromChange(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-to`} className="text-xs font-medium text-muted-foreground">
          Período — até
        </label>
        <Input
          id={`${idPrefix}-to`}
          type="date"
          value={to}
          min={from || undefined}
          onChange={(event) => onToChange(event.target.value)}
        />
      </div>
    </>
  )
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SETORES, setorOficial } from "@/lib/setores"

interface Props {
  value: string
  onChange: (setor: string) => void
  id?: string
  placeholder?: string
  className?: string
  /** Use "z-[300]" quando o select estiver dentro de um modal */
  contentClassName?: string
}

/**
 * Select com a lista oficial de setores.
 * Se o usuário tiver um setor antigo que não está na lista (ex: "Geral"),
 * ele aparece marcado como "antigo" para a pessoa trocar.
 */
export default function SelectSetor({ value, onChange, id, placeholder = "Selecione o setor", className, contentClassName }: Props) {
  const oficial = setorOficial(value)
  const valorAtual = oficial ?? value
  const setorAntigo = value && !oficial ? value : null

  return (
    <Select value={valorAtual || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className={`w-full bg-white ${className ?? ""}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={`max-h-72 ${contentClassName ?? ""}`} position="popper">
        {setorAntigo && (
          <SelectItem value={setorAntigo}>
            <span className="text-slate-400">{setorAntigo} (antigo, escolha outro)</span>
          </SelectItem>
        )}
        {SETORES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, BadgeCheck, Eye, EyeOff, Loader2, Mail, Save, UserCog, X } from "lucide-react"
import { formatarNome } from "@/lib/utils"

export interface UsuarioEditavel {
  id: number
  nome: string
  matricula: string
  email: string
  setor?: string | null
  perfil: string
}

interface Props {
  usuario: UsuarioEditavel
  setores: string[]
  onFechar: () => void
  onSalvo: () => void
}

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

export default function ModalEditarUsuario({ usuario, setores, onFechar, onSalvo }: Props) {
  const [nome, setNome] = useState(usuario.nome)
  const [matricula, setMatricula] = useState(usuario.matricula)
  const [email, setEmail] = useState(usuario.email)
  const [setor, setSetor] = useState(usuario.setor || "")
  const [perfil, setPerfil] = useState(usuario.perfil)
  const [senha, setSenha] = useState("")
  const [verSenha, setVerSenha] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  // Fecha com Esc e trava a rolagem da página
  useEffect(() => {
    const aoApertar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar()
    }
    document.addEventListener("keydown", aoApertar)
    const anterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", aoApertar)
      document.body.style.overflow = anterior
    }
  }, [onFechar])

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")

    if (!nome.trim() || !matricula.trim() || !setor.trim()) {
      setErro("Preencha nome, matrícula e setor.")
      return
    }
    if (!emailValido(email)) {
      setErro("Digite um e-mail válido.")
      return
    }

    // Envia só o que mudou
    const dados: Record<string, string> = {}
    if (nome.trim().toUpperCase() !== usuario.nome) dados.nome = nome.trim().toUpperCase()
    if (matricula.trim() !== usuario.matricula) dados.matricula = matricula.trim()
    if (email.trim().toLowerCase() !== (usuario.email || "").toLowerCase()) dados.email = email.trim().toLowerCase()
    if (setor.trim() !== (usuario.setor || "")) dados.setor = setor.trim()
    if (perfil !== usuario.perfil) dados.perfil = perfil
    if (senha) dados.senha = senha

    if (Object.keys(dados).length === 0) {
      onFechar()
      return
    }

    setSalvando(true)
    try {
      await api.put(`/usuarios/${usuario.id}`, dados)
      onSalvo()
    } catch (error: any) {
      const detalhe = error.response?.data?.detail
      setErro(
        typeof detalhe === "string"
          ? detalhe
          : Array.isArray(detalhe)
            ? "Verifique os dados digitados (o e-mail pode estar inválido)."
            : "Não foi possível salvar. Tente novamente."
      )
    } finally {
      setSalvando(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onFechar}>
      <form
        onSubmit={salvar}
        onClick={(e) => e.stopPropagation()}
        className="notif-painel relative max-h-[92vh] rounded-b-none sm:max-h-[calc(100vh-2rem)] sm:rounded-b-xl w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Editar dados do usuário</h3>
              <p className="text-sm text-slate-500">{formatarNome(usuario.nome)}</p>
            </div>
          </div>
          <button type="button" onClick={onFechar} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-slate-400" /> Matrícula</Label>
              <Input required inputMode="numeric" value={matricula} onChange={(e) => setMatricula(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Input required list="lista-setores" value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Ex: Saúde, Obras..." />
              <datalist id="lista-setores">
                {setores.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> E-mail</Label>
            <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@belavistademinas.mg.gov.br" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nível de acesso</Label>
              <Select value={perfil} onValueChange={setPerfil}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[300]">
                  <SelectItem value="solicitante">Solicitante</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nova senha <span className="font-normal text-slate-400">(opcional)</span></Label>
              <div className="relative">
                <Input type={verSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)}
                  placeholder="Deixe vazio para manter" className="pr-10" autoComplete="new-password" />
                <button type="button" onClick={() => setVerSenha(!verSenha)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                  aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}>
                  {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {matricula.trim() !== usuario.matricula && (
            <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              A matrícula é usada no login. Avise o usuário que ele passará a entrar com a matrícula <b>{matricula.trim() || "—"}</b>.
            </p>
          )}

          {erro && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{erro}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" disabled={salvando} className="bg-amber-600 hover:bg-amber-700">
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </div>,
    document.body
  )
}

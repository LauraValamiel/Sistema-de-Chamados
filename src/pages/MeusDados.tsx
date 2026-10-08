import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, BadgeCheck, Building2, CheckCircle2, Loader2, Mail, Save, ShieldCheck, UserRound } from "lucide-react"
import { formatarNome } from "@/lib/utils"
import AlterarSenha from "./AlterarSenha"

interface Dados {
  id: number
  nome: string
  matricula: string
  email: string
  setor: string | null
  perfil: string
}

const ROTULO_PERFIL: Record<string, string> = {
  admin: "Administrador",
  tecnico: "Técnico",
  solicitante: "Solicitante",
}

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

export default function MeusDados() {
  const location = useLocation()
  const novoCadastro = Boolean((location.state as any)?.novoCadastro)
  const [dados, setDados] = useState<Dados | null>(null)
  const [setores, setSetores] = useState<string[]>([])
  const [nome, setNome] = useState("")
  const [matricula, setMatricula] = useState("")
  const [email, setEmail] = useState("")
  const [setor, setSetor] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null)

  const preencher = (d: Dados) => {
    setDados(d)
    // Conta criada pela tela de login vem com nome provisório ("SERVIDOR 12345"): deixa o campo vazio para preencher
    setNome(d.nome === `SERVIDOR ${d.matricula}` ? "" : formatarNome(d.nome))
    setMatricula(d.matricula)
    setEmail(d.email || "")
    setSetor(d.setor || "")
  }

  useEffect(() => {
    api.get<Dados>("/usuarios/me").then(({ data }) => preencher(data)).catch(() => {
      setMensagem({ tipo: "erro", texto: "Não foi possível carregar os seus dados." })
    })
    api.get<string[]>("/setores/").then(({ data }) => setSetores(data)).catch(() => {})
  }, [])

  const houveMudanca =
    !!dados &&
    (nome.trim().toUpperCase() !== dados.nome ||
      matricula.trim() !== dados.matricula ||
      email.trim().toLowerCase() !== (dados.email || "").toLowerCase() ||
      setor.trim() !== (dados.setor || ""))

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dados) return
    setMensagem(null)

    if (!nome.trim() || !matricula.trim() || !setor.trim()) {
      setMensagem({ tipo: "erro", texto: "Preencha nome, matrícula e setor." })
      return
    }
    if (!/^\d+$/.test(matricula.trim())) {
      setMensagem({ tipo: "erro", texto: "A matrícula deve conter apenas números." })
      return
    }
    if (!emailValido(email)) {
      setMensagem({ tipo: "erro", texto: "Digite um e-mail válido." })
      return
    }

    // Envia só o que mudou
    const envio: Record<string, string> = {}
    if (nome.trim().toUpperCase() !== dados.nome) envio.nome = nome.trim()
    if (matricula.trim() !== dados.matricula) envio.matricula = matricula.trim()
    if (email.trim().toLowerCase() !== (dados.email || "").toLowerCase()) envio.email = email.trim().toLowerCase()
    if (setor.trim() !== (dados.setor || "")) envio.setor = setor.trim()

    setSalvando(true)
    try {
      const { data } = await api.put<Dados>("/usuarios/me", envio)
      preencher(data)

      // Atualiza o nome, a matrícula e o setor guardados no navegador (cabeçalho, novo chamado...)
      const guardado = JSON.parse(localStorage.getItem("usuarioLogado") ?? "{}")
      localStorage.setItem(
        "usuarioLogado",
        JSON.stringify({ ...guardado, nome: data.nome, matricula: data.matricula, email: data.email, setor: data.setor })
      )
      window.dispatchEvent(new Event("usuario-atualizado"))

      setMensagem({
        tipo: "ok",
        texto: envio.matricula
          ? `Dados salvos. A partir de agora, entre no sistema com a matrícula ${data.matricula}.`
          : "Dados salvos com sucesso.",
      })
    } catch (error: any) {
      const detalhe = error.response?.data?.detail
      setMensagem({
        tipo: "erro",
        texto: typeof detalhe === "string" ? detalhe : "Não foi possível salvar. Verifique os dados e tente novamente.",
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Meus Dados</h2>
        <p className="mt-1 text-slate-500">Mantenha suas informações atualizadas e altere sua senha.</p>
      </div>

      {novoCadastro && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Conta criada com sucesso! Bem-vindo(a).</p>
            <p>Informe o seu <b>nome completo</b> abaixo e clique em <b>Salvar dados</b>, para a equipe de TI saber quem abriu cada chamado.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Dados pessoais */}
        <Card className="border-slate-200 shadow-sm lg:col-span-3">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-700">
              <UserRound className="h-5 w-5 text-blue-600" />
              Dados pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!dados ? (
              <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : (
              <form onSubmit={salvar} className="space-y-5">
                <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {(formatarNome(dados.nome).split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("") || "?").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{formatarNome(dados.nome)}</p>
                    <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <ShieldCheck className="h-3.5 w-3.5" /> {ROTULO_PERFIL[dados.perfil] ?? dados.perfil}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-slate-400" /> Matrícula</Label>
                    <Input required inputMode="numeric" value={matricula} onChange={(e) => setMatricula(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-slate-400" /> Setor</Label>
                    <Input required list="meus-dados-setores" value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Ex: Saúde, Obras..." />
                    <datalist id="meus-dados-setores">
                      {setores.map((s) => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> E-mail</Label>
                  <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.email@exemplo.com" />
                </div>

                {dados && matricula.trim() !== dados.matricula && (
                  <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    A matrícula é usada para entrar no sistema. Depois de salvar, use a matrícula nova no próximo login.
                  </p>
                )}

                {mensagem && (
                  <div className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                    mensagem.tipo === "ok" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-600"
                  }`}>
                    {mensagem.tipo === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                    {mensagem.texto}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={!houveMudanca || salvando} className="bg-blue-600 hover:bg-blue-700">
                    {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {salvando ? "Salvando..." : "Salvar dados"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Senha */}
        <div className="lg:col-span-2">
          <AlterarSenha embutido />
        </div>
      </div>
    </main>
  )
}

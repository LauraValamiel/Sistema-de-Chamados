import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyRound, Eye, EyeOff, CheckCircle2, Circle, AlertTriangle, Loader2 } from "lucide-react"

const SENHA_PADRAO = "Mudar123"

// Campo de senha com botão de mostrar/ocultar
function CampoSenha({
  id, label, value, onChange, placeholder,
}: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [visivel, setVisivel] = useState(false)
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visivel ? "text" : "password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
          autoComplete={id === "senha-atual" ? "current-password" : "new-password"}
        />
        <button
          type="button"
          onClick={() => setVisivel(!visivel)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        >
          {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

function Regra({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <li className={`flex items-center gap-2 text-sm ${ok ? "text-emerald-600" : "text-slate-500"}`}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      {texto}
    </li>
  )
}

// embutido = true: mostra só o cartão (usado dentro da tela "Meus Dados")
export default function AlterarSenha({ embutido = false }: { embutido?: boolean }) {
  const navigate = useNavigate()
  const usuarioStorage = localStorage.getItem("usuarioLogado")
  const usuario = usuarioStorage ? JSON.parse(usuarioStorage) : null
  const trocaObrigatoria = Boolean(usuario?.precisaTrocarSenha)

  const [senhaAtual, setSenhaAtual] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmacao, setConfirmacao] = useState("")
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Regras da nova senha
  const regras = {
    tamanho: novaSenha.length >= 6,
    letraNumero: /[a-zA-Z]/.test(novaSenha) && /\d/.test(novaSenha),
    diferentePadrao: novaSenha !== "" && novaSenha !== SENHA_PADRAO,
    diferenteAtual: novaSenha !== "" && novaSenha !== senhaAtual,
    confere: novaSenha !== "" && novaSenha === confirmacao,
  }
  const tudoOk = Object.values(regras).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")
    if (!tudoOk || !usuario) return

    setSalvando(true)

    // 1. Busca os dados atuais do usuário (para não alterar nome, setor ou perfil)
    let dados: any = null
    try {
      const response = await api.get("/usuarios/")
      dados = Array.isArray(response.data)
        ? response.data.find((u: any) => u.id === usuario.id)
        : null
    } catch {
      setErro("Não foi possível conectar ao servidor. Tente novamente em instantes.")
      setSalvando(false)
      return
    }

    // 2. Confirma a senha atual usando a rota de login
    try {
      await api.post("/login", { matricula: String(usuario.matricula ?? dados?.matricula), senha: senhaAtual })
    } catch {
      setErro("A senha atual está incorreta.")
      setSalvando(false)
      return
    }

    // 3. Salva a nova senha
    try {
      await api.put(`/usuarios/${usuario.id}`, {
        nome: dados?.nome ?? usuario.nome,
        setor: dados?.setor ?? usuario.setor ?? "Geral",
        perfil: dados?.perfil ?? usuario.perfil,
        senha: novaSenha,
      })

      // Remove a obrigação de troca
      const usuarioAtualizado = { ...usuario }
      delete usuarioAtualizado.precisaTrocarSenha
      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioAtualizado))

      setSucesso(true)
      setSenhaAtual("")
      setNovaSenha("")
      setConfirmacao("")
    } catch {
      setErro("Não foi possível alterar a senha. Tente novamente em instantes.")
    } finally {
      setSalvando(false)
    }
  }

  const irParaInicio = () => {
    const privilegiado = usuario?.perfil === "admin" || usuario?.perfil === "tecnico"
    navigate(privilegiado ? "/dashboard" : "/novo-chamado")
  }

  const cartao = sucesso ? (
        <Card className="shadow-sm border-emerald-200">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Senha alterada com sucesso!</h3>
              <p className="text-slate-500 text-sm mt-1">Use a nova senha no seu próximo acesso.</p>
            </div>
            {embutido ? (
              <Button variant="outline" onClick={() => setSucesso(false)}>Alterar novamente</Button>
            ) : (
              <Button onClick={irParaInicio} className="bg-blue-600 hover:bg-blue-700">Continuar</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg text-slate-700 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              Nova senha
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {erro && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm font-medium text-red-600">
                  {erro}
                </div>
              )}

              <CampoSenha id="senha-atual" label="Senha atual" value={senhaAtual} onChange={setSenhaAtual}
                placeholder={trocaObrigatoria ? "Mudar123" : "Digite sua senha atual"} />
              <CampoSenha id="nova-senha" label="Nova senha" value={novaSenha} onChange={setNovaSenha}
                placeholder="Crie uma nova senha" />
              <CampoSenha id="confirmar-senha" label="Confirmar nova senha" value={confirmacao} onChange={setConfirmacao}
                placeholder="Repita a nova senha" />

              <ul className="space-y-1.5 rounded-lg bg-slate-50 border border-slate-100 p-4">
                <Regra ok={regras.tamanho} texto="Pelo menos 6 caracteres" />
                <Regra ok={regras.letraNumero} texto="Letras e números" />
                <Regra ok={regras.diferentePadrao} texto="Diferente da senha padrão" />
                <Regra ok={regras.diferenteAtual} texto="Diferente da senha atual" />
                <Regra ok={regras.confere} texto="As duas senhas são iguais" />
              </ul>

              <Button type="submit" disabled={!tudoOk || !senhaAtual || salvando}
                className="w-full bg-blue-600 hover:bg-blue-700">
                {salvando ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : "Salvar nova senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )

  if (embutido) return cartao

  return (
    <main className="p-8 w-full max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Alterar Senha</h2>
        <p className="text-slate-500 mt-1">Defina uma nova senha para acessar o sistema.</p>
      </div>

      {trocaObrigatoria && !sucesso && (
        <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Troca de senha obrigatória</p>
            <p>Você está usando a senha padrão. Para sua segurança, crie uma senha pessoal antes de continuar.</p>
          </div>
        </div>
      )}

      {cartao}
    </main>
  )
}
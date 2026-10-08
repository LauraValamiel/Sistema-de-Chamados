import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Send } from "lucide-react"
import "./NovoChamado.css"
import { formatarNome } from "@/lib/utils"
import SelectSetor from "@/components/SelectSetor"
import { setorOficial } from "@/lib/setores"

const LIMITE_DESCRICAO = 2000

export default function NovoChamado() {
  const navigate = useNavigate()

  const usuarioStorage = localStorage.getItem("usuarioLogado")
  const usuario = usuarioStorage ? JSON.parse(usuarioStorage) : null
  const privilegiado = usuario?.perfil === "admin" || usuario?.perfil === "tecnico"

  const [setor, setSetor] = useState<string>(usuario?.setor || "")
  const [descricao, setDescricao] = useState("")
  const [prioridade, setPrioridade] = useState("media")
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")

    if (!setorOficial(setor)) {
      setErro("Escolha o seu setor na lista.")
      return
    }
    if (!descricao.trim()) {
      setErro("Descreva o problema antes de enviar.")
      return
    }

    setEnviando(true)
    try {
      // Se a pessoa escolheu outro setor, atualiza o cadastro dela antes de abrir o chamado
      // (o setor do chamado é o setor do solicitante)
      if (setor !== usuario?.setor) {
        const { data } = await api.put("/usuarios/me", { setor })
        localStorage.setItem("usuarioLogado", JSON.stringify({ ...usuario, setor: data.setor }))
        window.dispatchEvent(new Event("usuario-atualizado"))
      }

      // O título é gerado automaticamente pelo servidor a partir da descrição
      await api.post("/chamados/", {
        descricao: descricao.trim(),
        prioridade: prioridade.toLowerCase(),
      })
      setDescricao("")
      setPrioridade("media")
      // Solicitante vai acompanhar o chamado; equipe de TI volta ao Dashboard
      navigate(privilegiado ? "/dashboard" : "/meus-chamados", { state: { chamadoCriado: true } })
    } catch (error: any) {
      const detalhe = error.response?.data?.detail
      setErro(typeof detalhe === "string" ? detalhe : "Não foi possível abrir o chamado. Tente novamente.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="nc-main">
      <div className="nc-container">
        <div className="nc-header-wrap">
          <h2 className="nc-title">Novo Chamado</h2>
          <p className="nc-subtitle">Descreva o problema e a equipe de TI vai atender você</p>
        </div>

        <Card className="nc-card">
          <CardHeader className="nc-card-header">
            <CardTitle className="nc-card-title">Informações do Chamado</CardTitle>
          </CardHeader>

          <CardContent className="nc-card-content">
            <form onSubmit={handleSubmit} className="nc-form">
              <div className="nc-section">
                <h3 className="nc-section-title">Dados do Solicitante</h3>
                <Separator className="nc-separator" />
                <div className="nc-grid">
                  <div className="nc-field">
                    <Label className="nc-label">Nome</Label>
                    <Input value={formatarNome(usuario?.nome || "")} readOnly className="nc-input-readonly" />
                  </div>
                  <div className="nc-field">
                    <Label className="nc-label">Setor *</Label>
                    <SelectSetor value={setor} onChange={setSetor} placeholder="Selecione o seu setor" />
                    {setorOficial(setor) && setor !== usuario?.setor && (
                      <p className="text-[11px] text-slate-500">Seu setor também será atualizado no seu cadastro.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="nc-section">
                <h3 className="nc-section-title">Detalhes do Problema</h3>
                <Separator className="nc-separator" />
                <div className="nc-grid">
                  <div className="nc-field-full">
                    <Label className="nc-label">Descreva o problema *</Label>
                    <Textarea
                      required
                      autoFocus
                      value={descricao}
                      maxLength={LIMITE_DESCRICAO}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Ex: O computador da recepção não liga desde hoje cedo. Já verifiquei a tomada."
                      className="nc-textarea"
                    />
                    <p className="text-right text-[11px] text-slate-400">
                      {descricao.length}/{LIMITE_DESCRICAO}
                    </p>
                  </div>

                  <div className="nc-field">
                    <Label className="nc-label">Prioridade *</Label>
                    <Select onValueChange={setPrioridade} value={prioridade}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {erro && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{erro}</div>
              )}

              <div className="nc-footer">
                <Button type="submit" className="nc-btn-submit" disabled={enviando}>
                  {enviando ? <Loader2 className="nc-btn-icon animate-spin" /> : <Send className="nc-btn-icon" />}
                  {enviando ? "Enviando..." : "Enviar Chamado"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(privilegiado ? "/dashboard" : "/meus-chamados")}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

import { useEffect, useState } from "react"
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
import { Send } from "lucide-react"
import "./NovoChamado.css"
import { formatarNome } from "@/lib/utils"

export default function NovoChamado() {
  const navigate = useNavigate()
  
  // Estados para o formulário
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [categoria, setCategoria] = useState("")
  const [prioridade, setPrioridade] = useState("media")
  
  // Estado para guardar o ID que vem do banco
  const [idSolicitante, setIdSolicitante] = useState<number | null>(null)
  const [nomeSolicitante, setNomeSolicitante] = useState("")

  // Busca o usuário logado no banco ao carregar a página
  useEffect(() => {
    const usuarioStorage = localStorage.getItem("usuarioLogado");
    if (usuarioStorage) {
      const usuario = JSON.parse(usuarioStorage);
      setIdSolicitante(usuario.id); // Agora pegando o ID real que veio do banco!
      setNomeSolicitante(formatarNome(usuario.nome)); // Exibe o nome do solicitante no formulário
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!idSolicitante) {
      alert("Erro: ID do solicitante não encontrado no banco. Verifique se o usuário existe.");
      return;
    }

    const dadosParaEnviar = {
      titulo,
      descricao,
      categoria,
      prioridade: prioridade.toLowerCase(),
      status: "Aberto",
      id_solicitante: idSolicitante // Agora pegando o ID real que veio do useEffect!
    }

    try {
      await api.post("/chamados/", dadosParaEnviar)
      alert("✅ Chamado aberto com sucesso!")

      setTitulo("")
      setDescricao("")

      const usuarioStorage = localStorage.getItem("usuarioLogado");
      const usuario = usuarioStorage ? JSON.parse(usuarioStorage) : null;

      if (usuario && (usuario.perfil === "admin")) {
        navigate("/dashboard")
      }

    } catch (error: any) {
      console.error("Erro ao salvar:", error.response?.data || error.message);
      alert("Erro ao salvar chamado.");
    }
  }

  return (

      <main className="nc-main">
        <div className="nc-container">
          <div className="nc-header-wrap">
            <h2 className="nc-title">Novo Chamado</h2>
            <p className="nc-subtitle">Preencha o formulário abaixo para abrir um novo chamado de suporte</p>
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
                      <Label className="nc-label">Nome Completo</Label>
                      <Input value={nomeSolicitante} readOnly className="nc-input-readonly" />
                    </div>
                    <div className="nc-field">
                      <Label className="nc-label">Setor</Label>
                      <Input value="Geral" readOnly className="nc-input-readonly" />
                    </div>
                  </div>
                </div>

                <div className="nc-section">
                  <h3 className="nc-section-title">Detalhes do Problema</h3>
                  <Separator className="nc-separator" />
                  <div className="nc-grid">
                    <div className="nc-field-full">
                      <Label className="nc-label">Título do Chamado *</Label>
                      <Input required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Breve resumo do problema" />
                    </div>
                    <div className="nc-field-full">
                      <Label className="nc-label">Descrição Detalhada *</Label>
                      <Textarea required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhe o problema..." className="nc-textarea" />
                    </div>
          
                    <div className="nc-field">
                      <Label className="nc-label">Prioridade *</Label>
                      <Select onValueChange={setPrioridade} defaultValue="media">
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

                <div className="nc-footer">
                  <Button type="submit" className="nc-btn-submit">
                    <Send className="nc-btn-icon" /> Enviar Chamado
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancelar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
          </div>
      </main>
  )
}
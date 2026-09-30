import { useState, useEffect } from "react"
import { api } from "@/services/api"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, Calendar } from "lucide-react"
import "./TodosChamados.css"

interface Chamado {
  id: number
  titulo: string
  status: string
  prioridade: string
  categoria: string
  solicitante_nome: string
  departamento?: string
  data_abertura: string
}

export default function TodosChamados() {
  const [chamados, setChamados] = useState<Chamado[]>([])
  const [busca, setBusca] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [prioridadeFiltro, setPrioridadeFiltro] = useState("todas")

  useEffect(() => {
    api.get("/chamados/").then((res) => setChamados(res.data))
  }, [])

  // Lógica de Filtro combinada
  const chamadosFiltrados = chamados.filter((c) => {
    const bateBusca = c.titulo.toLowerCase().includes(busca.toLowerCase()) || 
                      c.id.toString().includes(busca)
    const bateStatus = statusFiltro === "todos" || c.status.toLowerCase() === statusFiltro.toLowerCase()
    const batePrioridade = prioridadeFiltro === "todas" || c.prioridade.toLowerCase() === prioridadeFiltro.toLowerCase()
    
    return bateBusca && bateStatus && batePrioridade
  })

  return (
    <main className="tc-main">
      <div className="tc-container">
        <div className="tc-header">
          <h2 className="tc-title">Todos os Chamados</h2>
          <p className="tc-subtitle">Visualize e gerencie todos os chamados de suporte</p>
        </div>

        <Card className="tc-filter-card">
          <CardContent className="tc-filter-content">
            <div className="tc-filter-title-wrap">
              <Filter className="tc-filter-icon" />
              <span>Filtros</span>
            </div>
            <p className="tc-filter-desc">Filtre os chamados por status, prioridade ou pesquise por palavras-chave</p>
            
            <div className="tc-filter-grid">
              <div className="tc-search-wrap">
                <Search className="tc-search-icon" />
                <Input placeholder="Buscar chamados..." className="tc-search-input" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>

              <Select onValueChange={setStatusFiltro} defaultValue="todos">
                <SelectTrigger><SelectValue placeholder="Todos os Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="aberto">Abertos</SelectItem>
                  <SelectItem value="em andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvidos</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={setPrioridadeFiltro} defaultValue="todas">
                <SelectTrigger><SelectValue placeholder="Todas as Prioridades" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Prioridades</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="tc-list-wrap">
          <h3 className="tc-list-title">Chamados ({chamadosFiltrados.length})</h3>
          
          {chamadosFiltrados.map((chamado) => (
            <Card key={chamado.id} className="tc-card">
              <CardContent className="tc-card-content">
                <div className="tc-card-info">
                  <div className="tc-card-badges">
                    <span>#{chamado.id}</span>
                    <Badge className="tc-badge-status">{chamado.status}</Badge>
                    <Badge variant="outline" className="tc-badge-priority">{chamado.prioridade}</Badge>
                    <Badge variant="secondary" className="tc-badge-category">{chamado.categoria}</Badge>
                  </div>
                  
                  <h4 className="tc-card-title">{chamado.titulo}</h4>
                  
                  <div className="tc-card-user-wrap">
                    <span>{chamado.solicitante_nome}</span>
                    <span className="tc-card-dot" />
                    <span>{chamado.departamento || "Geral"}</span>
                  </div>
                </div>

                <div className="tc-card-meta">
                   <div className="tc-card-date-wrap">
                     <Calendar className="tc-card-date-icon" />
                     <span>{new Date(chamado.data_abertura).toLocaleDateString('pt-BR')}</span>
                   </div>
                   <span className="tc-card-time">{new Date(chamado.data_abertura).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}
import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { api } from "@/services/api" // Nossa conexão com o FastAPI
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import "./Dashboard.css"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowUpDown, AlertTriangle, GitPullRequest, Clock3, CheckCircle2, User, CalendarDays, UserPlus, ChevronDown, X } from "lucide-react"
import { formatarNome } from "@/lib/utils"  

// Tipagem do Chamado (Agora adaptada para o que deve vir do banco)
interface ChamadoKanban {
  id: string;
  titulo: string;
  prioridade: 'urgente' | 'alta' | 'media' | 'baixa';
  categoria: string;
  usuario_solicitante: string;
  data_abertura: string;
  tecnico_responsavel?: string;
  status?: string;
  descricao?: string;
}

// Tipagem das Colunas
interface ColunasType {
  [key: string]: {
    titulo: string;
    corDot: string;
    items: ChamadoKanban[];
  }
}

// Estrutura das colunas vazias
const colunasVazias: ColunasType = {
  abertos: { titulo: "Abertos", corDot: "bg-red-500", items: [] },
  em_atendimento: { titulo: "Em Atendimento", corDot: "bg-blue-500", items: [] },
  aguardando: { titulo: "Aguardando", corDot: "bg-amber-400", items: [] },
  resolvidos: { titulo: "Resolvidos", corDot: "bg-emerald-500", items: [] },
  fechados: { titulo: "Fechados", corDot: "bg-slate-500", items: [] }
}

export default function Dashboard() {
  const [colunas, setColunas] = useState<ColunasType>(colunasVazias);
  const [activeView, setActiveView] = useState<'kanban' | 'lista'>('kanban');
  const [sortBy, setSortBy] = useState<'prioridade' | 'recente' | 'antigo'>('prioridade');
  const [carregando, setCarregando] = useState(true);

  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const usuarioStorage = localStorage.getItem("usuarioLogado");
  const usuarioLogado = usuarioStorage ? JSON.parse(usuarioStorage) : null;

  const [chamadoSelecionado, setChamadoSelecionado] = useState<ChamadoKanban | null>(null);

  // Busca os dados reais do FastAPI quando a tela abre
  useEffect(() => {
    carregarChamados();
    carregarTecnicos();
  }, []);

  const carregarTecnicos = async () => {
    try {
      const response = await api.get('/usuarios/');
      
      // Verifica se a resposta realmente é um array antes de tentar filtrar
      if (Array.isArray(response.data)) {
        // Filtra garantindo que a comparação seja feita com letras minúsculas, 
        // caso alguém tenha cadastrado 'Admin' com 'A' maiúsculo sem querer.
        const listaTecnicos = response.data.filter((usuario: any) => {
           const perfilUser = usuario.perfil ? usuario.perfil.toLowerCase() : '';
           return perfilUser === 'admin' || perfilUser === 'tecnico';
        });
        
        setTecnicos(listaTecnicos);
      } else {
        console.error("A API não retornou uma lista válida de usuários.", response.data);
      }
    } catch (error) {
      console.error("Erro ao buscar técnicos:", error);
    }
  }

  const atribuirChamado = async (idChamado: string, idTecnico: number) => {

    if (!idTecnico) {
      alert("Erro: ID do técnico não encontrado. Verifique se o usuário existe.");
      return;

    }

    try {
      await api.patch(`/chamados/${idChamado}`, { id_tecnico: idTecnico });
      carregarChamados();
    } catch (error) {
      console.error("Erro ao atribuir chamado:", error);
    }
  }

  const carregarChamados = async () => {
    try {
      setCarregando(true);
      // Chama a rota do seu backend
      const response = await api.get('/chamados/');
      const chamadosDoBanco = response.data;

      // Cria uma cópia limpa das colunas
      const novasColunas = JSON.parse(JSON.stringify(colunasVazias));

      // Distribui cada chamado na sua coluna correta baseada no status
      chamadosDoBanco.forEach((chamado: any) => {
        // Formata a data que vem do banco (geralmente ISO) para DD/MM/YYYY
        const dataFormatada = chamado.data_abertura 
          ? new Date(chamado.data_abertura).toLocaleDateString('pt-BR') 
          : new Date().toLocaleDateString('pt-BR');

        const chamadoFormatado: ChamadoKanban = {
          id: chamado.id.toString(),
          titulo: chamado.titulo,
          prioridade: chamado.prioridade?.toLowerCase() || 'media',
          categoria: chamado.categoria || 'Geral',
          usuario_solicitante: formatarNome(chamado.solicitante_nome) || 'Usuário Sistema',
          data_abertura: dataFormatada,
          tecnico_responsavel: formatarNome(chamado.tecnico_nome) || undefined,
          descricao: chamado.descricao || 'Nenhuma descrição fornecida.'
        };

        // Mapeia o status do banco para as chaves das nossas colunas
        const statusBanco = chamado.status?.toLowerCase() || 'aberto';
        
        if (statusBanco.includes('atendimento') || statusBanco === 'em andamento') {
          novasColunas.em_atendimento.items.push(chamadoFormatado);
        } else if (statusBanco.includes('aguardando')) {
          novasColunas.aguardando.items.push(chamadoFormatado);
        } else if (statusBanco.includes('resolvido')) {
          novasColunas.resolvidos.items.push(chamadoFormatado);
        } else if (statusBanco.includes('fechado')) {
          novasColunas.fechados.items.push(chamadoFormatado);
        } else {
          novasColunas.abertos.items.push(chamadoFormatado);
        }
      });

      setColunas(novasColunas);
      // Força a ordenação inicial
      aplicarOrdenacao(novasColunas, sortBy);

    } catch (error) {
      console.error("Erro ao buscar dados reais do backend:", error);
      // Se der erro de conexão, mantém um aviso no console mas o quadro fica vazio
    } finally {
      setCarregando(false);
    }
  };

  // Função de Ordenação
  const aplicarOrdenacao = (estadoColunas: ColunasType, tipo: typeof sortBy) => {
    const novasColunas: ColunasType = JSON.parse(JSON.stringify(estadoColunas));

    const pesosPrioridade: Record<string, number> = { urgente: 4, alta: 3, media: 2, baixa: 1 };

    Object.keys(novasColunas).forEach(key => {
      novasColunas[key].items.sort((a, b) => {
        if (tipo === 'prioridade') {
          const prioA = String(a.prioridade || '').toLowerCase().trim();
          const prioB = String(b.prioridade || '').toLowerCase().trim();

          const pesoA = pesosPrioridade[prioA] || 0;
          const pesoB = pesosPrioridade[prioB] || 0;

          return pesoB - pesoA;
        } else {
          if (!a.data_abertura || !b.data_abertura) return 0;

          const [diaA, mesA, anoA] = a.data_abertura.split('/');
          const [diaB, mesB, anoB] = b.data_abertura.split('/');

          const dataA = new Date(Number(anoA), Number(mesA) - 1, Number(diaA)).getTime() || 0;
          const dataB = new Date(Number(anoB), Number(mesB) - 1, Number(diaB)).getTime() || 0;

          return tipo === 'recente' ? dataB - dataA : dataA - dataB;
        }
      });
    });

    setColunas(novasColunas);

  };

  const handleSort = (tipo: typeof sortBy) => {
    setSortBy(tipo);
    aplicarOrdenacao(colunas, tipo);
  };

  // Prepara dados para a lista
  const todosChamadosLista = Object.entries(colunas).flatMap(([, coluna]) => 
    coluna.items.map(item => ({
      ...item,
      status: coluna.titulo,
      corDot: coluna.corDot
    }))
  );

  const renderBadgePrioridade = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente': return <Badge className="bg-red-100 text-red-600 hover:bg-red-100 border-none font-medium">Urgente</Badge>
      case 'alta': return <Badge className="bg-orange-100 text-orange-600 hover:bg-orange-100 border-none font-medium">Alta</Badge>
      case 'media': return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none font-medium">Media</Badge>
      case 'baixa': return <Badge className="bg-blue-100 text-blue-600 hover:bg-blue-100 border-none font-medium">Baixa</Badge>
      default: return null;
    }
  }

  // Arrastar e Soltar AGORA SALVA NO BANCO!
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination } = result;

    if (source.droppableId !== destination.droppableId) {
      const sourceCol = colunas[source.droppableId];
      const destCol = colunas[destination.droppableId];
      const sourceItems = [...sourceCol.items];
      const destItems = [...destCol.items];
      
      const [removido] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, removido);
      
      // Atualiza a tela instantaneamente para não travar o visual
      setColunas({
        ...colunas,
        [source.droppableId]: { ...sourceCol, items: sourceItems },
        [destination.droppableId]: { ...destCol, items: destItems }
      });

      // Mapeia o ID da coluna para o Status do banco
      const mapStatusBanco: Record<string, string> = {
        abertos: 'Aberto',
        em_atendimento: 'Em Andamento',
        aguardando: 'Aguardando',
        resolvidos: 'Resolvido',
        fechados: 'Fechado'
      };

      // Manda a requisição PATCH para o seu backend
      try {
        await api.patch(`/chamados/${removido.id}`, { 
          status: mapStatusBanco[destination.droppableId] 
        });
        console.log(`Status do chamado ${removido.id} atualizado no banco!`);
      } catch (error) {
        console.error("Erro ao atualizar status no banco:", error);
        // Opcional: Se der erro, você pode reverter o card para a coluna anterior aqui
      }

    } else {
      const coluna = colunas[source.droppableId];
      const copiedItems = [...coluna.items];
      const [removido] = copiedItems.splice(source.index, 1);
      copiedItems.splice(destination.index, 0, removido);
      
      setColunas({
        ...colunas,
        [source.droppableId]: { ...coluna, items: copiedItems }
      });
    }
  };

  const textoBotaoOrdenacao = {
    prioridade: "Por Prioridade",
    recente: "Por Data (Mais Recente)",
    antigo: "Por Data (Mais Antigo)"
  };

  return (
      <main className="dashboard-main">
      <div className="dashboard-header">
        <div className="dashboard-title-wrap">
          <h2 className="dashboard-title">Dashboard</h2>
          <p className="dashboard-subtitle">Visão geral dos chamados do departamento de TI</p>
        </div>
        <div className="dashboard-toggle-wrap">
            <Button className={`dashboard-toggle-btn ${activeView === 'kanban' ? 'active' : 'inactive'}`} onClick={() => setActiveView('kanban')}>
              <GitPullRequest className="dashboard-toggle-icon" /> Kanban
            </Button>
            <Button className={`dashboard-toggle-btn ${activeView === 'lista' ? 'active' : 'inactive'}`} onClick={() => setActiveView('lista')}>
              <ArrowUpDown className="dashboard-toggle-icon" /> Lista
            </Button>
        </div>
      </div>

      <div className="kpi-grid">
        <Card className="kpi-card">
          <CardHeader className="kpi-header">
            <CardTitle className="kpi-title">Chamados Abertos</CardTitle>
            <AlertTriangle className="kpi-icon-red" />
          </CardHeader>
          <CardContent>
            <div className="kpi-value">{colunas.abertos.items.length}</div>
            <p className="kpi-desc">Aguardando atendimento</p>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardHeader className="kpi-header">
            <CardTitle className="kpi-title">Em Andamento</CardTitle>
            <GitPullRequest className="kpi-icon-blue" />
          </CardHeader>
          <CardContent>
            <div className="kpi-value">{colunas.em_atendimento.items.length}</div>
            <p className="kpi-desc">Sendo processados</p>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardHeader className="kpi-header">
            <CardTitle className="kpi-title">Aguardando</CardTitle>
            <Clock3 className="kpi-icon-amber" />
          </CardHeader>
          <CardContent>
            <div className="kpi-value">{colunas.aguardando.items.length}</div>
            <p className="kpi-desc">Pendentes de ação externa</p>
          </CardContent>
        </Card>
        <Card className="kpi-card">
          <CardHeader className="kpi-header">
            <CardTitle className="kpi-title">Resolvidos</CardTitle>
            <CheckCircle2 className="kpi-icon-green" />
          </CardHeader>
          <CardContent>
            <div className="kpi-value">{colunas.resolvidos.items.length}</div>
            <p className="kpi-desc">Finalizados com sucesso</p>
          </CardContent>
        </Card>
      </div>

      <div className="sort-wrap">
        <div className="sort-label-wrap">
          <ArrowUpDown className="sort-icon" />
          <span className="sort-label">Ordenar Chamados</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="sort-btn">
              {textoBotaoOrdenacao[sortBy]}
              <ArrowUpDown className="sort-btn-icon" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="sort-menu-content">
            <DropdownMenuItem onClick={() => handleSort('recente')} className="sort-menu-item">Por Data (Mais Recente)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort('antigo')} className="sort-menu-item">Por Data (Mais Antigo)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort('prioridade')} className="sort-menu-item">Por Prioridade</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {carregando ? (
        <div className="loading-screen">
          <div className="loading-content">
            <div className="loading-spinner" />
            <p className="loading-text">Sincronizando com o banco de dados...</p>
          </div>
        </div>
      ) : activeView === 'kanban' ? (
        <div className="kanban-wrapper">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="kanban-board">
              {Object.entries(colunas).map(([idColuna, coluna]) => (
                <div key={idColuna} className="kanban-column">
                  <div className="kanban-col-header">
                    <div className="kanban-col-title-wrap">
                      <div className={`kanban-col-dot ${coluna.corDot}`} />
                      <h2 className="kanban-col-title">{coluna.titulo}</h2>
                    </div>
                    <Badge variant="secondary" className="kanban-col-badge">{coluna.items.length}</Badge>
                  </div>

                  <Droppable droppableId={idColuna}>
                    {(provided, snapshot) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className={`kanban-dropzone ${snapshot.isDraggingOver ? 'active' : ''}`}>
                        {coluna.items.map((chamado, index) => (
                          <Draggable key={chamado.id} draggableId={chamado.id} index={index}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef} 
                                {...provided.draggableProps} 
                                {...provided.dragHandleProps} 
                                className={`kanban-card cursor-pointer hover:border-blue-300 transition-colors ${snapshot.isDragging ? 'dragging' : ''}`} 
                                style={{...provided.draggableProps.style}}
                                onClick={() => setChamadoSelecionado(chamado)}
                              >
                                <div className="kanban-card-header">
                                  <h3 className="kanban-card-title">{chamado.titulo}</h3>
                                  <span className="kanban-card-id">#{chamado.id}</span>
                                </div>
                                <div className="kanban-card-badges">
                                  {renderBadgePrioridade(chamado.prioridade)}
                                  <Badge variant="outline" className="kanban-card-category">{chamado.categoria}</Badge>
                                </div>
                                <div className="kanban-card-info">
                                  <div className="kanban-card-info-item"><User className="kanban-card-info-icon" />{chamado.usuario_solicitante}</div>
                                  <div className="kanban-card-info-item"><CalendarDays className="kanban-card-info-icon" />{chamado.data_abertura}</div>
                                </div>
                                <div className="kanban-card-footer flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                                  {chamado.tecnico_responsavel && chamado.tecnico_responsavel !== "Técnico não atribuído" ? (
                                    <>
                                      <div className="kanban-card-tech-wrap">Técnico: <br /><span className="kanban-card-tech-name">{chamado.tecnico_responsavel}</span></div>
                                      
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" className="h-8 w-8 p-0">
                                            <ChevronDown className="h-4 w-4 text-slate-400 hover:text-slate-700" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <div className="px-2 py-1 text-xs font-semibold text-slate-500">Transferir para:</div>
                                          {tecnicos.map(t => (
                                            <DropdownMenuItem key={t.id} onClick={() => atribuirChamado(chamado.id, t.id)} className="cursor-pointer">
                                              {formatarNome(t.nome)}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </>
                                  ) : (
                                    <div className="flex gap-2 w-full">
                                      <Button 
                                        className="kanban-card-btn flex-1" 
                                        onClick={() => atribuirChamado(chamado.id, usuarioLogado?.id)}
                                      >
                                        <UserPlus className="kanban-card-btn-icon" /> Atribuir a mim
                                      </Button>
                                      
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="outline" className="h-8 px-2 border-slate-200">
                                            <ChevronDown className="h-4 w-4 text-slate-500" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <div className="px-2 py-1 text-xs font-semibold text-slate-500">Atribuir para:</div>
                                          {tecnicos.map(t => (
                                            <DropdownMenuItem key={t.id} onClick={() => atribuirChamado(chamado.id, t.id)} className="cursor-pointer">
                                              {formatarNome(t.nome)}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>
      ) : (
        <div className="list-wrapper">
          <div className="list-table-container">
            <Table>
              <TableHeader className="list-table-header">
                <TableRow>
                  <TableHead className="list-th-id">ID</TableHead>
                  <TableHead className="list-th">Título do Chamado</TableHead>
                  <TableHead className="list-th">Status</TableHead>
                  <TableHead className="list-th">Prioridade</TableHead>
                  <TableHead className="list-th">Solicitante</TableHead>
                  <TableHead className="list-th-right">Abertura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todosChamadosLista.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="list-empty-cell">Nenhum chamado no banco de dados.</TableCell></TableRow>
                ) : (
                  todosChamadosLista.map((chamado) => (
                    <TableRow key={chamado.id} className="list-row">
                      <TableCell className="list-td-id">#{chamado.id}</TableCell>
                      <TableCell><div className="list-td-title">{chamado.titulo}</div><div className="list-td-category">{chamado.categoria}</div></TableCell>
                      <TableCell><div className="list-td-status-wrap"><div className={`list-td-status-dot ${chamado.corDot}`} /><span className="list-td-status-text">{chamado.status}</span></div></TableCell>
                      <TableCell>{renderBadgePrioridade(chamado.prioridade)}</TableCell>
                      <TableCell><div className="list-td-user-wrap"><Avatar className="list-td-avatar"><AvatarFallback className="list-td-avatar-fallback">{chamado.usuario_solicitante.charAt(0).toUpperCase()}</AvatarFallback></Avatar><span className="list-td-user-name">{chamado.usuario_solicitante}</span></div></TableCell>
                      <TableCell className="list-td-date">{chamado.data_abertura}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      {chamadoSelecionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setChamadoSelecionado(null)}>
          <Card className="w-full max-w-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 border-0" onClick={(e) => e.stopPropagation()}>
            
            <Button
              variant="ghost"
              className="absolute top-4 right-4 h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-500"
              onClick={() => setChamadoSelecionado(null)}
            >
              <X className="h-5 w-5" />
            </Button>

            <CardHeader className="bg-slate-50 rounded-t-xl border-b border-slate-100 pb-5 pt-6">
              <div className="flex items-center gap-2 mb-2">
                 <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 font-bold">
                   #{chamadoSelecionado.id}
                 </Badge>
                 {renderBadgePrioridade(chamadoSelecionado.prioridade)}
                 <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none font-medium">
                   {chamadoSelecionado.categoria}
                 </Badge>
              </div>
              <CardTitle className="text-2xl text-slate-800 font-bold leading-tight pr-8">
                {chamadoSelecionado.titulo}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-slate-400" /> 
                  Descrição do Problema
                </h4>
                <div className="bg-white p-4 rounded-lg text-slate-700 text-sm border border-slate-200 whitespace-pre-wrap leading-relaxed shadow-sm">
                  {chamadoSelecionado.descricao}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Solicitante</h4>
                   <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                     <User className="h-4 w-4 text-slate-400" />
                     {chamadoSelecionado.usuario_solicitante}
                   </p>
                </div>
                <div>
                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Técnico Responsável</h4>
                   <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                     <GitPullRequest className="h-4 w-4 text-slate-400" />
                     {chamadoSelecionado.tecnico_responsavel || 'Não atribuído'}
                   </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
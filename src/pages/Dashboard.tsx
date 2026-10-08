import { useState, useEffect, useCallback, useRef } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { useSincronizacaoChamados } from "@/hooks/useSincronizacaoChamados"
import { api } from "@/services/api" // Nossa conexão com o FastAPI
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import "./Dashboard.css"
import ModalChamado from "@/components/ModalChamado"
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
import { ArrowUpDown, AlertTriangle, GitPullRequest, Clock3, CheckCircle2, User, CalendarDays, Play, Loader2, WifiOff } from "lucide-react"
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
  id_tecnico?: number | null;
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
  resolvidos: { titulo: "Resolvidos", corDot: "bg-emerald-500", items: [] }
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
  const fecharModal = useCallback(() => setChamadoSelecionado(null), []);

  // Atualização automática: o que outra pessoa fizer aparece sem recarregar a página
  const arrastando = useRef(false);
  const atualizacaoPendente = useRef(false);
  const [versaoDados, setVersaoDados] = useState(0);

  const { ultimaSincronizacao, conectado } = useSincronizacaoChamados(() => {
    // Não mexe no quadro no meio de um "arrastar e soltar"
    if (arrastando.current) {
      atualizacaoPendente.current = true;
      return;
    }
    carregarChamados(true);
    setVersaoDados((v) => v + 1);
  });

  // Busca os dados reais do FastAPI quando a tela abre
  useEffect(() => {
    carregarChamados();
    carregarTecnicos();
  }, []);

  // Quando o sino avisa de um chamado novo, atualiza na hora
  useEffect(() => {
    const aoChegarChamado = () => {
      if (!arrastando.current) carregarChamados(true);
    };
    window.addEventListener("novo-chamado", aoChegarChamado);
    return () => window.removeEventListener("novo-chamado", aoChegarChamado);
  }, [sortBy]);

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

  // "Iniciar chamado": quem clicou assume o chamado e ele vai para Em Atendimento
  const [iniciando, setIniciando] = useState<string | null>(null);

  const iniciarChamado = async (idChamado: string) => {
    if (!usuarioLogado?.id) {
      alert("Erro: usuário não identificado. Faça login novamente.");
      return;
    }

    setIniciando(idChamado);
    try {
      await api.patch(`/chamados/${idChamado}`, { id_tecnico: usuarioLogado.id });
      await carregarChamados(true);
    } catch (error) {
      console.error("Erro ao iniciar chamado:", error);
      alert("Não foi possível iniciar o chamado. Tente novamente.");
    } finally {
      setIniciando(null);
    }
  }

   const carregarChamados = async (silencioso = false) => {
    try {
      if (!silencioso) setCarregando(true);
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
          // Sem técnico: deixa vazio para mostrar o botão "Atribuir a mim"
          tecnico_responsavel: chamado.id_tecnico ? formatarNome(chamado.tecnico_nome) : undefined,
          id_tecnico: chamado.id_tecnico ?? null,
          status: chamado.status || 'Aberto',
          descricao: chamado.descricao || 'Nenhuma descrição fornecida.'
        };

        // Mapeia o status do banco para as chaves das nossas colunas
        const statusBanco = chamado.status?.toLowerCase() || 'aberto';
        
        if (statusBanco.includes('atendimento') || statusBanco === 'em andamento') {
          novasColunas.em_atendimento.items.push(chamadoFormatado);
        } else if (statusBanco.includes('aguardando')) {
          novasColunas.aguardando.items.push(chamadoFormatado);
        } else if (statusBanco.includes('resolvido') || statusBanco.includes('fechado')) {
          // "Fechado" não existe mais: chamados antigos com esse status aparecem em Resolvidos
          novasColunas.resolvidos.items.push(chamadoFormatado);
        } else {
          novasColunas.abertos.items.push(chamadoFormatado);
        }
      });

      setColunas(novasColunas);
      // Força a ordenação inicial
      aplicarOrdenacao(novasColunas, sortBy);

      // Se um chamado estiver aberto no modal, atualiza os dados dele também
      const todos: ChamadoKanban[] = Object.values(novasColunas as ColunasType).flatMap((c) => c.items);
      setChamadoSelecionado((atual) => (atual ? todos.find((c) => c.id === atual.id) ?? atual : atual));

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
  const onDragStart = () => {
    arrastando.current = true;
  };

  const onDragEnd = async (result: DropResult) => {
    arrastando.current = false;
    // Se chegou alguma mudança de outra pessoa durante o arraste, aplica agora
    if (atualizacaoPendente.current) {
      atualizacaoPendente.current = false;
      setTimeout(() => carregarChamados(true), 800);
    }
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
        resolvidos: 'Resolvido'
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
          {conectado ? (
            <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
              title="O quadro se atualiza sozinho quando alguém faz uma alteração">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Ao vivo
              {ultimaSincronizacao && (
                <span className="text-emerald-600/70">
                  · {ultimaSincronizacao.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </span>
          ) : (
            <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              <WifiOff className="h-3 w-3" /> Sem conexão · tentando novamente
            </span>
          )}
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
          <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
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
                                  {chamado.tecnico_responsavel ? (
                                    <div className="kanban-card-tech-wrap">Técnico: <br /><span className="kanban-card-tech-name">{chamado.tecnico_responsavel}</span></div>
                                  ) : (
                                    <Button
                                      className="kanban-card-btn w-full bg-emerald-600 hover:bg-emerald-700"
                                      disabled={iniciando === chamado.id}
                                      onClick={() => iniciarChamado(chamado.id)}
                                    >
                                      {iniciando === chamado.id
                                        ? <Loader2 className="kanban-card-btn-icon animate-spin" />
                                        : <Play className="kanban-card-btn-icon" />}
                                      {iniciando === chamado.id ? "Iniciando..." : "Iniciar chamado"}
                                    </Button>
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
                    <TableRow key={chamado.id} className="list-row cursor-pointer" onClick={() => setChamadoSelecionado(chamado)}>
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
        <ModalChamado
          chamado={chamadoSelecionado}
          tecnicos={tecnicos}
          versaoDados={versaoDados}
          onFechar={fecharModal}
          onSalvo={(atualizado) => {
            setChamadoSelecionado({ ...chamadoSelecionado, ...atualizado } as ChamadoKanban);
            carregarChamados(true);
          }}
        />
      )}
    </main>
  )
}
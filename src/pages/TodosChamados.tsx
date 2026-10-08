import { useState, useEffect, useMemo, useCallback } from "react"
import { api } from "@/services/api"
import { useSincronizacaoChamados } from "@/hooks/useSincronizacaoChamados"
import ModalChamado, { type ChamadoModal } from "@/components/ModalChamado"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, Calendar, User, Wrench, X, SearchX } from "lucide-react"
import { formatarNome } from "@/lib/utils"
import "./TodosChamados.css"

interface Chamado {
  id: number
  titulo: string
  descricao?: string
  status: string
  prioridade: string
  categoria: string
  solicitante_nome: string
  tecnico_nome?: string
  id_tecnico?: number | null
  data_abertura: string
}

// Mesmas cores das colunas do Dashboard
const STATUS = {
  aberto: { rotulo: "Aberto", barra: "bg-red-500", badge: "bg-red-100 text-red-700 border-red-200", ponto: "bg-red-500" },
  andamento: { rotulo: "Em Atendimento", barra: "bg-blue-500", badge: "bg-blue-100 text-blue-700 border-blue-200", ponto: "bg-blue-500" },
  aguardando: { rotulo: "Aguardando", barra: "bg-amber-400", badge: "bg-amber-100 text-amber-700 border-amber-200", ponto: "bg-amber-400" },
  resolvido: { rotulo: "Resolvido", barra: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", ponto: "bg-emerald-500" },
} as const

type ChaveStatus = keyof typeof STATUS

function chaveStatus(status?: string): ChaveStatus {
  const s = (status || "aberto").toLowerCase()
  if (s.includes("andamento") || s.includes("atendimento")) return "andamento"
  if (s.includes("aguardando")) return "aguardando"
  if (s.includes("resolvid") || s.includes("fechad")) return "resolvido"
  return "aberto"
}

const PRIORIDADES: Record<string, { rotulo: string; classe: string; peso: number }> = {
  urgente: { rotulo: "Urgente", classe: "bg-red-100 text-red-600", peso: 4 },
  alta: { rotulo: "Alta", classe: "bg-orange-100 text-orange-600", peso: 3 },
  media: { rotulo: "Média", classe: "bg-yellow-100 text-yellow-700", peso: 2 },
  baixa: { rotulo: "Baixa", classe: "bg-blue-100 text-blue-600", peso: 1 },
}

const normalizar = (t: unknown) =>
  String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

export default function TodosChamados() {
  const [chamados, setChamados] = useState<Chamado[]>([])
  const [tecnicos, setTecnicos] = useState<{ id: number; nome: string }[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<"todos" | ChaveStatus>("todos")
  const [prioridadeFiltro, setPrioridadeFiltro] = useState("todas")
  const [selecionado, setSelecionado] = useState<ChamadoModal | null>(null)
  const [versaoDados, setVersaoDados] = useState(0)

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get<Chamado[]>("/chamados/")
      setChamados(data)
    } catch {
      // mantém a lista atual em caso de falha
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
    api
      .get("/usuarios/")
      .then(({ data }) =>
        setTecnicos(
          (Array.isArray(data) ? data : []).filter((u: any) =>
            ["admin", "tecnico"].includes((u.perfil || "").toLowerCase())
          )
        )
      )
      .catch(() => {})
    // Atualiza na hora quando o sino avisa de um chamado novo
    window.addEventListener("novo-chamado", carregar)
    return () => window.removeEventListener("novo-chamado", carregar)
  }, [carregar])

  // Atualiza sozinha quando alguém altera qualquer chamado
  useSincronizacaoChamados(() => {
    carregar()
    setVersaoDados((v) => v + 1)
  })

  // Contagem por situação (mostrada nos botões de filtro)
  const contagem = useMemo(() => {
    const c: Record<string, number> = { todos: chamados.length, aberto: 0, andamento: 0, aguardando: 0, resolvido: 0 }
    chamados.forEach((ch) => c[chaveStatus(ch.status)]++)
    return c
  }, [chamados])

  const chamadosFiltrados = useMemo(() => {
    const termo = normalizar(busca)
    return chamados
      .filter((c) => {
        const bateBusca =
          !termo ||
          normalizar(c.titulo).includes(termo) ||
          String(c.id).includes(termo) ||
          normalizar(c.solicitante_nome).includes(termo) ||
          normalizar(c.tecnico_nome).includes(termo)
        const bateStatus = statusFiltro === "todos" || chaveStatus(c.status) === statusFiltro
        const batePrioridade = prioridadeFiltro === "todas" || (c.prioridade || "").toLowerCase() === prioridadeFiltro
        return bateBusca && bateStatus && batePrioridade
      })
      .sort((a, b) => new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime())
  }, [chamados, busca, statusFiltro, prioridadeFiltro])

  const abrirChamado = (c: Chamado) =>
    setSelecionado({
      id: String(c.id),
      titulo: c.titulo,
      prioridade: (c.prioridade || "media").toLowerCase(),
      categoria: c.categoria || "Geral",
      usuario_solicitante: formatarNome(c.solicitante_nome),
      descricao: c.descricao || "Nenhuma descrição fornecida.",
      status: c.status,
      id_tecnico: c.id_tecnico ?? null,
      tecnico_responsavel: c.id_tecnico ? formatarNome(c.tecnico_nome || "") : undefined,
    })

  // Mantém o modal aberto com os dados mais recentes
  useEffect(() => {
    if (!selecionado) return
    const atual = chamados.find((c) => String(c.id) === selecionado.id)
    if (atual && (atual.status !== selecionado.status || (atual.id_tecnico ?? null) !== (selecionado.id_tecnico ?? null) || (atual.prioridade || "").toLowerCase() !== selecionado.prioridade)) {
      abrirChamado(atual)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chamados])

  const fecharModal = useCallback(() => setSelecionado(null), [])
  const temFiltro = busca !== "" || statusFiltro !== "todos" || prioridadeFiltro !== "todas"

  const BOTOES_STATUS: { valor: "todos" | ChaveStatus; rotulo: string; ponto?: string }[] = [
    { valor: "todos", rotulo: "Todos" },
    { valor: "aberto", rotulo: "Abertos", ponto: STATUS.aberto.ponto },
    { valor: "andamento", rotulo: "Em Atendimento", ponto: STATUS.andamento.ponto },
    { valor: "aguardando", rotulo: "Aguardando", ponto: STATUS.aguardando.ponto },
    { valor: "resolvido", rotulo: "Resolvidos", ponto: STATUS.resolvido.ponto },
  ]

  return (
    <main className="tc-main">
      <div className="tc-container">
        <div className="tc-header">
          <h2 className="tc-title">Todos os Chamados</h2>
          <p className="tc-subtitle">Visualize e gerencie todos os chamados de suporte</p>
        </div>

        <Card className="tc-filter-card">
          <CardContent className="tc-filter-content space-y-4">
            <div className="tc-filter-title-wrap">
              <Filter className="tc-filter-icon" />
              <span>Filtros</span>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por título, número, solicitante ou técnico..."
                  className="bg-white pl-9 pr-9"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                {busca && (
                  <button type="button" onClick={() => setBusca("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                    aria-label="Limpar busca">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Select value={prioridadeFiltro} onValueChange={setPrioridadeFiltro}>
                <SelectTrigger className="bg-white md:w-56"><SelectValue placeholder="Todas as Prioridades" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Prioridades</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por situação, com as cores do Dashboard */}
            <div className="flex flex-wrap items-center gap-2">
              {BOTOES_STATUS.map((b) => {
                const ativo = statusFiltro === b.valor
                return (
                  <button
                    key={b.valor}
                    type="button"
                    onClick={() => setStatusFiltro(b.valor)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      ativo
                        ? "border-slate-800 bg-slate-800 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {b.ponto && <span className={`h-2 w-2 rounded-full ${b.ponto}`} />}
                    {b.rotulo}
                    <span className={`rounded-full px-1.5 text-[10px] ${ativo ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                      {contagem[b.valor] ?? 0}
                    </span>
                  </button>
                )
              })}
              {temFiltro && (
                <button type="button"
                  onClick={() => { setBusca(""); setStatusFiltro("todos"); setPrioridadeFiltro("todas") }}
                  className="ml-auto text-xs font-semibold text-blue-600 hover:text-blue-800">
                  Limpar filtros
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="tc-list-wrap">
          <h3 className="tc-list-title">Chamados ({chamadosFiltrados.length})</h3>

          {carregando && (
            <p className="py-10 text-center text-sm text-slate-400">Carregando chamados...</p>
          )}

          {!carregando && chamadosFiltrados.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center">
              <SearchX className="h-8 w-8 text-slate-300" />
              <p className="font-medium text-slate-600">Nenhum chamado encontrado</p>
              <p className="text-sm text-slate-400">Tente outro termo ou limpe os filtros.</p>
            </div>
          )}

          {chamadosFiltrados.map((chamado) => {
            const st = STATUS[chaveStatus(chamado.status)]
            const prio = PRIORIDADES[(chamado.prioridade || "media").toLowerCase()] ?? PRIORIDADES.media
            const data = new Date(chamado.data_abertura)
            return (
              <Card
                key={chamado.id}
                onClick={() => abrirChamado(chamado)}
                className="tc-card relative cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Faixa colorida da situação */}
                <span className={`absolute inset-y-0 left-0 w-1.5 ${st.barra}`} />
                <CardContent className="tc-card-content" style={{ paddingLeft: "1.75rem" }}>
                  <div className="tc-card-info">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-400">#{chamado.id}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold ${st.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.ponto}`} />
                        {st.rotulo}
                      </span>
                      <span className={`rounded px-2 py-0.5 font-semibold ${prio.classe}`}>{prio.rotulo}</span>
                      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                        {chamado.categoria || "Geral"}
                      </span>
                    </div>

                    <h4 className="tc-card-title">{chamado.titulo}</h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {formatarNome(chamado.solicitante_nome)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5" />
                        {chamado.id_tecnico ? formatarNome(chamado.tecnico_nome || "") : <i className="text-slate-400">Sem técnico</i>}
                      </span>
                    </div>
                  </div>

                  <div className="tc-card-meta">
                    <div className="tc-card-date-wrap">
                      <Calendar className="tc-card-date-icon" />
                      <span>{isNaN(data.getTime()) ? "-" : data.toLocaleDateString("pt-BR")}</span>
                    </div>
                    <span className="tc-card-time">
                      {isNaN(data.getTime()) ? "" : data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {selecionado && (
        <ModalChamado
          chamado={selecionado}
          tecnicos={tecnicos}
          versaoDados={versaoDados}
          onFechar={fecharModal}
          onSalvo={(atualizado) => {
            setSelecionado(atualizado)
            carregar()
          }}
        />
      )}
    </main>
  )
}

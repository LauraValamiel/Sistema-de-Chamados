import { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  CalendarDays, CheckCircle2, ChevronDown, CircleDot, Clock3, Inbox, Loader2, Plus, Wrench, X,
} from "lucide-react"
import { formatarNome } from "@/lib/utils"

interface MeuChamado {
  id: number
  titulo: string
  descricao: string
  status: string
  prioridade: string
  data_abertura: string
  ultima_atualizacao: string
  tecnico_nome: string | null
}

interface Andamento {
  id: number
  texto: string
  tipo: "nota" | "sistema"
  criado_em: string
  autor_nome: string
}

const ATUALIZAR_A_CADA_MS = 30_000

// Mesmas cores do Dashboard
const STATUS = {
  aberto: { rotulo: "Aberto", barra: "bg-red-500", badge: "bg-red-100 text-red-700 border-red-200", passo: 0,
    explicacao: "Recebemos o seu chamado. Em breve um técnico vai iniciar o atendimento." },
  andamento: { rotulo: "Em Atendimento", barra: "bg-blue-500", badge: "bg-blue-100 text-blue-700 border-blue-200", passo: 1,
    explicacao: "Um técnico está trabalhando no seu chamado." },
  aguardando: { rotulo: "Aguardando", barra: "bg-amber-400", badge: "bg-amber-100 text-amber-700 border-amber-200", passo: 1,
    explicacao: "O atendimento está aguardando alguma ação (peça, retorno ou informação)." },
  resolvido: { rotulo: "Resolvido", barra: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", passo: 2,
    explicacao: "Seu chamado foi resolvido. Se o problema voltar, abra um novo chamado." },
} as const

type ChaveStatus = keyof typeof STATUS

function chaveStatus(status?: string): ChaveStatus {
  const s = (status || "aberto").toLowerCase()
  if (s.includes("andamento") || s.includes("atendimento")) return "andamento"
  if (s.includes("aguardando")) return "aguardando"
  if (s.includes("resolvid") || s.includes("fechad")) return "resolvido"
  return "aberto"
}

const PRIORIDADES: Record<string, { rotulo: string; classe: string }> = {
  urgente: { rotulo: "Urgente", classe: "bg-red-100 text-red-600" },
  alta: { rotulo: "Alta", classe: "bg-orange-100 text-orange-600" },
  media: { rotulo: "Média", classe: "bg-yellow-100 text-yellow-700" },
  baixa: { rotulo: "Baixa", classe: "bg-blue-100 text-blue-600" },
}

function dataHora(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function tempoRelativo(iso: string) {
  const seg = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seg < 60) return "agora mesmo"
  const min = Math.floor(seg / 60)
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? "ontem" : `há ${d} dias`
}

/* ---------- Barra de progresso: Aberto → Em Atendimento → Resolvido ---------- */
function Progresso({ chave }: { chave: ChaveStatus }) {
  const atual = STATUS[chave].passo
  const passos = ["Aberto", chave === "aguardando" ? "Aguardando" : "Em Atendimento", "Resolvido"]
  return (
    <div className="flex items-center">
      {passos.map((rotulo, i) => {
        const feito = i < atual || (i === atual && chave === "resolvido")
        const ativo = i === atual && chave !== "resolvido"
        const cor = feito
          ? "bg-emerald-500 border-emerald-500 text-white"
          : ativo
            ? chave === "aguardando"
              ? "bg-amber-400 border-amber-400 text-white"
              : chave === "aberto"
                ? "bg-red-500 border-red-500 text-white"
                : "bg-blue-500 border-blue-500 text-white"
            : "bg-white border-slate-300 text-slate-400"
        return (
          <div key={rotulo} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${cor} ${ativo ? "ring-4 ring-offset-0 ring-slate-100" : ""}`}>
                {feito ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`whitespace-nowrap text-[11px] font-medium ${feito || ativo ? "text-slate-700" : "text-slate-400"}`}>{rotulo}</span>
            </div>
            {i < passos.length - 1 && (
              <div className={`mx-2 mb-5 h-0.5 flex-1 rounded ${i < atual ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Evolução (histórico) de um chamado ---------- */
function Evolucao({ chamadoId, versao }: { chamadoId: number; versao: number }) {
  const [andamentos, setAndamentos] = useState<Andamento[] | null>(null)

  useEffect(() => {
    api.get<Andamento[]>(`/chamados/${chamadoId}/andamentos`)
      .then(({ data }) => setAndamentos(data))
      .catch(() => setAndamentos([]))
  }, [chamadoId, versao])

  if (andamentos === null) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando evolução...
      </div>
    )
  }

  if (andamentos.length === 0) {
    return <p className="py-3 text-sm text-slate-500">Ainda não há atualizações. Você será informado aqui assim que o atendimento começar.</p>
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
      {andamentos.map((a) => (
        <li key={a.id} className="relative">
          <span className={`absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${a.tipo === "nota" ? "bg-blue-500" : "bg-slate-300"}`}>
            {a.tipo === "sistema" && <CircleDot className="h-3 w-3 text-white" />}
          </span>
          {a.tipo === "nota" ? (
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-semibold text-slate-800">{formatarNome(a.autor_nome)} <span className="font-normal text-slate-500">(equipe de TI)</span></p>
                <p className="text-[11px] text-slate-400">{dataHora(a.criado_em)}</p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{a.texto}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              {a.texto} <span className="text-xs text-slate-400">· {dataHora(a.criado_em)}</span>
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}

export default function MeusChamados() {
  const navigate = useNavigate()
  const location = useLocation()
  const [chamados, setChamados] = useState<MeuChamado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aberto, setAberto] = useState<number | null>(null)
  const [versao, setVersao] = useState(0)
  const [filtro, setFiltro] = useState<"todos" | "andamento" | "resolvido">("todos")
  const [avisoCriado, setAvisoCriado] = useState(Boolean((location.state as any)?.chamadoCriado))

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get<MeuChamado[]>("/chamados/meus")
      setChamados(data)
      setVersao((v) => v + 1)
    } catch {
      // mantém a lista atual
    } finally {
      setCarregando(false)
    }
  }, [])

  // Carrega ao abrir e atualiza sozinho a cada 30 s (só com a aba visível)
  useEffect(() => {
    carregar()
    const id = setInterval(() => {
      if (!document.hidden) carregar()
    }, ATUALIZAR_A_CADA_MS)
    const aoVoltar = () => {
      if (!document.hidden) carregar()
    }
    document.addEventListener("visibilitychange", aoVoltar)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", aoVoltar)
    }
  }, [carregar])

  // Ao chegar de "Novo Chamado", já abre a evolução do chamado mais recente
  useEffect(() => {
    if (avisoCriado && chamados.length > 0 && aberto === null) setAberto(chamados[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chamados])

  const emAndamento = chamados.filter((c) => chaveStatus(c.status) !== "resolvido")
  const resolvidos = chamados.filter((c) => chaveStatus(c.status) === "resolvido")
  const lista = filtro === "todos" ? chamados : filtro === "resolvido" ? resolvidos : emAndamento

  const FILTROS = [
    { valor: "todos" as const, rotulo: "Todos", qtd: chamados.length },
    { valor: "andamento" as const, rotulo: "Em aberto", qtd: emAndamento.length },
    { valor: "resolvido" as const, rotulo: "Resolvidos", qtd: resolvidos.length },
  ]

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Meus Chamados</h2>
          <p className="mt-1 text-slate-500">Acompanhe a evolução dos chamados que você abriu.</p>
        </div>
        <Button onClick={() => navigate("/novo-chamado")} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Novo chamado
        </Button>
      </div>

      {avisoCriado && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Chamado aberto com sucesso!</p>
            <p>A equipe de TI já foi avisada. Acompanhe por aqui cada etapa do atendimento.</p>
          </div>
          <button type="button" onClick={() => setAvisoCriado(false)} className="text-emerald-700 hover:text-emerald-900" aria-label="Fechar aviso">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const ativo = filtro === f.valor
          return (
            <button key={f.valor} type="button" onClick={() => setFiltro(f.valor)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                ativo ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}>
              {f.rotulo}
              <span className={`rounded-full px-1.5 text-[10px] ${ativo ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{f.qtd}</span>
            </button>
          )
        })}
      </div>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando seus chamados...
        </div>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Inbox className="h-10 w-10 text-slate-300" />
          <div>
            <p className="font-medium text-slate-600">
              {chamados.length === 0 ? "Você ainda não abriu nenhum chamado." : "Nenhum chamado nesta situação."}
            </p>
            <p className="text-sm text-slate-400">Quando precisar de ajuda da TI, é só abrir um chamado.</p>
          </div>
          {chamados.length === 0 && (
            <Button onClick={() => navigate("/novo-chamado")} className="mt-1 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Abrir meu primeiro chamado
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {lista.map((c) => {
            const chave = chaveStatus(c.status)
            const st = STATUS[chave]
            const prio = PRIORIDADES[(c.prioridade || "media").toLowerCase()] ?? PRIORIDADES.media
            const expandido = aberto === c.id
            return (
              <Card key={c.id} className="relative overflow-hidden border-slate-200 shadow-sm">
                <span className={`absolute inset-y-0 left-0 w-1.5 ${st.barra}`} />
                <CardContent className="space-y-4 p-5 pl-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-400">#{c.id}</span>
                        <span className={`rounded-full border px-2.5 py-0.5 font-semibold ${st.badge}`}>{st.rotulo}</span>
                        <span className={`rounded px-2 py-0.5 font-semibold ${prio.classe}`}>{prio.rotulo}</span>
                      </div>
                      <h3 className="text-lg font-semibold leading-snug text-slate-800">{c.titulo}</h3>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Aberto em {dataHora(c.data_abertura)}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Atualizado {tempoRelativo(c.ultima_atualizacao)}</p>
                    </div>
                  </div>

                  <Progresso chave={chave} />

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                    <p className="text-sm text-slate-600">{st.explicacao}</p>
                    <p className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                      <Wrench className="h-4 w-4 text-slate-400" />
                      {c.tecnico_nome ? <>Técnico: <b className="text-slate-800">{c.tecnico_nome}</b></> : <i className="text-slate-400">Aguardando um técnico</i>}
                    </p>
                  </div>

                  <button type="button" onClick={() => setAberto(expandido ? null : c.id)}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800">
                    {expandido ? "Ocultar detalhes" : "Ver descrição e evolução"}
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandido ? "rotate-180" : ""}`} />
                  </button>

                  {expandido && (
                    <div className="space-y-4 border-t border-slate-100 pt-4">
                      <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Descrição</p>
                        <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{c.descricao}</p>
                      </div>
                      <div>
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Evolução do atendimento</p>
                        <Evolucao chamadoId={c.id} versao={versao} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}

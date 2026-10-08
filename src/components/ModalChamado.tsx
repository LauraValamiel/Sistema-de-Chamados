import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertTriangle, CheckCircle2, CircleDot, GitPullRequest, History, Info, Loader2, Lock, MessageSquarePlus,
  Save, Send, User, X,
} from "lucide-react"
import { formatarNome } from "@/lib/utils"

export interface ChamadoModal {
  id: string
  titulo: string
  prioridade: string
  categoria: string
  usuario_solicitante: string
  descricao?: string
  status?: string
  id_tecnico?: number | null
  tecnico_responsavel?: string
}

interface Andamento {
  id: number
  texto: string
  tipo: "nota" | "sistema"
  criado_em: string
  autor_nome: string
  autor_perfil?: string
}

interface Props {
  chamado: ChamadoModal
  tecnicos: { id: number; nome: string }[]
  versaoDados?: number // muda quando alguém altera algo; recarrega o histórico
  onFechar: () => void
  onSalvo: (atualizado: ChamadoModal) => void
}

const PRIORIDADES = [
  { valor: "baixa", rotulo: "Baixa", cor: "bg-blue-500", badge: "bg-blue-100 text-blue-600" },
  { valor: "media", rotulo: "Média", cor: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700" },
  { valor: "alta", rotulo: "Alta", cor: "bg-orange-500", badge: "bg-orange-100 text-orange-600" },
  { valor: "urgente", rotulo: "Urgente", cor: "bg-red-500", badge: "bg-red-100 text-red-600" },
]

const SEM_TECNICO = "0"

// Converte qualquer forma de status ("aberto", "Em Andamento", "Em Atendimento"...) para exibição
function infoStatus(status?: string) {
  const s = (status || "aberto").toLowerCase()
  if (s.includes("andamento") || s.includes("atendimento"))
    return { rotulo: "Em Andamento", classe: "bg-blue-100 text-blue-700", finalizado: false, aberto: false }
  if (s.includes("aguardando"))
    return { rotulo: "Aguardando", classe: "bg-amber-100 text-amber-700", finalizado: false, aberto: false }
  // "Fechado" não existe mais: chamados antigos com esse status aparecem como Resolvido
  if (s.includes("resolvid") || s.includes("fechad"))
    return { rotulo: "Resolvido", classe: "bg-emerald-100 text-emerald-700", finalizado: true, aberto: false }
  return { rotulo: "Aberto", classe: "bg-red-100 text-red-700", finalizado: false, aberto: true }
}

function formatarDataHora(iso: string) {
  const data = new Date(iso)
  if (isNaN(data.getTime())) return ""
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function iniciais(nome: string) {
  const partes = (nome || "?").trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase()
}

export default function ModalChamado({ chamado, tecnicos, versaoDados = 0, onFechar, onSalvo }: Props) {
  const prioridadeOriginal = (chamado.prioridade || "media").toLowerCase()
  const tecnicoOriginal = chamado.id_tecnico ? String(chamado.id_tecnico) : SEM_TECNICO
  const status = infoStatus(chamado.status)

  const [prioridade, setPrioridade] = useState(prioridadeOriginal)
  const [tecnico, setTecnico] = useState(tecnicoOriginal)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null)

  // Andamento da solução
  const [andamentos, setAndamentos] = useState<Andamento[]>([])
  const [carregandoAndamentos, setCarregandoAndamentos] = useState(true)
  const [novoAndamento, setNovoAndamento] = useState("")
  const [enviandoAndamento, setEnviandoAndamento] = useState(false)
  const [erroAndamento, setErroAndamento] = useState("")
  const fimDaLista = useRef<HTMLDivElement>(null)

  const houveMudanca = prioridade !== prioridadeOriginal || tecnico !== tecnicoOriginal
  const infoPrioridade = PRIORIDADES.find((p) => p.valor === prioridadeOriginal) ?? PRIORIDADES[1]
  const vaiParaAtendimento = status.aberto && tecnico !== SEM_TECNICO && tecnico !== tecnicoOriginal

  // Fecha com a tecla Esc e trava a rolagem da página enquanto o modal está aberto
  useEffect(() => {
    const aoApertar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar()
    }
    document.addEventListener("keydown", aoApertar)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", aoApertar)
      document.body.style.overflow = overflowAnterior
    }
  }, [onFechar])

  // Se outro chamado for aberto, reinicia o formulário
  useEffect(() => {
    setPrioridade(prioridadeOriginal)
    setTecnico(tecnicoOriginal)
    setMensagem(null)
  }, [chamado.id, prioridadeOriginal, tecnicoOriginal])

  const carregarAndamentos = useCallback(async () => {
    try {
      const { data } = await api.get<Andamento[]>(`/chamados/${chamado.id}/andamentos`)
      setAndamentos(data)
    } catch {
      setAndamentos([])
    } finally {
      setCarregandoAndamentos(false)
    }
  }, [chamado.id])

  useEffect(() => {
    setCarregandoAndamentos(true)
    carregarAndamentos()
  }, [carregarAndamentos])

  // Outra pessoa alterou algo: atualiza o histórico sem piscar a tela
  useEffect(() => {
    if (versaoDados > 0) carregarAndamentos()
  }, [versaoDados, carregarAndamentos])

  const salvar = async () => {
    if (!houveMudanca) return
    setSalvando(true)
    setMensagem(null)

    const dados: Record<string, unknown> = {}
    if (prioridade !== prioridadeOriginal) dados.prioridade = prioridade
    if (tecnico !== tecnicoOriginal) dados.id_tecnico = Number(tecnico) // 0 = remover técnico

    try {
      const { data } = await api.patch(`/chamados/${chamado.id}`, dados)
      const tecnicoEscolhido = tecnicos.find((t) => String(t.id) === tecnico)
      onSalvo({
        ...chamado,
        prioridade: data.prioridade ?? prioridade,
        status: data.status ?? chamado.status,
        id_tecnico: data.id_tecnico ?? null,
        tecnico_responsavel: tecnicoEscolhido ? formatarNome(tecnicoEscolhido.nome) : undefined,
      })
      setMensagem({
        tipo: "ok",
        texto: vaiParaAtendimento
          ? "Técnico atribuído. O chamado foi movido para Em Atendimento."
          : "Alterações salvas com sucesso.",
      })
      carregarAndamentos()
    } catch (error: any) {
      const detalhe = error.response?.data?.detail
      setMensagem({
        tipo: "erro",
        texto: typeof detalhe === "string" ? detalhe : "Não foi possível salvar. Tente novamente.",
      })
    } finally {
      setSalvando(false)
    }
  }

  const registrarAndamento = async () => {
    const texto = novoAndamento.trim()
    if (!texto) return
    setEnviandoAndamento(true)
    setErroAndamento("")
    try {
      const { data } = await api.post<Andamento>(`/chamados/${chamado.id}/andamentos`, { texto })
      setAndamentos((atual) => [...atual, data])
      setNovoAndamento("")
      setTimeout(() => fimDaLista.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50)
    } catch (error: any) {
      const detalhe = error.response?.data?.detail
      setErroAndamento(typeof detalhe === "string" ? detalhe : "Não foi possível registrar. Tente novamente.")
    } finally {
      setEnviandoAndamento(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onFechar}
    >
      <Card
        className="relative w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto border-0 shadow-2xl notif-painel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <Button
          variant="ghost"
          className="absolute right-4 top-4 h-8 w-8 rounded-full p-0 text-slate-500 hover:bg-slate-100"
          onClick={onFechar}
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </Button>

        <CardHeader className="rounded-t-xl border-b border-slate-100 bg-slate-50 pb-5 pt-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-slate-200 bg-white font-bold text-slate-600">
              #{chamado.id}
            </Badge>
            <Badge className={`border-none font-medium ${status.classe}`}>{status.rotulo}</Badge>
            <Badge className={`border-none font-medium ${infoPrioridade.badge}`}>{infoPrioridade.rotulo}</Badge>
            <Badge className="border-none bg-blue-100 font-medium text-blue-700 hover:bg-blue-100">
              {chamado.categoria}
            </Badge>
          </div>
          <CardTitle className="pr-8 text-2xl font-bold leading-tight text-slate-800">{chamado.titulo}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Descrição */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
              <AlertTriangle className="h-4 w-4 text-slate-400" />
              Descrição do Problema
            </h4>
            <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
              {chamado.descricao}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 rounded-lg border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Solicitante</h4>
              <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <User className="h-4 w-4 text-slate-400" />
                {chamado.usuario_solicitante}
              </p>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Técnico Responsável</h4>
              <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <GitPullRequest className="h-4 w-4 text-slate-400" />
                {chamado.tecnico_responsavel || "Não atribuído"}
              </p>
            </div>
          </div>

          {/* Atualizar técnico e prioridade */}
          <div className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
            <h4 className="text-sm font-bold text-slate-800">Atualizar chamado</h4>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Técnico responsável</Label>
                <Select value={tecnico} onValueChange={setTecnico}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[300]">
                    <SelectItem value={SEM_TECNICO}>
                      <span className="text-slate-500">Não atribuído</span>
                    </SelectItem>
                    {tecnicos.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {formatarNome(t.nome)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Prioridade</Label>
                <Select value={prioridade} onValueChange={setPrioridade}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[300]">
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p.valor} value={p.valor}>
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${p.cor}`} />
                          {p.rotulo}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {vaiParaAtendimento && (
              <p className="flex items-center gap-2 text-xs text-blue-700">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Ao salvar, o chamado será movido automaticamente para <b>Em Atendimento</b>.
              </p>
            )}

            {mensagem && (
              <div
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  mensagem.tipo === "ok"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-red-200 bg-red-50 text-red-600"
                }`}
              >
                {mensagem.tipo === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {mensagem.texto}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={salvar}
                disabled={!houveMudanca || salvando}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {salvando ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>

          {/* Andamento da solução */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <History className="h-4 w-4 text-slate-400" />
              Andamento da solução
              {andamentos.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-500">
                  {andamentos.filter((a) => a.tipo === "nota").length}
                </span>
              )}
            </h4>

            <div className="rounded-lg border border-slate-200 bg-white">
              {carregandoAndamentos ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando histórico...
                </div>
              ) : andamentos.length === 0 ? (
                <div className="flex flex-col items-center gap-1 py-8 text-center">
                  <MessageSquarePlus className="h-7 w-7 text-slate-300" />
                  <p className="text-sm text-slate-500">Nenhum andamento registrado ainda.</p>
                  <p className="text-xs text-slate-400">Registre abaixo o que já foi feito para resolver o problema.</p>
                </div>
              ) : (
                <ol className="relative max-h-72 space-y-4 overflow-y-auto p-4">
                  {andamentos.map((a) =>
                    a.tipo === "sistema" ? (
                      <li key={a.id} className="flex items-start gap-3 pl-1">
                        <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                        <p className="text-xs text-slate-500">
                          {a.texto}{" "}
                          <span className="text-slate-400">
                            · {formatarNome(a.autor_nome)} · {formatarDataHora(a.criado_em)}
                          </span>
                        </p>
                      </li>
                    ) : (
                      <li key={a.id} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                          {iniciais(a.autor_nome)}
                        </div>
                        <div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <p className="text-sm font-semibold text-slate-800">{formatarNome(a.autor_nome)}</p>
                            <p className="text-[11px] text-slate-400">{formatarDataHora(a.criado_em)}</p>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{a.texto}</p>
                        </div>
                      </li>
                    )
                  )}
                  <div ref={fimDaLista} />
                </ol>
              )}
            </div>

            {status.finalizado ? (
              <p className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5" />
                Este chamado está {status.rotulo.toLowerCase()}. Para registrar novos andamentos, mova-o de volta para Em Atendimento.
              </p>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={novoAndamento}
                  onChange={(e) => setNovoAndamento(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) registrarAndamento()
                  }}
                  placeholder="Ex: Verifiquei os cabos e troquei a fonte. Aguardando o usuário testar..."
                  className="min-h-[90px] bg-white"
                  maxLength={2000}
                />
                {erroAndamento && <p className="text-xs font-medium text-red-600">{erroAndamento}</p>}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">Ctrl + Enter para registrar</span>
                  <Button
                    type="button"
                    onClick={registrarAndamento}
                    disabled={!novoAndamento.trim() || enviandoAndamento}
                    className="bg-slate-800 hover:bg-slate-900"
                  >
                    {enviandoAndamento ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Registrar andamento
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onFechar}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  )
}

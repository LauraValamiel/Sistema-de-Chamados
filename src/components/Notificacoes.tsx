import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, BellRing, CheckCheck, Trash2, X, Monitor } from "lucide-react"
import type { NotificacaoChamado } from "@/hooks/useNotificacoesChamados"

const corPrioridade: Record<string, string> = {
  urgente: "bg-red-100 text-red-700",
  alta: "bg-orange-100 text-orange-700",
  media: "bg-yellow-100 text-yellow-700",
  baixa: "bg-blue-100 text-blue-700",
}

function rotuloPrioridade(p: string) {
  const v = (p || "media").toLowerCase()
  return v === "media" ? "Média" : v.charAt(0).toUpperCase() + v.slice(1)
}

function tempoRelativo(iso: string) {
  const seg = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seg < 60) return "agora"
  const min = Math.floor(seg / 60)
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  return `há ${Math.floor(h / 24)} d`
}

function formatarNomeCurto(nome: string) {
  return (nome || "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((p) => (["da", "de", "do", "das", "dos", "e"].includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ")
}

/* ---------- Sino com lista de notificações ---------- */

interface SinoProps {
  notificacoes: NotificacaoChamado[]
  naoLidas: number
  permissao: NotificationPermission | "indisponivel"
  onMarcarLida: (id: number) => void
  onMarcarTodas: () => void
  onLimpar: () => void
  onPedirPermissao: () => void
}

export function SinoNotificacoes({
  notificacoes, naoLidas, permissao, onMarcarLida, onMarcarTodas, onLimpar, onPedirPermissao,
}: SinoProps) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", fora)
    return () => document.removeEventListener("mousedown", fora)
  }, [aberto])

  const abrirChamado = (id: number) => {
    onMarcarLida(id)
    setAberto(false)
    navigate("/dashboard")
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-white transition hover:bg-white/15"
        aria-label={`Notificações${naoLidas ? ` (${naoLidas} não lidas)` : ""}`}
        title="Notificações"
      >
        {naoLidas > 0 ? <BellRing className="h-4 w-4 sino-balanco" /> : <Bell className="h-4 w-4" />}
        {naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-blue-500">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="fixed left-3 right-3 top-14 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl notif-painel sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[360px]">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Notificações</p>
              <p className="text-xs text-slate-500">
                {naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? "s" : ""}` : "Tudo em dia"}
              </p>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={onMarcarTodas} disabled={naoLidas === 0}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"
                title="Marcar todas como lidas">
                <CheckCheck className="h-4 w-4" />
              </button>
              <button type="button" onClick={onLimpar} disabled={notificacoes.length === 0}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-red-600 disabled:opacity-40"
                title="Limpar notificações">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {permissao === "default" && (
            <button type="button" onClick={onPedirPermissao}
              className="flex w-full items-center gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3 text-left text-xs text-blue-800 hover:bg-blue-100">
              <Monitor className="h-4 w-4 shrink-0" />
              <span><b>Ativar avisos na área de trabalho</b><br />Receba alertas mesmo com o sistema em outra aba.</span>
            </button>
          )}
          {permissao === "denied" && (
            <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">
              Os avisos na área de trabalho estão bloqueados. Libere em 🔒 ao lado do endereço do site.
            </p>
          )}

          <div className="max-h-[60vh] overflow-y-auto sm:max-h-[380px]">
            {notificacoes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Bell className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">Nenhuma notificação por enquanto.</p>
                <p className="text-xs text-slate-400">Novos chamados aparecem aqui automaticamente.</p>
              </div>
            ) : (
              notificacoes.map((n) => (
                <button key={n.id} type="button" onClick={() => abrirChamado(n.id)}
                  className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${n.lida ? "" : "bg-blue-50/60"}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.lida ? "bg-transparent" : "bg-blue-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-800">{n.titulo}</p>
                      <span className="shrink-0 text-[11px] text-slate-400">#{n.id}</span>
                    </div>
                    <p className="truncate text-xs text-slate-500">{formatarNomeCurto(n.solicitante_nome)}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${corPrioridade[(n.prioridade || "media").toLowerCase()] ?? corPrioridade.media}`}>
                        {rotuloPrioridade(n.prioridade)}
                      </span>
                      <span className="text-[11px] text-slate-400">{tempoRelativo(n.recebidaEm)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Avisos flutuantes (canto inferior direito) ---------- */

interface ToastsProps {
  toasts: NotificacaoChamado[]
  onFechar: (id: number) => void
  onAbrir: (id: number) => void
}

export function ToastsChamados({ toasts, onFechar, onAbrir }: ToastsProps) {
  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) => setTimeout(() => onFechar(t.id), 10_000))
    return () => timers.forEach(clearTimeout)
  }, [toasts, onFechar])

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 right-3 z-[200] flex flex-col gap-3 sm:bottom-5 sm:left-auto sm:right-5 sm:w-[360px]">
      {toasts.map((t) => (
        <div key={t.id}
          className="pointer-events-auto flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl notif-toast">
          <div className="w-1.5 shrink-0 bg-blue-500" />
          <button type="button" onClick={() => { onAbrir(t.id); onFechar(t.id) }} className="flex flex-1 gap-3 p-4 text-left">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <BellRing className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Novo chamado #{t.id}</p>
              <p className="truncate text-sm font-semibold text-slate-800">{t.titulo}</p>
              <p className="truncate text-xs text-slate-500">
                {formatarNomeCurto(t.solicitante_nome)} · {rotuloPrioridade(t.prioridade)}
              </p>
            </div>
          </button>
          <button type="button" onClick={() => onFechar(t.id)}
            className="self-start p-2 text-slate-400 hover:text-slate-700" aria-label="Fechar aviso">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
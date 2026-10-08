import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@/services/api"

export interface NotificacaoChamado {
  id: number
  titulo: string
  prioridade: string
  solicitante_nome: string
  recebidaEm: string // ISO
  lida: boolean
}

interface RespostaNovos {
  ultimo_id: number
  novos: { id: number; titulo: string; prioridade: string; solicitante_nome: string }[]
}

const INTERVALO_MS = 30_000 // verifica novos chamados a cada 30 segundos
const MAX_NOTIFICACOES = 30
const TITULO_ORIGINAL = document.title

// Som curto de aviso (gerado pelo navegador, sem arquivo de áudio)
function tocarSom() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctx()
    ;[880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      const inicio = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0.0001, inicio)
      gain.gain.exponentialRampToValueAtTime(0.25, inicio + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(inicio)
      osc.stop(inicio + 0.4)
    })
    setTimeout(() => ctx.close(), 1000)
  } catch {
    // navegador bloqueou o som: ignora
  }
}

export function useNotificacoesChamados(usuarioId: number | undefined, ativo: boolean) {
  const chaveUltimo = `chamados:ultimoVisto:${usuarioId}`
  const chaveLista = `chamados:notificacoes:${usuarioId}`

  const [notificacoes, setNotificacoes] = useState<NotificacaoChamado[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(chaveLista) ?? "[]")
    } catch {
      return []
    }
  })
  const [toasts, setToasts] = useState<NotificacaoChamado[]>([])
  const [permissao, setPermissao] = useState<NotificationPermission | "indisponivel">(
    typeof Notification === "undefined" ? "indisponivel" : Notification.permission
  )
  const verificando = useRef(false)

  // Salva a lista no navegador
  useEffect(() => {
    localStorage.setItem(chaveLista, JSON.stringify(notificacoes.slice(0, MAX_NOTIFICACOES)))
  }, [notificacoes, chaveLista])

  // Mostra a quantidade de não lidas no título da aba: "(2) Sistema..."
  const naoLidas = notificacoes.filter((n) => !n.lida).length
  useEffect(() => {
    document.title = naoLidas > 0 ? `(${naoLidas}) ${TITULO_ORIGINAL}` : TITULO_ORIGINAL
    return () => {
      document.title = TITULO_ORIGINAL
    }
  }, [naoLidas])

  const fecharToast = useCallback((id: number) => {
    setToasts((atual) => atual.filter((t) => t.id !== id))
  }, [])

  const verificar = useCallback(async () => {
    if (!ativo || !usuarioId || verificando.current) return
    verificando.current = true
    try {
      const salvo = Number(localStorage.getItem(chaveUltimo) ?? "0")
      const { data } = await api.get<RespostaNovos>("/chamados/novos", {
        params: { depois_de: salvo },
      })

      // Primeira vez neste navegador: só marca o ponto de partida
      if (!salvo) {
        localStorage.setItem(chaveUltimo, String(data.ultimo_id))
        return
      }

      if (data.novos.length === 0) return
      localStorage.setItem(chaveUltimo, String(data.ultimo_id))

      const agora = new Date().toISOString()
      const novas: NotificacaoChamado[] = data.novos
        .map((c) => ({ ...c, recebidaEm: agora, lida: false }))
        .reverse() // mais recente primeiro

      setNotificacoes((atual) => [...novas, ...atual].slice(0, MAX_NOTIFICACOES))
      setToasts((atual) => [...novas.slice(0, 3), ...atual].slice(0, 3))
      tocarSom()

      // Notificação do sistema operacional (aparece mesmo com a aba em segundo plano)
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const titulo =
          novas.length === 1 ? `Novo chamado #${novas[0].id}` : `${novas.length} novos chamados`
        const corpo =
          novas.length === 1
            ? `${novas[0].titulo}\nSolicitante: ${novas[0].solicitante_nome}`
            : novas.map((n) => `#${n.id} ${n.titulo}`).join("\n")
        const aviso = new Notification(titulo, {
          body: corpo,
          icon: "/logotipobvm.png",
          tag: `chamado-${novas[0].id}`,
        })
        aviso.onclick = () => {
          window.focus()
          window.location.href = "/dashboard"
        }
      }

      // Avisa as telas abertas (Dashboard, Todos os Chamados) para recarregarem
      window.dispatchEvent(new CustomEvent("novo-chamado"))
    } catch {
      // falha de rede: tenta de novo no próximo ciclo
    } finally {
      verificando.current = false
    }
  }, [ativo, usuarioId, chaveUltimo])

  useEffect(() => {
    if (!ativo) return
    verificar()
    const intervalo = setInterval(verificar, INTERVALO_MS)
    const aoVoltar = () => {
      if (!document.hidden) verificar()
    }
    document.addEventListener("visibilitychange", aoVoltar)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener("visibilitychange", aoVoltar)
    }
  }, [ativo, verificar])

  const marcarComoLida = useCallback((id: number) => {
    setNotificacoes((atual) => atual.map((n) => (n.id === id ? { ...n, lida: true } : n)))
  }, [])

  const marcarTodasComoLidas = useCallback(() => {
    setNotificacoes((atual) => atual.map((n) => ({ ...n, lida: true })))
  }, [])

  const limparTodas = useCallback(() => setNotificacoes([]), [])

  const pedirPermissao = useCallback(async () => {
    if (typeof Notification === "undefined") return
    const resultado = await Notification.requestPermission()
    setPermissao(resultado)
  }, [])

  return {
    notificacoes,
    naoLidas,
    toasts,
    fecharToast,
    marcarComoLida,
    marcarTodasComoLidas,
    limparTodas,
    permissao,
    pedirPermissao,
  }
}
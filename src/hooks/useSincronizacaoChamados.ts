import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@/services/api"

const INTERVALO_PADRAO_MS = 15_000 // verifica mudanças a cada 15 segundos

/**
 * Verifica periodicamente se algo mudou nos chamados (novo chamado, mudança de status,
 * técnico, prioridade, andamento ou exclusão). Quando muda, chama `aoMudar`.
 * Só consulta enquanto a aba está visível, para economizar requisições.
 */
export function useSincronizacaoChamados(aoMudar: () => void, ativo = true, intervalo = INTERVALO_PADRAO_MS) {
  const ultimaVersao = useRef<string | null>(null)
  const callback = useRef(aoMudar)
  const verificando = useRef(false)
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<Date | null>(null)
  const [conectado, setConectado] = useState(true)

  // Sempre usa a versão mais recente da função (evita dados "congelados")
  callback.current = aoMudar

  const verificar = useCallback(async () => {
    if (!ativo || verificando.current || document.hidden) return
    verificando.current = true
    try {
      const { data } = await api.get<{ versao: string }>("/chamados/versao")
      if (ultimaVersao.current !== null && data.versao !== ultimaVersao.current) {
        callback.current()
      }
      ultimaVersao.current = data.versao
      setUltimaSincronizacao(new Date())
      setConectado(true)
    } catch {
      setConectado(false)
    } finally {
      verificando.current = false
    }
  }, [ativo])

  useEffect(() => {
    if (!ativo) return
    verificar()
    const id = setInterval(verificar, intervalo)
    // Ao voltar para a aba, verifica na hora
    const aoVoltar = () => {
      if (!document.hidden) verificar()
    }
    document.addEventListener("visibilitychange", aoVoltar)
    window.addEventListener("focus", aoVoltar)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", aoVoltar)
      window.removeEventListener("focus", aoVoltar)
    }
  }, [ativo, intervalo, verificar])

  return { ultimaSincronizacao, conectado, verificarAgora: verificar }
}
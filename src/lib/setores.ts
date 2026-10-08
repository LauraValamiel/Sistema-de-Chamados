// Lista oficial de setores da Prefeitura de Bela Vista de Minas.
// Para incluir, remover ou renomear um setor, altere esta lista
// e também a lista SETORES no arquivo main.py do backend.
export const SETORES = [
  "Administração",
  "Almoxarifado",
  "Assistência Social",
  "Casa Lar",
  "CEMEI Lages",
  "CEMEI Pedro Ferreira",
  "Compras",
  "Comunicação",
  "Conselho Tutelar",
  "Contabilidade",
  "Controladoria",
  "CRAS Lages",
  "CRAS Senhor do Bonfim",
  "Desenvolvimento Econômico",
  "EM Bento Augusto",
  "EM Sebastião Francisco de Ávila",
  "EM Sebastião Francisco de Ávila 2",
  "Epidemiologia",
  "ESF Bandeirantes",
  "ESF Lages",
  "ESF Maria Marcelina",
  "ESF Senhor do Bonfim",
  "Esportes e Cultura",
  "Farmácia Bandeirantes",
  "Farmácia de Minas",
  "Gabinete",
  "Galpão",
  "Identificação",
  "Informática",
  "Infraestrutura",
  "Junta Militar",
  "Licitação",
  "Ouvidoria",
  "Polícia Militar",
  "Prefeitura (Recepção)",
  "Procuradoria",
  "Randolfo",
  "RH",
  "Sala Mineira",
  "SASUME",
  "Secretaria de Educação",
  "Secretaria de Saúde",
  "Trânsito",
  "Tributos",
] as const

const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

/** Devolve o nome oficial do setor (ignora maiúsculas e acentos), ou null se não for da lista. */
export function setorOficial(valor?: string | null): string | null {
  if (!valor) return null
  const alvo = normalizar(valor)
  return SETORES.find((s) => normalizar(s) === alvo) ?? null
}

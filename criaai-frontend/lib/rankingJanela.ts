// Periodo do ranking. Vem da tabela ranking_config (inicio e fim do ciclo atual).
// Se o ciclo ja acabou (ou nao existe), usa o mes atual no horario de Brasilia.
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export async function janelaRanking(db: any): Promise<{ inicio: Date; fim: Date; titulo: string; fimEm: string; ano: number; mes: number }> {
  const agoraMs = Date.now()
  let inicio: Date | null = null
  let fim: Date | null = null
  try {
    const c = await db.from('ranking_config').select('inicio, fim').eq('id', 1).maybeSingle()
    if (c.data) {
      const i = new Date(c.data.inicio), f = new Date(c.data.fim)
      if (agoraMs >= i.getTime() && agoraMs < f.getTime()) { inicio = i; fim = f }
    }
  } catch (e) {}
  const br = new Date(agoraMs - 3 * 3600 * 1000)
  if (!inicio || !fim) {
    inicio = new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), 1, 3))
    fim = new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth() + 1, 1, 3))
  }
  const mIni = new Date(inicio.getTime() - 3 * 3600 * 1000).getUTCMonth()
  const ultimo = new Date(fim.getTime() - 3 * 3600 * 1000 - 1) // ultimo instante do ciclo, em Brasilia
  const mFim = ultimo.getUTCMonth()
  const titulo = mIni === mFim ? MESES[mIni] : MESES[mIni] + ' e ' + MESES[mFim]
  const fimEm = String(ultimo.getUTCDate()).padStart(2, '0') + '/' + String(ultimo.getUTCMonth() + 1).padStart(2, '0')
  return { inicio, fim, titulo, fimEm, ano: br.getUTCFullYear(), mes: br.getUTCMonth() }
}

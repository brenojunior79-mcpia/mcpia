import { createClient as createAdmin } from '@supabase/supabase-js'

// Pontos do ranking vindos do Facebook (so conta o que o proprio Facebook mostra):
//  - anuncio publicado: campanha criada depois do inicio do ranking que esta ativa ou ja gastou verba (50 pontos, ate 2 por dia)
//  - venda registrada: compra que o Facebook contou na conta de anuncios depois do inicio do ranking (50 pontos cada)
// Roda quando o aluno abre o Gerenciador de Anuncios. Nunca atrapalha a tela: qualquer erro e ignorado.
export async function registrarEventosRanking(userId: string, campanhas: any[], comprasPorCampanha: Record<string, number>) {
  try {
    const db: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const cfg = await db.from('ranking_config').select('inicio, fim').eq('id', 1).maybeSingle()
    if (!cfg.data) return
    const ini = new Date(cfg.data.inicio).getTime(), fim = new Date(cfg.data.fim).getTime()
    if (Date.now() < ini || Date.now() >= fim) return
    const linhas: any[] = []
    for (const c of campanhas) {
      const criada = c.created_time ? new Date(c.created_time).getTime() : 0
      const ativa = c.effective_status === 'ACTIVE' || Number(c.insights?.spend || 0) > 0
      if (criada >= ini && ativa) linhas.push({ user_id: userId, tipo: 'anuncio', ref: String(c.id), created_at: new Date(Math.min(criada, Date.now())).toISOString() })
    }
    for (const id of Object.keys(comprasPorCampanha)) {
      const n = Math.min(500, Math.floor(comprasPorCampanha[id] || 0))
      for (let i = 1; i <= n; i++) linhas.push({ user_id: userId, tipo: 'venda', ref: id + ':' + i })
    }
    if (!linhas.length) return
    // unique(user_id, tipo, ref): o que ja foi contado e ignorado
    await db.from('ranking_eventos').upsert(linhas, { onConflict: 'user_id,tipo,ref', ignoreDuplicates: true })
  } catch (e) {
    console.error('[ranking-facebook] erro:', e)
  }
}

// Data (AAAA-MM-DD, horario de Brasilia) do inicio do ranking, para pedir ao Facebook so as compras desde la
export async function inicioRankingISO(): Promise<string | null> {
  try {
    const db: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const cfg = await db.from('ranking_config').select('inicio').eq('id', 1).maybeSingle()
    if (!cfg.data) return null
    const d = new Date(new Date(cfg.data.inicio).getTime() - 3 * 3600 * 1000)
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0')
  } catch (e) { return null }
}

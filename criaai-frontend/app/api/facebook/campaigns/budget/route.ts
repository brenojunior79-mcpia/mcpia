import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const GRAPH_VERSION = 'v26.0'

// Aumenta ou reduz o orcamento diario de uma campanha em uma porcentagem (maximo +20% por vez)
export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
  )
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const conn = (await supabase.from('facebook_connections').select('access_token, ad_account_id').eq('user_id', user.id).maybeSingle()).data
  if (!conn) return NextResponse.json({ error: 'Nenhuma conta conectada' }, { status: 404 })

  let body: any = {}
  try { body = await req.json() } catch (e) {}
  const campaignId = String(body.campaignId || '')
  const pct = Number(body.percent)
  if (!/^\d+$/.test(campaignId) || !isFinite(pct) || pct === 0 || pct > 20 || pct < -50) {
    return NextResponse.json({ error: 'Porcentagem invalida (maximo +20% por vez).' }, { status: 400 })
  }
  const token = conn.access_token
  const fator = 1 + pct / 100
  const graph = function(path: string) { return 'https://graph.facebook.com/' + GRAPH_VERSION + '/' + path }

  try {
    const camp = await (await fetch(graph(campaignId + '?fields=account_id,daily_budget&access_token=' + token))).json()
    if (camp.error) return NextResponse.json({ error: camp.error.message }, { status: 400 })
    const contaConectada = String(conn.ad_account_id || '').replace(/^act_/, '')
    if (String(camp.account_id) !== contaConectada) return NextResponse.json({ error: 'Campanha de outra conta.' }, { status: 403 })

    const mudar = async function(id: string, centavos: number) {
      const novo = Math.max(100, Math.round(centavos * fator)) // minimo R$ 1,00
      const r = await (await fetch(graph(id), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ daily_budget: novo, access_token: token }) })).json()
      if (r.error) throw new Error(r.error.error_user_msg || r.error.message)
      return novo
    }

    const resultado: { id: string; antes: number; depois: number }[] = []
    if (camp.daily_budget) {
      // Orcamento na campanha (CBO)
      const antes = Number(camp.daily_budget)
      resultado.push({ id: campaignId, antes, depois: await mudar(campaignId, antes) })
    } else {
      // Orcamento em cada conjunto: cada um muda na mesma proporcao (sem igualar os valores)
      const conj = await (await fetch(graph(campaignId + '/adsets?fields=id,daily_budget&limit=100&access_token=' + token))).json()
      if (conj.error) return NextResponse.json({ error: conj.error.message }, { status: 400 })
      const comOrc = (conj.data || []).filter(function(a: any) { return a.daily_budget })
      if (!comOrc.length) return NextResponse.json({ error: 'Esta campanha nao tem orcamento diario (talvez seja orcamento total).' }, { status: 400 })
      for (const a of comOrc) {
        const antes = Number(a.daily_budget)
        resultado.push({ id: a.id, antes, depois: await mudar(a.id, antes) })
      }
    }
    console.log('[facebook-budget]', user.id, campaignId, pct + '%', JSON.stringify(resultado))
    const total = resultado.reduce(function(s, r) { return s + r.depois }, 0) / 100
    return NextResponse.json({ success: true, novoOrcamento: total })
  } catch (err: any) {
    console.error('[facebook-budget]', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

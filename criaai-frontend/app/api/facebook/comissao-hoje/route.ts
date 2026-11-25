import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { bloqueioAnuncios } from '@/lib/acessoAnunciosServidor'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const GRAPH_VERSION = 'v26.0'

function valorDe(lista: any, tipos: string[]): number {
  if (!Array.isArray(lista)) return 0
  for (const t of tipos) {
    const item = lista.find(function(a: any) { return a && a.action_type === t })
    if (item) return Number(item.value || 0) || 0
  }
  return 0
}

// Card "Comissoes de hoje" do Painel do Aluno: valor das vendas que o Facebook registrou HOJE nos anuncios do aluno.
// So leitura. Respostas: { status: 'ok', valor } | { status: 'conectar' } | { status: 'sem_acesso' } | { status: 'erro' }
export async function GET() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
  )
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return NextResponse.json({ status: 'erro' }, { status: 401 })
  // Admin (Breno): vendas da Hubla de hoje (pagas) e as pendentes (Pix/boleto gerado e ainda nao pago)
  const pf = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (pf.data && (pf.data as any).is_admin) {
    try {
      const admin: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
      const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10) // dia em Brasilia
      const inicio = new Date(hoje + 'T03:00:00.000Z').toISOString()
      const inicioOntem = new Date(new Date(inicio).getTime() - 86400000).toISOString()
      const inicio7 = new Date(new Date(inicio).getTime() - 6 * 86400000).toISOString() // hoje + 6 dias antes
      const [pagas, pend, ontem, semana] = await Promise.all([
        admin.from('sales_ledger').select('net').eq('provider', 'hubla').gte('paid_at', inicio),
        admin.from('hubla_faturas').select('valor').eq('status', 'pendente').gte('criado_em', inicio),
        admin.from('sales_ledger').select('net').eq('provider', 'hubla').gte('paid_at', inicioOntem).lt('paid_at', inicio),
        admin.from('sales_ledger').select('net').eq('provider', 'hubla').gte('paid_at', inicio7),
      ])
      const soma = function(l: any[], k: string) { return (l || []).reduce(function(a: number, r: any) { return a + (Number(r[k]) || 0) }, 0) }
      return NextResponse.json({ status: 'ok', fonte: 'hubla', valor: soma(pagas.data, 'net'), pendente: soma(pend.data, 'valor'), ontem: soma(ontem.data, 'net'), semana: soma(semana.data, 'net') })
    } catch (e) {
      return NextResponse.json({ status: 'erro' })
    }
  }
  const bloqueio = await bloqueioAnuncios(user)
  if (bloqueio) return NextResponse.json({ status: 'sem_acesso' })

  const conn = (await supabase.from('facebook_connections').select('access_token, ad_account_id').eq('user_id', user.id).maybeSingle()).data
  if (!conn || !conn.access_token || !conn.ad_account_id) return NextResponse.json({ status: 'conectar' })

  try {
    const base = 'https://graph.facebook.com/' + GRAPH_VERSION + '/' + encodeURIComponent(conn.ad_account_id) + '/insights?fields=action_values,actions&access_token=' + encodeURIComponent(conn.access_token) + '&date_preset='
    const hojeBr = new Date(Date.now() - 3 * 3600 * 1000)
    const ate = hojeBr.toISOString().slice(0, 10)
    const desde = new Date(hojeBr.getTime() - 6 * 86400000).toISOString().slice(0, 10)
    const urlSemana = base.replace('&date_preset=', '') + '&time_range=' + encodeURIComponent(JSON.stringify({ since: desde, until: ate }))
    const [r, rOntem, rSemana] = await Promise.all([
      fetch(base + 'today', { cache: 'no-store', signal: AbortSignal.timeout(15000) }),
      fetch(base + 'yesterday', { cache: 'no-store', signal: AbortSignal.timeout(15000) }).catch(function() { return null }),
      fetch(urlSemana, { cache: 'no-store', signal: AbortSignal.timeout(15000) }).catch(function() { return null }),
    ])
    const jSemana: any = rSemana && rSemana.ok ? await rSemana.json().catch(function() { return null }) : null
    const semana = valorDe(((jSemana && jSemana.data && jSemana.data[0]) || {}).action_values, ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'])
    const jOntem: any = rOntem && rOntem.ok ? await rOntem.json().catch(function() { return null }) : null
    const ontem = valorDe(((jOntem && jOntem.data && jOntem.data[0]) || {}).action_values, ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'])
    const j: any = await r.json().catch(function() { return null })
    if (!r.ok || !j || j.error) return NextResponse.json({ status: 'erro' })
    const linha = (j.data && j.data[0]) || {}
    const valor = valorDe(linha.action_values, ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'])
    const vendas = valorDe(linha.actions, ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'])
    return NextResponse.json({ status: 'ok', valor, vendas, ontem, semana })
  } catch (e) {
    return NextResponse.json({ status: 'erro' })
  }
}

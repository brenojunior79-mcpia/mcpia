import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { bloqueioAnuncios } from '@/lib/acessoAnunciosServidor'

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
  const bloqueio = await bloqueioAnuncios(user)
  if (bloqueio) return NextResponse.json({ status: 'sem_acesso' })

  const conn = (await supabase.from('facebook_connections').select('access_token, ad_account_id').eq('user_id', user.id).maybeSingle()).data
  if (!conn || !conn.access_token || !conn.ad_account_id) return NextResponse.json({ status: 'conectar' })

  try {
    const url = 'https://graph.facebook.com/' + GRAPH_VERSION + '/' + encodeURIComponent(conn.ad_account_id) +
      '/insights?fields=action_values,actions&date_preset=today&access_token=' + encodeURIComponent(conn.access_token)
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
    const j: any = await r.json().catch(function() { return null })
    if (!r.ok || !j || j.error) return NextResponse.json({ status: 'erro' })
    const linha = (j.data && j.data[0]) || {}
    const valor = valorDe(linha.action_values, ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'])
    const vendas = valorDe(linha.actions, ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'])
    return NextResponse.json({ status: 'ok', valor, vendas })
  } catch (e) {
    return NextResponse.json({ status: 'erro' })
  }
}

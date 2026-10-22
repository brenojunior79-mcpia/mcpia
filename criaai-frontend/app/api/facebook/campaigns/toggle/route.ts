import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const GRAPH_VERSION = 'v26.0'

// Pausa ou ativa uma campanha da conta conectada do proprio usuario
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
  const status = body.status === 'ACTIVE' ? 'ACTIVE' : body.status === 'PAUSED' ? 'PAUSED' : ''
  if (!/^\d+$/.test(campaignId) || !status) return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })

  try {
    // Confere que a campanha pertence a conta de anuncios conectada
    const dono = await (await fetch('https://graph.facebook.com/' + GRAPH_VERSION + '/' + campaignId + '?fields=account_id&access_token=' + conn.access_token)).json()
    if (dono.error) return NextResponse.json({ error: dono.error.message }, { status: 400 })
    const contaConectada = String(conn.ad_account_id || '').replace(/^act_/, '')
    if (String(dono.account_id) !== contaConectada) return NextResponse.json({ error: 'Campanha de outra conta.' }, { status: 403 })

    const r = await (await fetch('https://graph.facebook.com/' + GRAPH_VERSION + '/' + campaignId, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, access_token: conn.access_token }),
    })).json()
    if (r.error) return NextResponse.json({ error: r.error.error_user_msg || r.error.message }, { status: 400 })
    return NextResponse.json({ success: true, status })
  } catch (err: any) {
    console.error('[facebook-toggle]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const GRAPH_VERSION = 'v26.0'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
  )

  const user = (await supabase.auth.getUser()).data.user
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const connection = (await supabase
    .from('facebook_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .maybeSingle()).data

  if (!connection) return NextResponse.json({ error: 'Nenhuma conta conectada' }, { status: 404 })

  const body = await req.json()
  const campaignId: string = body.campaignId
  const name: string | undefined = body.name
  const dailyBudget: number | undefined = body.dailyBudget !== undefined ? Number(body.dailyBudget) : undefined

  if (!campaignId) return NextResponse.json({ error: 'campaignId obrigatorio' }, { status: 400 })

  try {
    // 1. Atualiza o nome da campanha, se enviado
    if (name) {
      const res = await fetch('https://graph.facebook.com/' + GRAPH_VERSION + '/' + campaignId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, access_token: connection.access_token }),
      })
      const data = await res.json()
      if (data.error) return NextResponse.json({ error: 'Erro ao atualizar nome: ' + data.error.message }, { status: 500 })
    }

    // 2. Atualiza o orcamento diario do(s) conjunto(s) de anuncios da campanha, se enviado
    if (dailyBudget !== undefined && !isNaN(dailyBudget)) {
      const adSetsRes = await fetch('https://graph.facebook.com/' + GRAPH_VERSION + '/' + campaignId + '/adsets?fields=id&access_token=' + connection.access_token)
      const adSetsData = await adSetsRes.json()
      const adSets = adSetsData.data || []

      for (const adSet of adSets) {
        const updateRes = await fetch('https://graph.facebook.com/' + GRAPH_VERSION + '/' + adSet.id, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ daily_budget: Math.round(dailyBudget * 100), access_token: connection.access_token }),
        })
        const updateData = await updateRes.json()
        if (updateData.error) {
          console.error('[facebook-campaign-update] erro ao atualizar orcamento do adset', adSet.id, updateData.error)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[facebook-campaign-update] erro:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

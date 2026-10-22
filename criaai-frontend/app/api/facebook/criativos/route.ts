import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Lista os criativos (anuncios) da conta com imagem, links, UTM e metricas do periodo.
const GRAPH_VERSION = 'v26.0'
const BASE = 'https://graph.facebook.com/' + GRAPH_VERSION

const INSIGHT_FIELDS = 'ad_id,spend,impressions,reach,frequency,clicks,inline_link_clicks,actions,action_values'

function acao(actions: any[] | undefined, tipo: string): number {
  if (!actions) return 0
  const f = actions.find(function(a) { return a.action_type === tipo })
  return f ? Number(f.value) : 0
}

function linha(raw: any) {
  return {
    spend: Number(raw.spend || 0),
    impressions: Number(raw.impressions || 0),
    reach: Number(raw.reach || 0),
    frequency: Number(raw.frequency || 0),
    clicks: Number(raw.clicks || 0),
    inlineLinkClicks: Number(raw.inline_link_clicks || 0),
    landingPageViews: acao(raw.actions, 'landing_page_view'),
    initiateCheckout: acao(raw.actions, 'omni_initiated_checkout') || acao(raw.actions, 'initiate_checkout'),
    purchaseCount: acao(raw.actions, 'omni_purchase') || acao(raw.actions, 'purchase'),
    purchaseValue: acao(raw.action_values, 'omni_purchase') || acao(raw.action_values, 'purchase'),
  }
}

async function buscarTudo(url: string) {
  let lista: any[] = []
  let prox: string | null = url
  let guarda = 0
  while (prox && guarda < 15) {
    const res: Response = await fetch(prox)
    const data: any = await res.json()
    if (data.error) return { data: lista, error: data.error }
    lista = lista.concat(data.data || [])
    prox = data.paging?.next || null
    guarda++
  }
  return { data: lista, error: null }
}

function temUtm(ad: any): boolean {
  const c = ad.creative || {}
  if (typeof c.url_tags === 'string' && /utm_/i.test(c.url_tags)) return true
  const s = c.object_story_spec || {}
  const links: string[] = []
  if (s.link_data) { if (s.link_data.link) links.push(s.link_data.link); (s.link_data.child_attachments || []).forEach(function(x: any) { if (x.link) links.push(x.link) }) }
  if (s.video_data && s.video_data.call_to_action && s.video_data.call_to_action.value && s.video_data.call_to_action.value.link) links.push(s.video_data.call_to_action.value.link)
  return links.some(function(l) { return /utm_/i.test(l) })
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
  )
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const conexao = (await supabase.from('facebook_connections').select('access_token, ad_account_id').eq('user_id', user.id).maybeSingle()).data
  if (!conexao || !conexao.ad_account_id) return NextResponse.json({ error: 'Nenhuma conta de anuncios conectada' }, { status: 404 })

  const token = conexao.access_token
  const conta = conexao.ad_account_id
  const periodo = req.nextUrl.searchParams.get('datePreset') || 'last_7d'

  try {
    const [periodoRes, hojeRes] = await Promise.all([
      buscarTudo(BASE + '/' + conta + '/insights?level=ad&fields=' + INSIGHT_FIELDS + '&date_preset=' + periodo + '&limit=500&access_token=' + token),
      buscarTudo(BASE + '/' + conta + '/insights?level=ad&fields=ad_id,impressions,spend&date_preset=today&limit=500&access_token=' + token),
    ])
    if (periodoRes.error) return NextResponse.json({ error: periodoRes.error.message }, { status: 500 })

    const metricas = new Map<string, any>()
    periodoRes.data.forEach(function(r: any) { metricas.set(r.ad_id, linha(r)) })
    const hoje = new Set<string>()
    hojeRes.data.forEach(function(r: any) { if (Number(r.impressions || 0) > 0) hoje.add(r.ad_id) })

    // So os anuncios ATIVOS
    const campos = 'id,name,effective_status,created_time,preview_shareable_link,adset{name},campaign{name},' +
      'creative.thumbnail_width(480).thumbnail_height(480){thumbnail_url,image_url,video_id,instagram_permalink_url,effective_object_story_id,url_tags,object_story_spec}'
    const filtro = encodeURIComponent(JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]))
    const ativos = await buscarTudo(BASE + '/' + conta + '/ads?fields=' + encodeURIComponent(campos) + '&limit=25&filtering=' + filtro + '&access_token=' + token)
    if (ativos.error) return NextResponse.json({ error: ativos.error.message }, { status: 500 })
    const ids: string[] = []
    const detalhes = new Map<string, any>()
    ativos.data.forEach(function(ad: any) { ids.push(ad.id); detalhes.set(ad.id, ad) })

    const criativos = ids.map(function(id) {
      const ad = detalhes.get(id) || { id, name: 'Anuncio ' + id }
      const c = ad.creative || {}
      const post = c.effective_object_story_id ? String(c.effective_object_story_id) : ''
      const partes = post.split('_')
      return {
        id,
        nome: ad.name || id,
        conjunto: ad.adset ? ad.adset.name : '',
        campanha: ad.campaign ? ad.campaign.name : '',
        criadoEm: ad.created_time || null,
        status: ad.effective_status || '',
        entregandoHoje: hoje.has(id) && ad.effective_status === 'ACTIVE',
        imagem: c.image_url || c.thumbnail_url || null,
        ehVideo: !!c.video_id,
        temUtm: temUtm(ad),
        linkAnuncio: ad.preview_shareable_link || null,
        linkInstagram: c.instagram_permalink_url || null,
        linkFacebook: partes.length === 2 ? 'https://www.facebook.com/' + partes[0] + '/posts/' + partes[1] : null,
        insights: metricas.get(id) || linha({}),
      }
    })

    return NextResponse.json({ criativos })
  } catch (err: any) {
    console.error('[facebook-criativos] erro:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

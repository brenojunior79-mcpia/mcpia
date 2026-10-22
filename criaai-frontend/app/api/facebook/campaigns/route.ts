import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const GRAPH_VERSION = 'v26.0'

const INSIGHT_FIELDS = [
  'campaign_id', 'adset_id', 'ad_id',
  'spend', 'impressions', 'reach', 'frequency', 'clicks', 'inline_link_clicks', 'ctr', 'cpc', 'cpm',
  'inline_link_click_ctr', 'cost_per_inline_link_click',
  'actions', 'action_values',
].join(',')

function extractAction(actions: any[] | undefined, type: string): number {
  if (!actions) return 0
  const found = actions.find(function(a) { return a.action_type === type })
  return found ? Number(found.value) : 0
}

function extractActionValue(actionValues: any[] | undefined, type: string): number {
  if (!actionValues) return 0
  const found = actionValues.find(function(a) { return a.action_type === type })
  return found ? Number(found.value) : 0
}

function emptyTotals() {
  return { spend: 0, impressions: 0, reach: 0, frequency: 0, inlineLinkClicks: 0, clicks: 0, landingPageViews: 0, initiateCheckout: 0, purchaseCount: 0, purchaseValue: 0 }
}

function addRawInsightToTotals(totals: any, raw: any) {
  totals.spend += Number(raw.spend || 0)
  totals.impressions += Number(raw.impressions || 0)
  totals.clicks += Number(raw.clicks || 0)
  totals.inlineLinkClicks += Number(raw.inline_link_clicks || 0)
  totals.reach += Number(raw.reach || 0)
  totals.frequency = Number(raw.frequency || totals.frequency || 0)
  totals.landingPageViews += extractAction(raw.actions, 'landing_page_view')
  totals.initiateCheckout += extractAction(raw.actions, 'omni_initiated_checkout') || extractAction(raw.actions, 'initiate_checkout')
  totals.purchaseCount += extractAction(raw.actions, 'omni_purchase') || extractAction(raw.actions, 'purchase')
  totals.purchaseValue += extractActionValue(raw.action_values, 'omni_purchase') || extractActionValue(raw.action_values, 'purchase')
}

function sumChildTotals(totals: any, child: any) {
  totals.spend += child.insights.spend
  totals.impressions += child.insights.impressions
  totals.clicks += child.insights.clicks
  totals.inlineLinkClicks += child.insights.inlineLinkClicks || 0
  totals.reach += child.insights.reach || 0
  totals.landingPageViews += child.insights.landingPageViews
  totals.initiateCheckout += child.insights.initiateCheckout
  totals.purchaseCount += child.insights.purchaseCount
  totals.purchaseValue += child.insights.purchaseValue
}

function finalizeTotals(totals: any) {
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0
  const linkCtr = totals.impressions > 0 ? (totals.inlineLinkClicks / totals.impressions) * 100 : 0
  const linkCpc = totals.inlineLinkClicks > 0 ? totals.spend / totals.inlineLinkClicks : 0
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0
  const roas = totals.spend > 0 ? totals.purchaseValue / totals.spend : 0
  return { ...totals, ctr, cpc, cpm, linkCtr, linkCpc, roas }
}

async function fetchAll(url: string) {
  let results: any[] = []
  let nextUrl: string | null = url
  let guard = 0
  while (nextUrl && guard < 15) {
    const res: Response = await fetch(nextUrl)
    const data: any = await res.json()
    if (data.error) return { data: results, error: data.error }
    results = results.concat(data.data || [])
    nextUrl = data.paging?.next || null
    guard++
  }
  return { data: results, error: null }
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

  const connection = (await supabase
    .from('facebook_connections')
    .select('access_token, ad_account_id')
    .eq('user_id', user.id)
    .maybeSingle()).data

  if (!connection || !connection.ad_account_id) {
    return NextResponse.json({ error: 'Nenhuma conta de anuncios conectada' }, { status: 404 })
  }

  const { access_token: accessToken, ad_account_id: adAccountId } = connection
  const datePreset = req.nextUrl.searchParams.get('datePreset') || 'last_30d'

  try {
    // A conta pode ter centenas de campanhas antigas. Para ficar rapido, buscamos so as ATIVAS
    // e as que tiveram movimento no periodo (as outras nao aparecem nem pesam).
    const G = 'https://graph.facebook.com/' + GRAPH_VERSION + '/' + adAccountId
    const CAMPOS_CAMP = 'id,name,status,effective_status,objective,daily_budget,lifetime_budget'
    const filtro = function(campo: string, valores: string[]) { return '&filtering=' + encodeURIComponent(JSON.stringify([{ field: campo, operator: 'IN', value: valores }])) }
    const [ativasResult, campaignInsightsResult, accountReachResult] = await Promise.all([
      fetchAll(G + '/campaigns?fields=' + CAMPOS_CAMP + '&limit=200' + filtro('effective_status', ['ACTIVE']) + '&access_token=' + accessToken),
      fetchAll(G + '/insights?level=campaign&fields=' + INSIGHT_FIELDS + '&date_preset=' + datePreset + '&limit=200&access_token=' + accessToken),
      fetchAll(G + '/insights?level=account&fields=reach,frequency&date_preset=' + datePreset + '&access_token=' + accessToken),
    ])

    if (ativasResult.error) {
      console.error('[facebook-campaigns] erro campanhas:', ativasResult.error)
      return NextResponse.json({ error: ativasResult.error.message }, { status: 500 })
    }
    if (campaignInsightsResult.error) console.error('[facebook-campaigns] erro insights campanha:', campaignInsightsResult.error)

    const idsAtivas = new Set<string>(ativasResult.data.map(function(c: any) { return c.id }))
    const idsExtras: string[] = []
    campaignInsightsResult.data.forEach(function(r: any) { if (!idsAtivas.has(r.campaign_id) && idsExtras.indexOf(r.campaign_id) < 0) idsExtras.push(r.campaign_id) })
    const todosIds = Array.from(idsAtivas).concat(idsExtras)

    const lotesIds: string[][] = []
    for (let i = 0; i < todosIds.length; i += 50) lotesIds.push(todosIds.slice(i, i + 50))
    const [extrasResult, ...adSetsLotes] = await Promise.all([
      idsExtras.length ? fetchAll(G + '/campaigns?fields=' + CAMPOS_CAMP + '&limit=200' + filtro('id', idsExtras) + '&access_token=' + accessToken) : Promise.resolve({ data: [] as any[], error: null }),
      ...lotesIds.map(function(lote) { return fetchAll(G + '/adsets?fields=id,name,campaign_id,status,effective_status,daily_budget&limit=200' + filtro('campaign.id', lote) + '&access_token=' + accessToken) }),
    ])
    const campaignsResult = { data: ativasResult.data.concat(extrasResult.data || []) }
    const adSetsResult = { data: ([] as any[]).concat(...adSetsLotes.map(function(r: any) { return r.data || [] })) }

    console.log('[facebook-campaigns] campanhas:', campaignsResult.data.length, 'conjuntos:', adSetsResult.data.length, 'insights-campanha:', campaignInsightsResult.data.length)

    // 2. Mapa de insight direto por campanha (fonte confiavel pro numero principal)
    const campaignInsightsMap = new Map<string, any>()
    for (const row of campaignInsightsResult.data) {
      const totals = emptyTotals()
      addRawInsightToTotals(totals, row)
      campaignInsightsMap.set(row.campaign_id, finalizeTotals(totals))
    }

    // 5. Monta conjuntos agrupados por campanha (o total do conjunto e a soma dos seus anuncios, so pra exibicao)
    const adSetsByCampaignId = new Map<string, any[]>()
    for (const adSet of adSetsResult.data) {
      const adSetWithAds = { ...adSet }
      if (!adSetsByCampaignId.has(adSet.campaign_id)) adSetsByCampaignId.set(adSet.campaign_id, [])
      adSetsByCampaignId.get(adSet.campaign_id)!.push(adSetWithAds)
    }

    // 6. Monta campanhas. O total principal vem DIRETO do insight de campanha (confiavel);
    // os conjuntos ficam disponiveis so para o detalhamento interno.
    const campaignsWithStructure = campaignsResult.data.map(function(campaign: any) {
      const adSets = adSetsByCampaignId.get(campaign.id) || []
      const insights = campaignInsightsMap.get(campaign.id) || finalizeTotals(emptyTotals())
      return { ...campaign, adSets, insights }
    })

    // 7. Metricas gerais da conta = soma direta dos insights de campanha (mesma fonte confiavel)
    const accountTotals = emptyTotals()
    for (const row of campaignInsightsResult.data) {
      addRawInsightToTotals(accountTotals, row)
    }
    // Alcance e frequencia da conta vem do proprio insight da conta (pessoas unicas; nao pode somar campanhas)
    const accRow = accountReachResult.data[0]
    if (accRow) { accountTotals.reach = Number(accRow.reach || 0); accountTotals.frequency = Number(accRow.frequency || 0) }
    const accountInsights = finalizeTotals(accountTotals)

    return NextResponse.json({
      adAccountId,
      accountInsights,
      campaigns: campaignsWithStructure,
    })
  } catch (err: any) {
    console.error('[facebook-campaigns] erro:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

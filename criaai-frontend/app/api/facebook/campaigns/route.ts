import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const GRAPH_VERSION = 'v26.0'

const INSIGHT_FIELDS = [
  'campaign_id', 'adset_id', 'ad_id',
  'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
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
  return { spend: 0, impressions: 0, clicks: 0, landingPageViews: 0, initiateCheckout: 0, purchaseCount: 0, purchaseValue: 0 }
}

function addRawInsightToTotals(totals: any, raw: any) {
  totals.spend += Number(raw.spend || 0)
  totals.impressions += Number(raw.impressions || 0)
  totals.clicks += Number(raw.clicks || 0)
  totals.landingPageViews += extractAction(raw.actions, 'landing_page_view')
  totals.initiateCheckout += extractAction(raw.actions, 'initiate_checkout')
  totals.purchaseCount += extractAction(raw.actions, 'omni_purchase') || extractAction(raw.actions, 'purchase')
  totals.purchaseValue += extractActionValue(raw.action_values, 'omni_purchase') || extractActionValue(raw.action_values, 'purchase')
}

function sumChildTotals(totals: any, child: any) {
  totals.spend += child.insights.spend
  totals.impressions += child.insights.impressions
  totals.clicks += child.insights.clicks
  totals.landingPageViews += child.insights.landingPageViews
  totals.initiateCheckout += child.insights.initiateCheckout
  totals.purchaseCount += child.insights.purchaseCount
  totals.purchaseValue += child.insights.purchaseValue
}

function finalizeTotals(totals: any) {
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0
  const roas = totals.spend > 0 ? totals.purchaseValue / totals.spend : 0
  return { ...totals, ctr, cpc, cpm, linkCtr: ctr, linkCpc: cpc, roas }
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
    // 1. Estrutura (campanhas, conjuntos, anuncios) + 2 niveis de insight (campanha e anuncio)
    const [campaignsResult, adSetsResult, adsResult, campaignInsightsResult, adInsightsResult] = await Promise.all([
      fetchAll('https://graph.facebook.com/' + GRAPH_VERSION + '/' + adAccountId + '/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget&limit=200&access_token=' + accessToken),
      fetchAll('https://graph.facebook.com/' + GRAPH_VERSION + '/' + adAccountId + '/adsets?fields=id,name,campaign_id,status,effective_status,daily_budget&limit=200&access_token=' + accessToken),
      fetchAll('https://graph.facebook.com/' + GRAPH_VERSION + '/' + adAccountId + '/ads?fields=id,name,adset_id,status,effective_status&limit=200&access_token=' + accessToken),
      fetchAll('https://graph.facebook.com/' + GRAPH_VERSION + '/' + adAccountId + '/insights?level=campaign&fields=' + INSIGHT_FIELDS + '&date_preset=' + datePreset + '&limit=200&access_token=' + accessToken),
      fetchAll('https://graph.facebook.com/' + GRAPH_VERSION + '/' + adAccountId + '/insights?level=ad&fields=' + INSIGHT_FIELDS + '&date_preset=' + datePreset + '&limit=500&access_token=' + accessToken),
    ])

    if (campaignsResult.error) {
      console.error('[facebook-campaigns] erro campanhas:', campaignsResult.error)
      return NextResponse.json({ error: campaignsResult.error.message }, { status: 500 })
    }
    if (campaignInsightsResult.error) console.error('[facebook-campaigns] erro insights campanha:', campaignInsightsResult.error)
    if (adInsightsResult.error) console.error('[facebook-campaigns] erro insights anuncio:', adInsightsResult.error)

    console.log('[facebook-campaigns] campanhas:', campaignsResult.data.length, 'conjuntos:', adSetsResult.data.length, 'anuncios:', adsResult.data.length, 'insights-campanha:', campaignInsightsResult.data.length, 'insights-anuncio:', adInsightsResult.data.length)

    // 2. Mapa de insight direto por campanha (fonte confiavel pro numero principal)
    const campaignInsightsMap = new Map<string, any>()
    for (const row of campaignInsightsResult.data) {
      const totals = emptyTotals()
      addRawInsightToTotals(totals, row)
      campaignInsightsMap.set(row.campaign_id, finalizeTotals(totals))
    }

    // 3. Mapa de insight por anuncio (usado so pra montar o detalhe interno)
    const adInsightsMap = new Map<string, any>()
    for (const row of adInsightsResult.data) {
      const totals = emptyTotals()
      addRawInsightToTotals(totals, row)
      adInsightsMap.set(row.ad_id, finalizeTotals(totals))
    }

    // 4. Monta anuncios agrupados por conjunto
    const adsByAdSetId = new Map<string, any[]>()
    for (const ad of adsResult.data) {
      const insights = adInsightsMap.get(ad.id) || finalizeTotals(emptyTotals())
      const adWithInsight = { ...ad, insights }
      if (!adsByAdSetId.has(ad.adset_id)) adsByAdSetId.set(ad.adset_id, [])
      adsByAdSetId.get(ad.adset_id)!.push(adWithInsight)
    }

    // 5. Monta conjuntos agrupados por campanha (o total do conjunto e a soma dos seus anuncios, so pra exibicao)
    const adSetsByCampaignId = new Map<string, any[]>()
    for (const adSet of adSetsResult.data) {
      const ads = adsByAdSetId.get(adSet.id) || []
      const totals = emptyTotals()
      for (const ad of ads) sumChildTotals(totals, ad)
      const adSetWithAds = { ...adSet, ads, insights: finalizeTotals(totals) }
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

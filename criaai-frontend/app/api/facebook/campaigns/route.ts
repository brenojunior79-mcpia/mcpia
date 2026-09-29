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
  return { spend: 0, impressions: 0, clicks: 0, linkClicks: 0, landingPageViews: 0, initiateCheckout: 0, purchaseCount: 0, purchaseValue: 0 }
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
  while (nextUrl && guard < 10) {
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
    // 1. Estrutura: campanhas, conjuntos e anuncios (3 chamadas, independente de quantos existirem)
    const [campaignsResult, adSetsResult, adsResult, insightsResult] = await Promise.all([
      fetchAll('https://graph.facebook.com/' + GRAPH_VERSION + '/' + adAccountId + '/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget&limit=200&access_token=' + accessToken),
      fetchAll('https://graph.facebook.com/' + GRAPH_VERSION + '/' + adAccountId + '/adsets?fields=id,name,campaign_id,status,effective_status,daily_budget&limit=200&access_token=' + accessToken),
      fetchAll('https://graph.facebook.com/' + GRAPH_VERSION + '/' + adAccountId + '/ads?fields=id,name,adset_id,status,effective_status&limit=200&access_token=' + accessToken),
      fetchAll('https://graph.facebook.com/' + GRAPH_VERSION + '/' + adAccountId + '/insights?level=ad&fields=' + INSIGHT_FIELDS + '&date_preset=' + datePreset + '&limit=200&access_token=' + accessToken),
    ])

    if (campaignsResult.error) {
      console.error('[facebook-campaigns] erro campanhas:', campaignsResult.error)
      return NextResponse.json({ error: campaignsResult.error.message }, { status: 500 })
    }
    if (insightsResult.error) {
      console.error('[facebook-campaigns] erro insights:', insightsResult.error)
    }

    console.log('[facebook-campaigns] campanhas:', campaignsResult.data.length, 'conjuntos:', adSetsResult.data.length, 'anuncios:', adsResult.data.length, 'linhas de insight:', insightsResult.data.length)

    // 2. Monta um mapa de insight cru por ad_id
    const insightsByAdId = new Map<string, any>()
    for (const row of insightsResult.data) {
      insightsByAdId.set(row.ad_id, row)
    }

    // 3. Monta os anuncios, com seu insight (se houver)
    const adsByAdSetId = new Map<string, any[]>()
    for (const ad of adsResult.data) {
      const rawInsight = insightsByAdId.get(ad.id)
      const totals = emptyTotals()
      if (rawInsight) addRawInsightToTotals(totals, rawInsight)
      const adWithInsight = { ...ad, insights: finalizeTotals(totals) }
      if (!adsByAdSetId.has(ad.adset_id)) adsByAdSetId.set(ad.adset_id, [])
      adsByAdSetId.get(ad.adset_id)!.push(adWithInsight)
    }

    // 4. Monta os conjuntos, somando os anuncios dele
    const adSetsByCampaignId = new Map<string, any[]>()
    for (const adSet of adSetsResult.data) {
      const ads = adsByAdSetId.get(adSet.id) || []
      const totals = emptyTotals()
      for (const ad of ads) {
        totals.spend += ad.insights.spend
        totals.impressions += ad.insights.impressions
        totals.clicks += ad.insights.clicks
        totals.landingPageViews += ad.insights.landingPageViews
        totals.initiateCheckout += ad.insights.initiateCheckout
        totals.purchaseCount += ad.insights.purchaseCount
        totals.purchaseValue += ad.insights.purchaseValue
      }
      const adSetWithAds = { ...adSet, ads, insights: finalizeTotals(totals) }
      if (!adSetsByCampaignId.has(adSet.campaign_id)) adSetsByCampaignId.set(adSet.campaign_id, [])
      adSetsByCampaignId.get(adSet.campaign_id)!.push(adSetWithAds)
    }

    // 5. Monta as campanhas, somando os conjuntos dela
    const campaignsWithStructure = campaignsResult.data.map(function(campaign: any) {
      const adSets = adSetsByCampaignId.get(campaign.id) || []
      const totals = emptyTotals()
      for (const adSet of adSets) {
        totals.spend += adSet.insights.spend
        totals.impressions += adSet.insights.impressions
        totals.clicks += adSet.insights.clicks
        totals.landingPageViews += adSet.insights.landingPageViews
        totals.initiateCheckout += adSet.insights.initiateCheckout
        totals.purchaseCount += adSet.insights.purchaseCount
        totals.purchaseValue += adSet.insights.purchaseValue
      }
      return { ...campaign, adSets, insights: finalizeTotals(totals) }
    })

    // 6. Metricas gerais da conta = soma de todas as campanhas
    const accountTotals = emptyTotals()
    for (const campaign of campaignsWithStructure) {
      accountTotals.spend += campaign.insights.spend
      accountTotals.impressions += campaign.insights.impressions
      accountTotals.clicks += campaign.insights.clicks
      accountTotals.landingPageViews += campaign.insights.landingPageViews
      accountTotals.initiateCheckout += campaign.insights.initiateCheckout
      accountTotals.purchaseCount += campaign.insights.purchaseCount
      accountTotals.purchaseValue += campaign.insights.purchaseValue
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

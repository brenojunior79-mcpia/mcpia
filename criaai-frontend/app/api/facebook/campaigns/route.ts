import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const GRAPH_VERSION = 'v26.0'

const INSIGHTS_FIELDS = [
  'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
  'inline_link_click_ctr', 'cost_per_inline_link_click',
  'actions', 'action_values', 'purchase_roas',
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

function shapeInsights(raw: any) {
  if (!raw) return null
  const purchaseCount = extractAction(raw.actions, 'omni_purchase') || extractAction(raw.actions, 'purchase')
  const purchaseValue = extractActionValue(raw.action_values, 'omni_purchase') || extractActionValue(raw.action_values, 'purchase')
  const landingPageViews = extractAction(raw.actions, 'landing_page_view')
  const initiateCheckout = extractAction(raw.actions, 'initiate_checkout')
  const roas = raw.purchase_roas?.[0]?.value ? Number(raw.purchase_roas[0].value) : (purchaseValue && raw.spend ? purchaseValue / Number(raw.spend) : 0)

  return {
    spend: Number(raw.spend || 0),
    impressions: Number(raw.impressions || 0),
    clicks: Number(raw.clicks || 0),
    ctr: Number(raw.ctr || 0),
    cpc: Number(raw.cpc || 0),
    cpm: Number(raw.cpm || 0),
    linkCtr: Number(raw.inline_link_click_ctr || 0),
    linkCpc: Number(raw.cost_per_inline_link_click || 0),
    landingPageViews,
    initiateCheckout,
    purchaseCount,
    purchaseValue,
    roas,
  }
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
    // Metricas gerais da conta (soma de tudo no periodo)
    const accountInsightsRes = await fetch(
      'https://graph.facebook.com/' + GRAPH_VERSION + '/' + adAccountId + '/insights'
      + '?fields=' + INSIGHTS_FIELDS
      + '&date_preset=' + datePreset
      + '&access_token=' + accessToken
    )
    const accountInsightsData = await accountInsightsRes.json()
    const accountInsights = shapeInsights(accountInsightsData.data?.[0])

    if (accountInsightsData.error) {
      console.error('[facebook-campaigns] erro insights conta:', accountInsightsData.error)
    }

    // Lista de campanhas
    const campaignsRes = await fetch(
      'https://graph.facebook.com/' + GRAPH_VERSION + '/' + adAccountId + '/campaigns'
      + '?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time'
      + '&limit=50'
      + '&access_token=' + accessToken
    )
    const campaignsData = await campaignsRes.json()

    if (campaignsData.error) {
      console.error('[facebook-campaigns] erro campanhas:', campaignsData.error)
      return NextResponse.json({ error: campaignsData.error.message }, { status: 500 })
    }

    const campaigns = campaignsData.data || []

    // Metricas de cada campanha (em paralelo)
    const campaignsWithInsights = await Promise.all(campaigns.map(async function(campaign: any) {
      try {
        const insightsRes = await fetch(
          'https://graph.facebook.com/' + GRAPH_VERSION + '/' + campaign.id + '/insights'
          + '?fields=' + INSIGHTS_FIELDS
          + '&date_preset=' + datePreset
          + '&access_token=' + accessToken
        )
        const insightsData = await insightsRes.json()
        const insights = shapeInsights(insightsData.data?.[0])
        return { ...campaign, insights }
      } catch {
        return { ...campaign, insights: null }
      }
    }))

    return NextResponse.json({
      adAccountId,
      accountInsights,
      campaigns: campaignsWithInsights,
    })
  } catch (err: any) {
    console.error('[facebook-campaigns] erro:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
  )

  const user = (await supabase.auth.getUser()).data.user
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await req.json()
  const accountInsights = body.accountInsights
  const campaigns = body.campaigns || []

  if (!accountInsights) return NextResponse.json({ error: 'Sem dados de metricas para analisar' }, { status: 400 })

  try {
    const campaignsSummary = campaigns.map(function(c: any) {
      const i = c.insights
      return c.name + ': status ' + (c.effective_status || c.status)
        + ', gasto R$' + (i?.spend || 0)
        + ', CTR link ' + (i?.linkCtr || 0) + '%'
        + ', CPC link R$' + (i?.linkCpc || 0)
        + ', ROAS ' + (i?.roas || 0)
        + ', vendas ' + (i?.purchaseCount || 0) + ' (R$' + (i?.purchaseValue || 0) + ')'
    }).join('\n')

    const prompt = `Analise essas metricas de campanhas do Facebook Ads e de recomendacoes praticas e diretas em portugues, em formato de topicos curtos (maximo 6 topicos). Foque em: o que esta funcionando bem, o que precisa de atencao, e 2-3 acoes concretas recomendadas.

METRICAS GERAIS DA CONTA (ultimos 30 dias):
- Gasto: R$${accountInsights.spend}
- Impressoes: ${accountInsights.impressions}
- Cliques: ${accountInsights.clicks}
- CTR (link): ${accountInsights.linkCtr}%
- CPC (link): R$${accountInsights.linkCpc}
- CPM: R$${accountInsights.cpm}
- Visualizacoes de pagina de destino: ${accountInsights.landingPageViews}
- Finalizacoes de compra iniciadas: ${accountInsights.initiateCheckout}
- Vendas: ${accountInsights.purchaseCount} (R$${accountInsights.purchaseValue})
- ROAS: ${accountInsights.roas}

CAMPANHAS:
${campaignsSummary}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Voce e um especialista em trafego pago e Facebook Ads, analisando dados reais de campanhas para dar recomendacoes praticas a um infoprodutor/afiliado brasileiro.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 500,
    })

    const analysis = response.choices[0].message.content || 'Nao foi possivel gerar a analise.'

    return NextResponse.json({ analysis })
  } catch (err: any) {
    console.error('[facebook-analyze]', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

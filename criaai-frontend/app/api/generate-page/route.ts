import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase-server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

function buildHtml(copy: any, form: any, theme: string) {
  const dark = theme === 'dark'
  const bg = dark ? '#0d0d0d' : '#ffffff'
  const surface = dark ? '#1a1a1a' : '#f8f8f8'
  const text = dark ? '#f0f0f0' : '#111111'
  const muted = dark ? '#999' : '#555'
  const accent = '#7c5cfc'
  const accentLight = dark ? 'rgba(124,92,252,0.15)' : 'rgba(124,92,252,0.08)'
  const border = dark ? '#2a2a2a' : '#e5e5e5'

  const benefitsHtml = (copy.benefits || []).map((b: string) => `
    <li style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
      <span style="width:22px;height:22px;border-radius:50%;background:${accent};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;margin-top:2px;">✓</span>
      <span style="font-size:16px;line-height:1.5;color:${text};">${b}</span>
    </li>`).join('')

  const bonusHtml = copy.bonus ? `
    <div style="background:${accentLight};border:1px solid ${accent}33;border-radius:14px;padding:28px;margin:40px 0;text-align:center;">
      <div style="font-size:13px;font-weight:600;color:${accent};text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Bônus exclusivo</div>
      <div style="font-size:20px;font-weight:700;color:${text};">${copy.bonus}</div>
    </div>` : ''

  const guaranteeHtml = copy.guarantee ? `
    <div style="display:flex;align-items:center;gap:16px;background:${surface};border:1px solid ${border};border-radius:14px;padding:24px;margin:32px 0;">
      <span style="font-size:40px;">🛡️</span>
      <div>
        <div style="font-weight:700;font-size:17px;color:${text};margin-bottom:4px;">Garantia</div>
        <div style="color:${muted};font-size:15px;">${copy.guarantee}</div>
      </div>
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${form.productName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:${bg};color:${text};}
  .container{max-width:680px;margin:0 auto;padding:40px 24px 80px;}
  .badge{display:inline-block;background:${accentLight};border:1px solid ${accent}44;color:${accent};font-size:12px;font-weight:600;padding:5px 14px;border-radius:99px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:20px;}
  h1{font-size:clamp(28px,5vw,44px);font-weight:800;line-height:1.15;margin-bottom:16px;}
  .subheadline{font-size:18px;color:${muted};line-height:1.6;margin-bottom:36px;}
  .price-box{text-align:center;margin:40px 0;}
  .price-label{font-size:14px;color:${muted};margin-bottom:6px;}
  .price{font-size:52px;font-weight:800;color:${accent};}
  .price span{font-size:22px;vertical-align:top;margin-top:10px;display:inline-block;}
  .cta{display:block;width:100%;max-width:400px;margin:24px auto 0;padding:18px;background:${accent};color:#fff;font-size:18px;font-weight:700;border-radius:12px;border:none;cursor:pointer;text-align:center;text-decoration:none;transition:opacity .15s;}
  .cta:hover{opacity:.9;}
  .section-title{font-size:22px;font-weight:700;margin-bottom:20px;color:${text};}
  ul{list-style:none;}
  .divider{height:1px;background:${border};margin:40px 0;}
  .footer{text-align:center;color:${muted};font-size:13px;margin-top:60px;}
</style>
</head>
<body>
<div class="container">
  <div class="badge">${copy.badge || 'Oferta especial'}</div>
  <h1>${copy.headline}</h1>
  <p class="subheadline">${copy.subheadline}</p>
  <div class="divider"></div>
  <div style="margin:36px 0;">
    <div class="section-title">O que você vai receber</div>
    <ul>${benefitsHtml}</ul>
  </div>
  ${bonusHtml}
  <div class="price-box">
    <div class="price-label">Investimento</div>
    <div class="price"><span>R$</span>${form.price}</div>
  </div>
  <a href="${form.checkoutUrl || '#'}" class="cta">${copy.cta}</a>
  ${guaranteeHtml}
  <div class="divider"></div>
  <div class="footer">© ${new Date().getFullYear()} ${form.productName} · Todos os direitos reservados</div>
</div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { productName, price, audience, benefits, bonus, guarantee, checkoutUrl, theme } = await req.json()

    if (!productName || !price || !audience || !benefits?.length) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_ebooks_used, credits_ebooks_extra, plans(credits_ebooks, is_unlimited)')
      .eq('id', user.id)
      .single()

    const plan = (profile as any)?.plans
    const used = profile?.credits_ebooks_used || 0
    const extra = profile?.credits_ebooks_extra || 0
    const limit = plan?.is_unlimited ? 99999 : ((plan?.credits_ebooks || 0) + extra)
    if (used >= limit) {
      return NextResponse.json({ error: 'Sem créditos de ebook disponíveis' }, { status: 403 })
    }

    const prompt = `Você é um copywriter especialista em páginas de vendas de alta conversão para o mercado brasileiro.

Produto: ${productName}
Preço: R$ ${price}
Público-alvo: ${audience}
Benefícios: ${benefits.join(', ')}
${bonus ? `Bônus: ${bonus}` : ''}
${guarantee ? `Garantia: ${guarantee}` : ''}

Crie uma copy persuasiva em Português (Brasil) e retorne APENAS um JSON válido com esta estrutura:
{
  "badge": "texto curto para o badge (ex: Acesso imediato)",
  "headline": "headline principal impactante (máx 12 palavras)",
  "subheadline": "subtítulo explicativo (máx 25 palavras)",
  "benefits": ["benefício 1 reescrito de forma persuasiva", "benefício 2", ...],
  "bonus": "descrição do bônus reescrita de forma atraente ou null",
  "guarantee": "descrição da garantia ou null",
  "cta": "texto do botão de compra (máx 6 palavras)"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 800,
    })

    const copy = JSON.parse(completion.choices[0].message.content || '{}')
    const form = { productName, price, checkoutUrl }
    const html = buildHtml(copy, form, theme || 'light')

    const baseSlug = slugify(productName)
    const slug = `${baseSlug}-${Date.now().toString(36)}`

    const { data: page, error } = await supabase
      .from('sales_pages')
      .insert({
        user_id: user.id,
        slug,
        product_name: productName,
        theme: theme || 'light',
        form_data: { productName, price, audience, benefits, bonus, guarantee, checkoutUrl },
        html,
      })
      .select('slug')
      .single()

    if (error) throw error

    await supabase
      .from('profiles')
      .update({ credits_ebooks_used: used + 1 })
      .eq('id', user.id)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mcpia.brenojunio.com.br'
    return NextResponse.json({ slug: page.slug, url: `${appUrl}/p/${page.slug}` })
  } catch (err: any) {
    console.error('generate-page error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

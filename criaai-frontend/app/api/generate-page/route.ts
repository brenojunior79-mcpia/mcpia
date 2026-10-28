import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { renderSalesPage, safeAccent, safePixel, safeUrl, Section } from '@/lib/sales-page'
import { gerarImagemOpenAI } from '@/lib/openaiImage'

export const maxDuration = 60

function slugify(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
}

function clean(v: any, max: number): string {
  return String(v === undefined || v === null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max)
}

function cleanList(v: any, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return []
  return v.map(function(x) { return clean(x, maxLen) }).filter(Boolean).slice(0, maxItems)
}

const COPY_RULES = `Você é um copywriter brasileiro de resposta direta, claro e humano. Escreva em português do Brasil, falando direto com o público ("você").
REGRAS OBRIGATÓRIAS:
- NÃO invente fatos: nada de números de clientes, resultados, prêmios, estudos, nomes de pessoas, depoimentos, prazos de oferta ou quantidade de vagas.
- NÃO prometa ganho garantido, cura ou resultado certo. Use linguagem de possibilidade ("pode", "te ajuda a").
- NÃO use urgência ou escassez falsa.
- Use o que o vendedor informou. Se faltar informação, escreva de forma honesta e genérica, sem inventar detalhes.
- Frases curtas. Use **negrito** (dois asteriscos) em 1 a 3 trechos-chave dos textos longos.
- Retorne APENAS JSON válido, sem comentários.`

async function generateCopy(f: any): Promise<any> {
  const user =
    'DADOS DO PRODUTO\n' +
    'Nome: ' + f.productName + '\n' +
    'O que é / como funciona: ' + (f.description || 'não informado') + '\n' +
    'Público-alvo: ' + f.audience + '\n' +
    'Preço: R$ ' + f.price + (f.period ? ' (' + f.period + ')' : '') + '\n' +
    'Dores do público (informadas pelo vendedor): ' + (f.pains.length ? f.pains.join(' | ') : 'não informadas, deduza as dores mais prováveis do público') + '\n' +
    'Conteúdo / o que a pessoa recebe: ' + f.benefits.join(' | ') + '\n' +
    'Passos de uso informados: ' + (f.howto.length ? f.howto.join(' | ') : 'não informados, deduza 3 ou 4 passos simples') + '\n' +
    'Bônus: ' + (f.bonus.length ? f.bonus.join(' | ') : 'nenhum') + '\n' +
    'Garantia: ' + f.guaranteeDays + ' dias\n' +
    (f.customPrompt ? 'INSTRUÇÕES EXTRAS DO VENDEDOR (siga com prioridade): ' + f.customPrompt + '\n' : '') +
    '\nRetorne este JSON:\n' +
    '{"tag":"frase curta acima do título, máx 5 palavras (ou vazio)",' +
    '"headline":"promessa clara do resultado principal, máx 14 palavras",' +
    '"subheadline":"máx 28 palavras, explica como",' +
    '"cta":"botão, máx 5 palavras, começa com verbo",' +
    '"painsTitle":"pergunta curta com a qual o público se identifica",' +
    '"pains":["4 a 5 dores concretas, 1 frase cada, na voz do público"],' +
    '"contentsTitle":"título do sumário, máx 8 palavras",' +
    '"contents":[{"title":"nome do item","text":"1 frase: o que a pessoa ganha com ele"}],' +
    '"painTitle":"título que liga a dor à solução, máx 12 palavras",' +
    '"painText":"3 parágrafos curtos separados por linha em branco: 1) toca na dor com empatia 2) mostra o custo de continuar assim 3) apresenta o produto como o caminho",' +
    '"howtoTitle":"título da seção, máx 6 palavras",' +
    '"steps":[{"title":"verbo + ação","text":"1 frase"}],' +
    '"bonus":[{"title":"nome","text":"1 frase do valor"}],' +
    '"offerTitle":"máx 8 palavras",' +
    '"offerItems":["até 6 itens curtos resumindo o que a pessoa leva"],' +
    '"offerNote":"frase curta de segurança no pagamento",' +
    '"guaranteeTitle":"máx 6 palavras",' +
    '"guaranteeText":"2 frases, tom tranquilizador",' +
    '"faq":[{"question":"","answer":""}]}\n' +
    'Regras do JSON: "contents" deve ter exatamente ' + f.benefits.length + ' itens (reescreva cada conteúdo informado, na mesma ordem). ' +
    '"steps" com 3 ou 4 itens. "bonus" com exatamente ' + f.bonus.length + ' itens (vazio se nenhum). "faq" com 4 itens sobre dúvidas comuns de compra, acesso e uso.'

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.PAGE_COPY_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'system', content: COPY_RULES }, { role: 'user', content: user }],
      max_tokens: 2800, temperature: 0.7, response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content
  if (!raw) throw new Error('A IA não respondeu. Tente de novo.')
  const copy = JSON.parse(raw)
  if (!copy.headline) throw new Error('A IA não conseguiu montar o título. Tente de novo.')
  return copy
}

async function generateImage(f: any): Promise<string | null> {
  try {
    const img = await gerarImagemOpenAI({
      prompt: 'Professional product mockup for "' + f.productName + '" targeting ' + (f.audience || 'general audience') + '. Clean modern design, premium feel, no text or words, vibrant colors, studio lighting.',
      size: '1024x1024', quality: 'medium',
    })
    const b64: string | null = img.b64
    if (b64) return b64
    const url: string | null = img.url
    if (url) {
      const imgRes = await fetch(url)
      return Buffer.from(await imgRes.arrayBuffer()).toString('base64')
    }
    return null
  } catch (e) {
    console.error('[generate-page] erro na imagem:', e)
    return null
  }
}

// Guarda a imagem no Storage (link curto, pagina leve). Se falhar, usa a imagem embutida.
async function storeImage(b64: string, userId: string, slug: string): Promise<string> {
  try {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const path = userId + '/' + slug + '.png'
    const up = await admin.storage.from('page-images').upload(path, Buffer.from(b64, 'base64'), { contentType: 'image/png', cacheControl: '31536000', upsert: true })
    if (!up.error) return admin.storage.from('page-images').getPublicUrl(path).data.publicUrl
  } catch (e) {
    console.error('[generate-page] erro ao guardar imagem:', e)
  }
  return 'data:image/png;base64,' + b64
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
    )

    const user = (await supabase.auth.getUser()).data.user
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const profileResult = await supabase
      .from('profiles')
      .select('credits_sites_used, credits_sites_extra, subscription_status, is_admin, plans(credits_sites, is_unlimited)')
      .eq('id', user.id)
      .single()

    const profile = profileResult.data
    if (!profile) return NextResponse.json({ error: 'Perfil nao encontrado' }, { status: 404 })

    const isAdmin = (profile as any)?.is_admin === true
    const used = profile?.credits_sites_used || 0

    if (!isAdmin) {
      const status = profile.subscription_status
      if (status !== 'active' && status !== 'trialing') {
        return NextResponse.json({ error: 'Assine um plano para usar este recurso.', requiresPlan: true }, { status: 403 })
      }
      const plan = (profile as any)?.plans
      const extra = (profile as any)?.credits_sites_extra || 0
      const limit = (plan?.credits_sites || 0) + extra
      if (!plan?.is_unlimited && used >= limit) return NextResponse.json({ error: 'Sem creditos de site disponiveis' }, { status: 403 })
    }

    const body = await req.json()
    const productName = clean(body.productName, 120)
    if (!productName) return NextResponse.json({ error: 'Nome do produto e obrigatorio' }, { status: 400 })

    const guaranteeText = clean(body.guarantee, 200)
    const daysMatch = guaranteeText.match(/(\d{1,3})\s*dias?/i)
    const f = {
      productName,
      description: clean(body.description, 600),
      audience: clean(body.audience, 200),
      price: clean(body.price, 20).replace(/^R\$\s*/i, ''),
      oldPrice: clean(body.oldPrice, 20).replace(/^R\$\s*/i, ''),
      period: clean(body.period, 60) || 'pagamento único',
      pains: cleanList(body.pains, 5, 200),
      benefits: cleanList(body.benefits, 7, 160),
      howto: cleanList(body.howto, 5, 160),
      bonus: cleanList(String(body.bonus || '').split('\n'), 4, 160),
      guaranteeDays: daysMatch ? daysMatch[1] : '7',
      checkoutUrl: safeUrl(body.checkoutUrl),
      theme: body.theme === 'dark' ? 'dark' : 'light',
      accent: safeAccent(body.accent),
      pixelId: safePixel(body.pixelId),
      mediaType: ['ai', 'image', 'video', 'none'].indexOf(body.mediaType) > -1 ? body.mediaType : 'ai',
      mediaUrl: clean(body.mediaUrl, 500),
      customPrompt: clean(body.customPrompt, 800),
      testimonials: (Array.isArray(body.testimonials) ? body.testimonials : [])
        .map(function(t: any) { return { name: clean(t && t.name, 60), role: clean(t && t.role, 80), text: clean(t && t.text, 400) } })
        .filter(function(t: any) { return t.text && t.name }).slice(0, 6),
    }
    if (f.benefits.length < 2) return NextResponse.json({ error: 'Informe pelo menos 2 itens de conteudo.' }, { status: 400 })
    if (f.mediaType === 'video' && !/^https?:\/\//i.test(f.mediaUrl)) return NextResponse.json({ error: 'Cole o link do video (YouTube ou Vimeo).' }, { status: 400 })

    const [copy, imageB64] = await Promise.all([
      generateCopy(f),
      f.mediaType === 'ai' ? generateImage(f) : Promise.resolve(null),
    ])

    const slug = slugify(productName) + '-' + Date.now().toString(36)

    let mediaImage = ''
    if (f.mediaType === 'ai' && imageB64) mediaImage = await storeImage(imageB64, user.id, slug)
    if (f.mediaType === 'image') mediaImage = f.mediaUrl

    const contents = f.benefits.map(function(b, i) {
      const c = (copy.contents || [])[i]
      return { title: clean(c && c.title, 120) || b, text: clean(c && c.text, 220) }
    })
    const bonusItems = f.bonus.map(function(b, i) {
      const c = (copy.bonus || [])[i]
      return { title: clean(c && c.title, 120) || b, text: clean(c && c.text, 240), image: '' }
    })
    const ctaText = clean(copy.cta, 40) || 'Quero garantir o meu'

    const sections: Section[] = [
      { id: 'headline', type: 'headline', visible: true, data: { topBar: '', tag: clean(copy.tag, 40) || f.audience.slice(0, 40), title: clean(copy.headline, 160), subtitle: clean(copy.subheadline, 260), btnText: ctaText, btnUrl: f.checkoutUrl, note: 'Compra segura' } },
      { id: 'media', type: 'media', visible: f.mediaType !== 'none' && (f.mediaType === 'video' || !!mediaImage), data: { mode: f.mediaType === 'video' ? 'video' : (mediaImage ? 'image' : 'none'), image: mediaImage, videoUrl: f.mediaType === 'video' ? f.mediaUrl : '', caption: '' } },
      { id: 'contents', type: 'contents', visible: true, data: { painsTitle: clean(copy.painsTitle, 120) || 'Isso acontece com você?', pains: cleanList(copy.pains, 5, 220).length ? cleanList(copy.pains, 5, 220) : f.pains, title: clean(copy.contentsTitle, 100) || 'O que você vai encontrar', items: contents } },
      { id: 'painText', type: 'painText', visible: true, data: { eyebrow: 'A verdade', title: clean(copy.painTitle, 160), text: String(copy.painText || '').slice(0, 1800) } },
      { id: 'testimonials', type: 'testimonials', visible: f.testimonials.length > 0, data: { title: 'O que dizem quem já usou', items: f.testimonials.length ? f.testimonials.map(function(t: any) { return { ...t, stars: 5 } }) : [{ name: '', role: '', text: '', stars: 5 }] } },
      { id: 'howto', type: 'howto', visible: true, data: { title: clean(copy.howtoTitle, 80) || 'Como usar', steps: (copy.steps || []).slice(0, 5).map(function(s: any) { return { title: clean(s && s.title, 120), text: clean(s && s.text, 240) } }).filter(function(s: any) { return s.title }) } },
      { id: 'bonus', type: 'bonus', visible: bonusItems.length > 0, data: { title: 'Bônus exclusivos', items: bonusItems.length ? bonusItems : [{ title: '', text: '', image: '' }] } },
      { id: 'offer', type: 'offer', visible: true, data: { title: clean(copy.offerTitle, 100) || 'Garanta o seu acesso', price: f.price, oldPrice: f.oldPrice, period: f.period, items: cleanList(copy.offerItems, 6, 120), btnText: ctaText, btnUrl: f.checkoutUrl, note: clean(copy.offerNote, 80) || 'Pagamento seguro' } },
      { id: 'guarantee', type: 'guarantee', visible: true, data: { title: clean(copy.guaranteeTitle, 80) || 'Garantia', days: f.guaranteeDays, text: clean(copy.guaranteeText, 400) } },
      { id: 'faq', type: 'faq', visible: true, data: { title: 'Perguntas frequentes', items: (copy.faq || []).slice(0, 6).map(function(q: any) { return { question: clean(q && q.question, 160), answer: clean(q && q.answer, 400) } }).filter(function(q: any) { return q.question }) } },
    ]

    const html = renderSalesPage(sections, { theme: f.theme as 'light' | 'dark', accent: f.accent, pixelId: f.pixelId, title: productName })

    const ins = await supabase.from('sales_pages').insert({
      user_id: user.id, slug, html, sections,
      product_name: productName,
      theme: f.theme, active: true,
      form_data: { audience: f.audience, description: f.description, benefits: f.benefits, pains: f.pains, bonus: f.bonus, guarantee: guaranteeText, checkoutUrl: f.checkoutUrl, price: f.price, accent: f.accent, pixelId: f.pixelId, mediaType: f.mediaType },
    })
    if (ins.error) throw ins.error

    if (!isAdmin) {
      await supabase.from('profiles').update({ credits_sites_used: used + 1 }).eq('id', user.id)
    }

    return NextResponse.json({ slug, url: (process.env.NEXT_PUBLIC_APP_URL || 'https://mcpia.site') + '/p/' + slug })
  } catch (err: any) {
    console.error('generate-page error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

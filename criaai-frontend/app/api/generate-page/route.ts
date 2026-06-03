import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

function slugify(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
}

function buildHtml(copy: any, form: any, theme: string, heroImageBase64: string | null) {
  const dark = theme === 'dark'
  const bg = dark ? '#0a0a0f' : '#ffffff'
  const surface = dark ? '#141420' : '#f4f4f8'
  const surface2 = dark ? '#1c1c2e' : '#eeeef5'
  const text = dark ? '#f0eeff' : '#0f0f1a'
  const muted = dark ? '#9990bb' : '#555577'
  const accent = '#7c5cfc'
  const accentDark = '#5a3dd4'
  const border = dark ? 'rgba(124,92,252,0.15)' : 'rgba(124,92,252,0.12)'

  const testimonialsHtml = (copy.testimonials || []).map((t: any) => `
    <div class="testimonial-card">
      <div class="stars">★★★★★</div>
      <p class="testimonial-text">"${t.text}"</p>
      <div class="testimonial-author">
        <div class="author-avatar">${t.name[0]}</div>
        <div>
          <div class="author-name">${t.name}</div>
          <div class="author-role">${t.role}</div>
        </div>
      </div>
    </div>`).join('')

  const benefitsHtml = (copy.benefits || []).map((b: string) => `
    <li class="benefit-item">
      <div class="benefit-check">✓</div>
      <span>${b}</span>
    </li>`).join('')

  const faqHtml = (copy.faq || []).map((f: any, i: number) => `
    <div class="faq-item" onclick="toggleFaq(${i})">
      <div class="faq-question">
        <span>${f.question}</span>
        <span class="faq-icon" id="faq-icon-${i}">+</span>
      </div>
      <div class="faq-answer" id="faq-${i}">${f.answer}</div>
    </div>`).join('')

  const heroImage = heroImageBase64
    ? `<div class="hero-image-wrap"><img src="${heroImageBase64}" alt="${form.productName}" class="hero-image"/></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${copy.headline || form.productName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:${bg};color:${text};overflow-x:hidden;}

/* ANIMATIONS */
@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.animate{opacity:0;animation:fadeUp .7s ease forwards;}
.animate-delay-1{animation-delay:.15s}
.animate-delay-2{animation-delay:.3s}
.animate-delay-3{animation-delay:.45s}
.animate-delay-4{animation-delay:.6s}

/* HERO */
.hero{min-height:90vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 24px 60px;position:relative;overflow:hidden;background:${dark?'linear-gradient(135deg,#0a0a0f 0%,#12103a 50%,#0a0a0f 100%)':'linear-gradient(135deg,#f8f4ff 0%,#ede8ff 50%,#f8f4ff 100%)'}}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(124,92,252,0.25) 0%,transparent 70%);pointer-events:none;}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(124,92,252,0.15);border:1px solid rgba(124,92,252,0.35);color:#a78bfa;font-size:13px;font-weight:600;padding:7px 18px;border-radius:99px;letter-spacing:.05em;text-transform:uppercase;margin-bottom:28px;}
.hero-badge::before{content:'✦';font-size:10px;}
.hero h1{font-size:clamp(32px,5.5vw,62px);font-weight:900;line-height:1.1;max-width:800px;margin-bottom:24px;background:${dark?'linear-gradient(135deg,#fff 0%,#c4b5fd 100%)':'linear-gradient(135deg,#1a0050 0%,#7c5cfc 100%)'};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hero-sub{font-size:clamp(16px,2vw,20px);color:${muted};max-width:580px;line-height:1.7;margin-bottom:40px;}
.hero-image-wrap{margin:40px auto 0;max-width:480px;animation:float 4s ease-in-out infinite;}
.hero-image{width:100%;border-radius:20px;box-shadow:0 30px 80px rgba(124,92,252,0.3);}

/* CTA BUTTON */
.cta-btn{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,${accent},${accentDark});color:#fff;font-size:18px;font-weight:700;padding:18px 42px;border-radius:14px;text-decoration:none;border:none;cursor:pointer;animation:pulse 2.5s ease-in-out infinite;box-shadow:0 8px 30px rgba(124,92,252,0.4);transition:transform .2s,box-shadow .2s;}
.cta-btn:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(124,92,252,0.5);}
.cta-btn-secondary{margin-top:16px;display:block;font-size:13px;color:${muted};text-align:center;}

/* SECTIONS */
section{padding:80px 24px;}
.container{max-width:760px;margin:0 auto;}
.section-label{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${accent};margin-bottom:12px;}
.section-title{font-size:clamp(24px,3.5vw,38px);font-weight:800;line-height:1.2;margin-bottom:16px;}
.section-sub{font-size:17px;color:${muted};line-height:1.7;max-width:540px;}

/* BENEFITS */
.benefits-section{background:${surface};}
.benefit-item{display:flex;align-items:flex-start;gap:16px;padding:20px;background:${bg};border:1px solid ${border};border-radius:14px;margin-bottom:12px;transition:transform .2s,border-color .2s;}
.benefit-item:hover{transform:translateX(4px);border-color:rgba(124,92,252,0.4);}
.benefit-check{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,${accent},${accentDark});color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;margin-top:2px;}
.benefit-item span{font-size:16px;line-height:1.6;color:${text};}

/* TESTIMONIALS */
.testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:40px;}
.testimonial-card{background:${surface};border:1px solid ${border};border-radius:16px;padding:28px;transition:transform .2s,box-shadow .2s;}
.testimonial-card:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(124,92,252,0.15);}
.stars{color:#f59e0b;font-size:18px;margin-bottom:12px;letter-spacing:2px;}
.testimonial-text{font-size:15px;line-height:1.7;color:${muted};margin-bottom:20px;font-style:italic;}
.testimonial-author{display:flex;align-items:center;gap:12px;}
.author-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,${accent},${accentDark});color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;}
.author-name{font-weight:700;font-size:14px;color:${text};}
.author-role{font-size:13px;color:${muted};}

/* PRICE BOX */
.price-section{background:${dark?'linear-gradient(135deg,#12103a,#0a0a0f)':'linear-gradient(135deg,#ede8ff,#f8f4ff)'};text-align:center;}
.price-box{background:${bg};border:1px solid ${border};border-radius:24px;padding:48px 40px;max-width:500px;margin:0 auto;box-shadow:0 20px 60px rgba(124,92,252,0.15);}
.price-label{font-size:13px;color:${muted};text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;}
.price-value{font-size:clamp(48px,8vw,72px);font-weight:900;color:${accent};line-height:1;}
.price-currency{font-size:28px;vertical-align:super;}
.price-period{font-size:16px;color:${muted};margin-top:8px;margin-bottom:32px;}

/* BONUS */
.bonus-box{background:${dark?'rgba(124,92,252,0.1)':'rgba(124,92,252,0.06)'};border:1px solid rgba(124,92,252,0.3);border-radius:16px;padding:32px;margin:40px 0;position:relative;overflow:hidden;}
.bonus-box::before{content:'🎁';position:absolute;right:24px;top:50%;transform:translateY(-50%);font-size:60px;opacity:0.15;}
.bonus-label{font-size:12px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;}
.bonus-text{font-size:20px;font-weight:700;color:${text};}

/* GUARANTEE */
.guarantee-box{display:flex;align-items:center;gap:24px;background:${surface2};border:1px solid ${border};border-radius:16px;padding:28px 32px;max-width:600px;margin:0 auto;}
.guarantee-icon{font-size:52px;flex-shrink:0;}
.guarantee-title{font-weight:700;font-size:18px;color:${text};margin-bottom:6px;}
.guarantee-text{color:${muted};font-size:15px;line-height:1.6;}

/* URGENCY */
.urgency-bar{background:linear-gradient(135deg,${accent},${accentDark});color:#fff;text-align:center;padding:14px 24px;font-weight:700;font-size:15px;letter-spacing:.03em;}
.urgency-bar span{opacity:.85;font-weight:400;}

/* FAQ */
.faq-section{background:${surface};}
.faq-item{background:${bg};border:1px solid ${border};border-radius:12px;margin-bottom:10px;overflow:hidden;cursor:pointer;transition:border-color .2s;}
.faq-item:hover{border-color:rgba(124,92,252,0.4);}
.faq-question{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;font-weight:600;font-size:16px;color:${text};}
.faq-icon{font-size:22px;color:${accent};font-weight:300;transition:transform .3s;}
.faq-answer{max-height:0;overflow:hidden;transition:max-height .4s ease,padding .3s;font-size:15px;color:${muted};line-height:1.7;padding:0 24px;}
.faq-answer.open{max-height:200px;padding:0 24px 20px;}
.faq-icon.open{transform:rotate(45deg);}

/* FOOTER */
footer{text-align:center;padding:40px 24px;color:${muted};font-size:13px;border-top:1px solid ${border};}

@media(max-width:600px){
  .guarantee-box{flex-direction:column;text-align:center;}
  .price-box{padding:32px 20px;}
}
</style>
</head>
<body>

<div class="urgency-bar">
  🔥 Oferta por tempo limitado <span>— Garanta agora antes que acabe!</span>
</div>

<section class="hero">
  <div class="hero-badge">${form.audience || 'Para você'}</div>
  <h1 class="animate">${copy.headline}</h1>
  <p class="hero-sub animate animate-delay-1">${copy.subheadline}</p>
  ${heroImage}
  <div class="animate animate-delay-2" style="margin-top:40px;">
    <a href="${form.checkoutUrl || '#'}" class="cta-btn">
      ✦ ${copy.cta || 'Quero Comprar Agora'}
    </a>
    <span class="cta-btn-secondary">🔒 Compra 100% segura · Acesso imediato</span>
  </div>
</section>

<section class="benefits-section">
  <div class="container">
    <div class="section-label animate">O que você vai receber</div>
    <h2 class="section-title animate animate-delay-1">${copy.benefitsTitle || 'Tudo que você precisa para transformar sua vida'}</h2>
    <ul style="list-style:none;margin-top:32px;" class="animate animate-delay-2">
      ${benefitsHtml}
    </ul>
  </div>
</section>

${copy.testimonials?.length ? `
<section>
  <div class="container">
    <div class="section-label animate">Depoimentos</div>
    <h2 class="section-title animate animate-delay-1">O que dizem nossos clientes</h2>
    <div class="testimonials-grid animate animate-delay-2">${testimonialsHtml}</div>
  </div>
</section>` : ''}

${copy.bonus ? `
<section>
  <div class="container">
    <div class="bonus-box animate">
      <div class="bonus-label">Bônus exclusivo</div>
      <div class="bonus-text">${copy.bonus}</div>
    </div>
  </div>
</section>` : ''}

<section class="price-section">
  <div class="container" style="text-align:center;">
    <div class="section-label animate">Investimento</div>
    <h2 class="section-title animate animate-delay-1">Garanta o seu acesso agora</h2>
    <div class="price-box animate animate-delay-2">
      <div class="price-label">Apenas</div>
      <div class="price-value"><span class="price-currency">R$</span>${form.price?.replace('R$','').replace(',','.')}</div>
      <div class="price-period">pagamento único · acesso vitalício</div>
      <a href="${form.checkoutUrl || '#'}" class="cta-btn" style="width:100%;justify-content:center;font-size:17px;">
        ✦ ${copy.cta || 'Quero Comprar Agora'}
      </a>
      <span class="cta-btn-secondary">🔒 Checkout seguro · Satisfação garantida</span>
    </div>
    ${copy.guarantee ? `
    <div class="guarantee-box animate animate-delay-3" style="margin-top:32px;">
      <div class="guarantee-icon">🛡️</div>
      <div>
        <div class="guarantee-title">Garantia ${form.guarantee || '7 dias'}</div>
        <div class="guarantee-text">${copy.guarantee}</div>
      </div>
    </div>` : ''}
  </div>
</section>

${copy.faq?.length ? `
<section class="faq-section">
  <div class="container">
    <div class="section-label animate">Dúvidas</div>
    <h2 class="section-title animate animate-delay-1">Perguntas frequentes</h2>
    <div style="margin-top:32px;" class="animate animate-delay-2">${faqHtml}</div>
  </div>
</section>` : ''}

<section style="text-align:center;padding:60px 24px;">
  <div class="container">
    <h2 class="section-title animate">${copy.finalCta || 'Não perca mais tempo. Comece hoje.'}</h2>
    <p class="section-sub animate animate-delay-1" style="margin:16px auto 32px;">${copy.finalCtaSub || 'Centenas de pessoas já transformaram suas vidas. Agora é a sua vez.'}</p>
    <a href="${form.checkoutUrl || '#'}" class="cta-btn animate animate-delay-2">
      ✦ ${copy.cta || 'Quero Comprar Agora'}
    </a>
  </div>
</section>

<footer>
  <p>© ${new Date().getFullYear()} ${form.productName} · Todos os direitos reservados</p>
</footer>

<script>
// Intersection Observer para animações
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if(e.isIntersecting) e.target.style.animationPlayState = 'running' })
}, {threshold: 0.1})
document.querySelectorAll('.animate').forEach(el => {
  el.style.animationPlayState = 'paused'
  observer.observe(el)
})

// FAQ toggle
function toggleFaq(i) {
  const answer = document.getElementById('faq-'+i)
  const icon = document.getElementById('faq-icon-'+i)
  answer.classList.toggle('open')
  icon.classList.toggle('open')
}
</script>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const form = await req.json()
    const { productName, price, audience, benefits, bonus, guarantee, checkoutUrl, theme } = form

    if (!productName) return NextResponse.json({ error: 'Nome do produto é obrigatório' }, { status: 400 })

    // Verifica créditos
    const { data: profile } = await supabase.from('profiles').select('credits_ebooks_used, plans(credits_ebooks)').eq('id', user.id).single()
    const plan = (profile as any)?.plans
    const used = profile?.credits_ebooks_used || 0
    const limit = plan?.credits_ebooks || 3
    if (used >= limit) return NextResponse.json({ error: 'Sem créditos de ebook disponíveis' }, { status: 403 })

    // Gera copy com GPT e imagem hero com DALL-E em paralelo
    const [copyRes, imageRes] = await Promise.all([
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `Crie copy persuasivo para uma página de vendas em português:
Produto: ${productName}
Preço: R$${price}
Público-alvo: ${audience}
Benefícios: ${(benefits||[]).filter(Boolean).join(', ')}
Bônus: ${bonus || 'nenhum'}
Garantia: ${guarantee || '7 dias'}

Retorne APENAS JSON válido:
{
  "headline": "título principal impactante e persuasivo (max 10 palavras)",
  "subheadline": "subtítulo que explica o benefício principal (max 20 palavras)",
  "benefitsTitle": "título da seção de benefícios (max 8 palavras)",
  "benefits": ["benefício 1 reescrito de forma persuasiva", "benefício 2", "benefício 3"],
  "bonus": "${bonus ? 'bonus reescrito de forma atraente' : ''}",
  "guarantee": "texto da garantia tranquilizador",
  "cta": "texto do botão de compra (max 6 palavras, imperativo)",
  "finalCta": "título da seção final persuasivo",
  "finalCtaSub": "subtítulo da seção final",
  "testimonials": [
    {"name": "Nome Sobrenome", "role": "Profissão, Cidade", "text": "depoimento realista e específico de 2-3 frases"},
    {"name": "Nome Sobrenome", "role": "Profissão, Cidade", "text": "depoimento realista e específico de 2-3 frases"},
    {"name": "Nome Sobrenome", "role": "Profissão, Cidade", "text": "depoimento realista e específico de 2-3 frases"}
  ],
  "faq": [
    {"question": "pergunta frequente 1", "answer": "resposta clara e objetiva"},
    {"question": "pergunta frequente 2", "answer": "resposta clara e objetiva"},
    {"question": "pergunta frequente 3", "answer": "resposta clara e objetiva"}
  ]
}`
          }],
          max_tokens: 1500, temperature: 0.8, response_format: { type: 'json_object' }
        })
      }),
      fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `Professional product mockup for "${productName}" targeting ${audience || 'general audience'}. Clean modern design, premium feel, no text or words, vibrant colors, studio lighting, isolated on transparent or gradient background. High quality digital product illustration.`,
          n: 1, size: '1024x1024', quality: 'standard'
        })
      })
    ])

    const copyData = await copyRes.json()
    const imageData = await imageRes.json()
    const copy = JSON.parse(copyData.choices?.[0]?.message?.content || '{}')
    const dalleUrl = imageData.data?.[0]?.url || null

    // Converte imagem para base64
    let heroImageBase64: string | null = null
    if (dalleUrl) {
      try {
        const imgRes = await fetch(dalleUrl)
        const arrayBuffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const mime = imgRes.headers.get('content-type') || 'image/png'
        heroImageBase64 = `data:${mime};base64,${base64}`
      } catch (e) {
        console.error('Erro ao converter hero image:', e)
      }
    }

    const html = buildHtml(copy, form, theme || 'light', heroImageBase64)
    const slug = `${slugify(productName)}-${Date.now().toString(36)}`

    // Salva no banco
    await supabase.from('sales_pages').insert({
      user_id: user.id, slug, html_content: html,
      product_name: productName, price: parseFloat(price) || 0,
      theme: theme || 'light', active: true,
      metadata: { audience, benefits, bonus, guarantee, checkoutUrl }
    })

    await supabase.from('profiles').update({ credits_ebooks_used: used + 1 }).eq('id', user.id)

    return NextResponse.json({ slug, url: `${process.env.NEXT_PUBLIC_APP_URL}/p/${slug}` })
  } catch (err: any) {
    console.error('generate-page error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

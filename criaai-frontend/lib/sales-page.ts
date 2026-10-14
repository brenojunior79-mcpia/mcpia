// Montador unico das paginas de vendas.
// O gerador, o editor (preview e salvar) e a pagina publica usam este mesmo arquivo,
// entao o que o aluno ve no editor e' exatamente o que vai pro ar.
//
// Ordem padrao da pagina:
// 1 Headline · 2 Imagem/video · 3 Conteudo/sumario/dores · 4 Texto que bate na dor
// 5 Depoimentos · 6 Como usar · 7 Bonus · 8 Oferta · 9 Garantia · (FAQ no fim)

export type SectionType =
  | 'headline' | 'media' | 'contents' | 'painText' | 'testimonials'
  | 'howto' | 'bonus' | 'offer' | 'guarantee' | 'faq' | 'cta' | 'image'

export interface Section {
  id: string
  type: SectionType
  visible: boolean
  data: any
}

export interface RenderOptions {
  theme: 'light' | 'dark'
  accent?: string
  pixelId?: string
  title?: string
  preview?: boolean // no editor: sem pixel e sem barra fixa
}

export const SECTION_LABELS: Record<SectionType, string> = {
  headline: '🎯 Headline',
  media: '🎬 Imagem ou vídeo',
  contents: '📋 Conteúdo, sumário e dores',
  painText: '💔 Texto que bate na dor',
  testimonials: '⭐ Depoimentos',
  howto: '🧭 Como usar o produto',
  bonus: '🎁 Bônus',
  offer: '💰 Oferta',
  guarantee: '🛡️ Garantia',
  faq: '❓ Perguntas frequentes',
  cta: '🚀 Chamada final',
  image: '🖼️ Imagem extra',
}

export const DEFAULT_ACCENT = '#7c5cfc'

// ---------- seguranca: tudo que o aluno digita passa por aqui ----------

export function esc(v: any): string {
  return String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// texto com **negrito** e quebra de linha
function rich(v: any): string {
  return esc(v).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')
}

export function safeUrl(u: any): string {
  const s = String(u || '').trim()
  if (/^https?:\/\/[^\s"'<>]+$/i.test(s)) return s
  if (/^#[\w-]*$/.test(s)) return s
  return '#'
}

function safeImg(u: any): string {
  const s = String(u || '').trim()
  if (/^https?:\/\/[^\s"'<>]+$/i.test(s)) return s
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s)) return s
  return ''
}

export function safeAccent(c: any): string {
  const s = String(c || '').trim()
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : DEFAULT_ACCENT
}

export function safePixel(p: any): string {
  const s = String(p || '').replace(/\s/g, '')
  return /^\d{6,20}$/.test(s) ? s : ''
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function darken(hex: string, k: number): string {
  const [r, g, b] = hexToRgb(hex)
  const f = function(x: number) { return Math.max(0, Math.min(255, Math.round(x * (1 - k)))).toString(16).padStart(2, '0') }
  return '#' + f(r) + f(g) + f(b)
}

function priceNumber(p: any): number | null {
  const s = String(p || '').replace(/[^\d,.]/g, '')
  if (!s) return null
  const n = s.indexOf(',') > -1 ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s)
  return isFinite(n) && n > 0 ? n : null
}

export function formatPrice(p: any): string {
  const n = priceNumber(p)
  if (n === null) return esc(String(p || '').replace(/^R\$\s*/i, ''))
  return n.toLocaleString('pt-BR', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })
}

// ---------- video ----------

function videoEmbed(url: string): { kind: 'iframe' | 'file'; src: string } | null {
  const u = String(url || '').trim()
  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)
  if (yt) return { kind: 'iframe', src: 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?rel=0&modestbranding=1' }
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return { kind: 'iframe', src: 'https://player.vimeo.com/video/' + vm[1] + '?title=0&byline=0&portrait=0&dnt=1' }
  if (/^https?:\/\/[^\s"'<>]+\.(mp4|webm|mov)(\?[^\s"'<>]*)?$/i.test(u)) return { kind: 'file', src: u }
  return null
}

// ---------- compatibilidade com paginas antigas (editor antigo) ----------

export function normalizeSections(input: any): Section[] {
  if (!Array.isArray(input)) return []
  const out: Section[] = []
  input.forEach(function(s: any) {
    if (!s || !s.type) return
    const d = s.data || {}
    const base = { id: s.id || (s.type + '-' + out.length), visible: s.visible !== false }
    switch (s.type) {
      case 'hero':
        out.push({ ...base, type: 'headline', data: { tag: d.tag || '', title: d.title || '', subtitle: d.subtitle || '', btnText: d.btnText || '', btnUrl: d.btnUrl || '#', note: '', topBar: '' } })
        if (d.image) out.push({ id: 'media-' + out.length, type: 'media', visible: true, data: { mode: 'image', image: d.image, videoUrl: '', caption: '' } })
        break
      case 'benefits':
        out.push({ ...base, type: 'contents', data: { painsTitle: '', pains: [], title: d.title || 'O que você vai receber', items: (d.items || []).filter(function(x: any) { return x }).map(function(x: any) { return typeof x === 'string' ? { title: x, text: '' } : x }) } })
        break
      case 'bonus':
        if (Array.isArray(d.items)) out.push({ ...base, type: 'bonus', data: d })
        else out.push({ ...base, type: 'bonus', data: { title: d.title || 'Bônus exclusivo', items: d.text || d.image ? [{ title: '', text: d.text || '', image: d.image || '' }] : [] } })
        break
      case 'headline': case 'media': case 'contents': case 'painText': case 'testimonials':
      case 'howto': case 'offer': case 'guarantee': case 'faq': case 'cta': case 'image':
        out.push({ ...base, type: s.type, data: d })
        break
      default:
        break
    }
  })
  return out
}

export function newSection(type: SectionType): Section {
  const id = type + '-' + Date.now().toString(36)
  const data: Record<SectionType, any> = {
    headline: { tag: '', title: 'Seu título principal', subtitle: '', btnText: 'Quero começar agora', btnUrl: '#', note: 'Compra segura', topBar: '' },
    media: { mode: 'image', image: '', videoUrl: '', caption: '' },
    contents: { painsTitle: 'Isso acontece com você?', pains: ['', '', ''], title: 'O que você vai encontrar', items: [{ title: '', text: '' }, { title: '', text: '' }, { title: '', text: '' }] },
    painText: { eyebrow: 'A verdade', title: '', text: '' },
    testimonials: { title: 'O que dizem quem já usou', items: [{ name: '', role: '', text: '' }] },
    howto: { title: 'Como usar', steps: [{ title: '', text: '' }, { title: '', text: '' }, { title: '', text: '' }] },
    bonus: { title: 'Bônus exclusivos', items: [{ title: '', text: '', image: '' }] },
    offer: { title: 'Garanta o seu acesso', price: '', oldPrice: '', period: 'pagamento único', items: [], btnText: 'Quero garantir o meu', btnUrl: '#', note: 'Compra segura' },
    guarantee: { title: 'Garantia', days: '7', text: '' },
    faq: { title: 'Perguntas frequentes', items: [{ question: '', answer: '' }] },
    cta: { title: 'Pronto para começar?', subtitle: '', btnText: 'Quero começar agora', btnUrl: '#', note: '' },
    image: { image: '', caption: '' },
  }
  return { id, type, visible: true, data: data[type] }
}

// ---------- blocos ----------

function cta(label: string, url: string, extra?: string): string {
  return '<a href="' + esc(safeUrl(url)) + '" class="btn" data-cta' + (extra || '') + '><span>' + esc(label || 'Quero começar agora') + '</span></a>'
}

function head(eyebrow: string, title: string, sub?: string): string {
  return '<div class="head rv">' +
    (eyebrow ? '<div class="eyebrow">' + esc(eyebrow) + '</div>' : '') +
    (title ? '<h2>' + rich(title) + '</h2>' : '') +
    (sub ? '<p class="sub">' + rich(sub) + '</p>' : '') + '</div>'
}

function renderSection(s: Section, ctx: { firstCta: { label: string; url: string } }): string {
  const d = s.data || {}
  switch (s.type) {
    case 'headline': {
      return '<section class="s s-headline" id="topo">' +
        '<div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div>' +
        '<div class="wrap center">' +
        (d.tag ? '<div class="badge rv">' + esc(d.tag) + '</div>' : '') +
        '<h1 class="rv" style="--d:90ms">' + rich(d.title) + '</h1>' +
        (d.subtitle ? '<p class="lead rv" style="--d:180ms">' + rich(d.subtitle) + '</p>' : '') +
        (d.btnText ? '<div class="rv" style="--d:270ms">' + cta(d.btnText, d.btnUrl) + (d.note ? '<div class="note">🔒 ' + esc(d.note) + '</div>' : '') + '</div>' : '') +
        '</div></section>'
    }

    case 'media': {
      const cap = d.caption ? '<p class="cap">' + esc(d.caption) + '</p>' : ''
      if (d.mode === 'video') {
        const v = videoEmbed(d.videoUrl)
        if (!v) return ''
        const player = v.kind === 'iframe'
          ? '<iframe src="' + esc(v.src) + '" title="Vídeo" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
          : '<video src="' + esc(v.src) + '" controls playsinline preload="metadata"></video>'
        return '<section class="s s-media"><div class="wrap"><div class="video rv">' + player + '</div>' + cap + '</div></section>'
      }
      const img = safeImg(d.image)
      if (d.mode === 'none' || !img) return ''
      return '<section class="s s-media"><div class="wrap"><div class="shot rv"><img src="' + esc(img) + '" alt="' + esc(d.caption || 'Imagem do produto') + '" loading="lazy"/></div>' + cap + '</div></section>'
    }

    case 'contents': {
      const pains = (d.pains || []).filter(function(x: any) { return String(x || '').trim() })
      const items = (d.items || []).filter(function(x: any) { return x && String(x.title || '').trim() })
      let h = '<section class="s s-contents alt"><div class="wrap">'
      if (pains.length) {
        h += head('Dores', d.painsTitle || 'Isso acontece com você?')
        h += '<ul class="pains">' + pains.map(function(p: string, i: number) {
          return '<li class="rv" style="--d:' + (i * 80) + 'ms"><span class="x">✕</span><span>' + rich(p) + '</span></li>'
        }).join('') + '</ul>'
      }
      if (items.length) {
        h += '<div class="gap"></div>' + head('Sumário', d.title || 'O que você vai encontrar')
        h += '<div class="toc">' + items.map(function(it: any, i: number) {
          return '<div class="toc-i rv" style="--d:' + (i * 70) + 'ms"><span class="n">' + (i + 1) + '</span><div><b>' + rich(it.title) + '</b>' + (it.text ? '<p>' + rich(it.text) + '</p>' : '') + '</div></div>'
        }).join('') + '</div>'
      }
      return h + '</div></section>'
    }

    case 'painText': {
      if (!String(d.text || '').trim() && !String(d.title || '').trim()) return ''
      const paras = String(d.text || '').split(/\n{2,}|\n/).filter(function(p) { return p.trim() })
      return '<section class="s s-pain"><div class="wrap narrow">' +
        head(d.eyebrow || 'A verdade', d.title) +
        paras.map(function(p, i) { return '<p class="pt rv" style="--d:' + (i * 90) + 'ms">' + rich(p) + '</p>' }).join('') +
        '</div></section>'
    }

    case 'testimonials': {
      const items = (d.items || []).filter(function(x: any) { return x && String(x.text || '').trim() })
      if (!items.length) return ''
      return '<section class="s s-testi alt"><div class="wrap">' + head('Depoimentos', d.title || 'O que dizem quem já usou') +
        '<div class="grid">' + items.map(function(t: any, i: number) {
          const stars = Math.max(1, Math.min(5, Number(t.stars) || 5))
          return '<div class="card rv" style="--d:' + (i * 90) + 'ms"><div class="stars">' + '★'.repeat(stars) + '</div>' +
            '<p class="q">“' + rich(t.text) + '”</p>' +
            '<div class="who"><div class="av">' + esc(String(t.name || 'A').trim().charAt(0).toUpperCase()) + '</div><div><b>' + esc(t.name) + '</b><span>' + esc(t.role) + '</span></div></div></div>'
        }).join('') + '</div></div></section>'
    }

    case 'howto': {
      const steps = (d.steps || []).filter(function(x: any) { return x && String(x.title || '').trim() })
      if (!steps.length) return ''
      return '<section class="s s-how"><div class="wrap narrow">' + head('Passo a passo', d.title || 'Como usar') +
        '<div class="steps">' + steps.map(function(st: any, i: number) {
          return '<div class="step rv" style="--d:' + (i * 110) + 'ms"><div class="dot">' + (i + 1) + '</div><div class="sb"><b>' + rich(st.title) + '</b>' + (st.text ? '<p>' + rich(st.text) + '</p>' : '') + '</div></div>'
        }).join('') + '</div></div></section>'
    }

    case 'bonus': {
      const items = (d.items || []).filter(function(x: any) { return x && (String(x.title || '').trim() || String(x.text || '').trim()) })
      if (!items.length) return ''
      return '<section class="s s-bonus alt"><div class="wrap">' + head('Bônus', d.title || 'Bônus exclusivos') +
        '<div class="grid">' + items.map(function(b: any, i: number) {
          const img = safeImg(b.image)
          return '<div class="card bn rv" style="--d:' + (i * 90) + 'ms">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy"/>' : '<div class="gift">🎁</div>') +
            '<div class="tag">Bônus ' + (i + 1) + '</div>' + (b.title ? '<b>' + rich(b.title) + '</b>' : '') + (b.text ? '<p>' + rich(b.text) + '</p>' : '') + '</div>'
        }).join('') + '</div></div></section>'
    }

    case 'offer': {
      const items = (d.items || []).filter(function(x: any) { return String(x || '').trim() })
      const old = String(d.oldPrice || '').trim()
      return '<section class="s s-offer" id="oferta"><div class="wrap narrow center">' + head('Oferta', d.title || 'Garanta o seu acesso') +
        '<div class="offer rv"><div class="offer-in">' +
        (items.length ? '<ul class="inc">' + items.map(function(x: string) { return '<li><span class="ok">✓</span>' + rich(x) + '</li>' }).join('') + '</ul>' : '') +
        (old ? '<div class="old">De <s>R$ ' + formatPrice(old) + '</s> por apenas</div>' : '<div class="old">Apenas</div>') +
        '<div class="price"><small>R$</small>' + formatPrice(d.price) + '</div>' +
        (d.period ? '<div class="per">' + esc(d.period) + '</div>' : '') +
        cta(d.btnText || 'Quero garantir o meu', d.btnUrl, ' data-price="' + esc(priceNumber(d.price) || '') + '"') +
        (d.note ? '<div class="note">🔒 ' + esc(d.note) + '</div>' : '') +
        '</div></div></div></section>'
    }

    case 'guarantee': {
      if (!String(d.text || '').trim() && !String(d.days || '').trim()) return ''
      return '<section class="s s-guar alt"><div class="wrap narrow center"><div class="guar rv">' +
        '<div class="shield">🛡️</div>' +
        (d.days ? '<div class="days"><b>' + esc(d.days) + '</b><span>dias</span></div>' : '') +
        '<h2>' + rich(d.title || 'Garantia') + '</h2>' +
        (d.text ? '<p>' + rich(d.text) + '</p>' : '') + '</div></div></section>'
    }

    case 'faq': {
      const items = (d.items || []).filter(function(x: any) { return x && String(x.question || '').trim() })
      if (!items.length) return ''
      return '<section class="s s-faq"><div class="wrap narrow">' + head('Dúvidas', d.title || 'Perguntas frequentes') +
        items.map(function(f: any, i: number) {
          return '<details class="faq rv" style="--d:' + (i * 60) + 'ms"><summary>' + rich(f.question) + '</summary><div class="ans">' + rich(f.answer) + '</div></details>'
        }).join('') + '</div></section>'
    }

    case 'cta': {
      return '<section class="s s-cta"><div class="wrap narrow center">' + head('', d.title || 'Pronto para começar?', d.subtitle) +
        '<div class="rv">' + cta(d.btnText || ctx.firstCta.label, d.btnUrl || ctx.firstCta.url) + (d.note ? '<div class="note">🔒 ' + esc(d.note) + '</div>' : '') + '</div></div></section>'
    }

    case 'image': {
      const img = safeImg(d.image)
      if (!img) return ''
      return '<section class="s s-media"><div class="wrap"><div class="shot rv"><img src="' + esc(img) + '" alt="' + esc(d.caption || '') + '" loading="lazy"/></div>' + (d.caption ? '<p class="cap">' + esc(d.caption) + '</p>' : '') + '</div></section>'
    }

    default:
      return ''
  }
}

// ---------- pagina completa ----------

export function renderSalesPage(sectionsIn: Section[], opts: RenderOptions): string {
  const sections = normalizeSections(sectionsIn).filter(function(s) { return s.visible })
  const dark = opts.theme === 'dark'
  const accent = safeAccent(opts.accent)
  const accent2 = darken(accent, 0.28)
  const [ar, ag, ab] = hexToRgb(accent)
  const pixel = opts.preview ? '' : safePixel(opts.pixelId)
  const title = esc(opts.title || 'Página de vendas')

  const headline = sections.find(function(s) { return s.type === 'headline' })
  const offer = sections.find(function(s) { return s.type === 'offer' })
  const firstCta = {
    label: (offer && offer.data.btnText) || (headline && headline.data.btnText) || 'Quero começar agora',
    url: (offer && offer.data.btnUrl && offer.data.btnUrl !== '#' ? offer.data.btnUrl : '') || (headline && headline.data.btnUrl) || '#',
  }

  const body = sections.map(function(s) {
    const h = renderSection(s, { firstCta })
    // marca cada secao com o id dela (o editor usa para rolar ate a secao que esta sendo editada)
    return h ? h.replace(/^<section /, '<section data-sid="' + esc(s.id) + '" ') : h
  }).join('\n')
  const topBar = headline && String(headline.data.topBar || '').trim()
    ? '<div class="topbar">' + esc(headline.data.topBar) + '</div>' : ''
  const sticky = opts.preview ? '' :
    '<div class="sticky" id="sticky">' + cta(firstCta.label, firstCta.url) + '</div>'

  const pixelHead = pixel
    ? "<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','" + pixel + "');fbq('track','PageView');fbq('track','ViewContent');</script>" +
      '<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=' + pixel + '&ev=PageView&noscript=1"/></noscript>'
    : ''

  const bg = dark ? '#0b0a14' : '#ffffff'
  const alt = dark ? '#13112a' : '#f6f5ff'
  const card = dark ? '#1a1838' : '#ffffff'
  const text = dark ? '#f2f0ff' : '#14122b'
  const muted = dark ? '#a9a6c9' : '#58556f'
  const line = dark ? 'rgba(255,255,255,.09)' : 'rgba(20,18,43,.09)'

  const css = `
:root{--a:${accent};--a2:${accent2};--ar:${ar},${ag},${ab};--bg:${bg};--alt:${alt};--card:${card};--t:${text};--m:${muted};--l:${line}}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--t);line-height:1.6;overflow-x:hidden;-webkit-font-smoothing:antialiased}
img,video,iframe{max-width:100%;display:block}
b,strong{font-weight:800}
.wrap{max-width:1040px;margin:0 auto;padding:0 22px}
.narrow{max-width:760px}
.center{text-align:center}
.s{padding:84px 0;position:relative}
.alt{background:var(--alt)}
.gap{height:56px}
.topbar{background:linear-gradient(90deg,var(--a2),var(--a));color:#fff;text-align:center;padding:10px 16px;font-weight:700;font-size:14px}

/* revelar ao rolar */
.js .rv{opacity:0;transform:translateY(28px);transition:opacity .7s cubic-bezier(.2,.7,.2,1) var(--d,0ms),transform .7s cubic-bezier(.2,.7,.2,1) var(--d,0ms)}
.js .rv.in{opacity:1;transform:none}

/* headline */
.s-headline{padding:96px 0 72px;text-align:center;overflow:hidden;background:${dark ? 'radial-gradient(120% 90% at 50% 0%,rgba(var(--ar),.28),transparent 60%),var(--bg)' : 'radial-gradient(120% 90% at 50% 0%,rgba(var(--ar),.16),transparent 60%),var(--bg)'}}
.orb{position:absolute;border-radius:50%;filter:blur(70px);opacity:${dark ? '.35' : '.28'};pointer-events:none;background:var(--a)}
.o1{width:340px;height:340px;left:-80px;top:-60px;animation:drift 14s ease-in-out infinite}
.o2{width:300px;height:300px;right:-70px;top:120px;background:var(--a2);animation:drift 18s ease-in-out infinite reverse}
.o3{width:200px;height:200px;left:42%;bottom:40px;opacity:.18;animation:drift 16s ease-in-out infinite}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,28px) scale(1.12)}}
.s-headline .wrap{position:relative;z-index:1}
.badge{display:inline-block;padding:7px 18px;border-radius:99px;font-size:12px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--a);background:rgba(var(--ar),.12);border:1px solid rgba(var(--ar),.3);margin-bottom:22px;background-image:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.35) 50%,transparent 70%);background-size:220% 100%;animation:shimmer 3.5s linear infinite}
@keyframes shimmer{from{background-position:120% 0}to{background-position:-120% 0}}
h1{font-size:clamp(32px,6vw,58px);line-height:1.08;font-weight:900;letter-spacing:-.02em;max-width:860px;margin:0 auto 20px;background:linear-gradient(120deg,var(--t) 0%,var(--a) 55%,var(--t) 100%);background-size:220% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:flow 7s linear infinite}
@keyframes flow{to{background-position:220% center}}
h1 strong{font-weight:900}
.lead{font-size:clamp(17px,2.3vw,21px);color:var(--m);max-width:640px;margin:0 auto 34px}
.note{margin-top:14px;font-size:13px;color:var(--m)}

/* botao */
.btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:18px 40px;border-radius:16px;font-size:18px;font-weight:800;color:#fff;text-decoration:none;background:linear-gradient(135deg,var(--a),var(--a2));box-shadow:0 12px 34px rgba(var(--ar),.42);overflow:hidden;transition:transform .2s,box-shadow .2s;animation:pulse 2.6s ease-in-out infinite;-webkit-tap-highlight-color:transparent}
.btn:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 18px 44px rgba(var(--ar),.55)}
.btn span{position:relative;z-index:1}
.btn::after{content:'';position:absolute;top:0;left:-120%;width:60%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-20deg);animation:shine 3.4s ease-in-out infinite}
@keyframes shine{0%,55%{left:-120%}100%{left:160%}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}

/* titulos de secao */
.head{margin-bottom:38px;text-align:center}
.eyebrow{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--a);margin-bottom:12px}
h2{font-size:clamp(26px,4vw,40px);line-height:1.15;font-weight:900;letter-spacing:-.015em}
.sub{color:var(--m);font-size:18px;margin-top:12px}
.head h2 strong,.s-pain strong{color:var(--a)}

/* midia */
.shot{max-width:520px;margin:0 auto;animation:float 5s ease-in-out infinite}
.shot img{width:100%;border-radius:24px;box-shadow:0 34px 80px rgba(var(--ar),.32);border:1px solid var(--l)}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.video{position:relative;max-width:820px;margin:0 auto;aspect-ratio:16/9;border-radius:22px;overflow:hidden;background:#000;box-shadow:0 34px 80px rgba(var(--ar),.3);border:1px solid var(--l)}
.video iframe,.video video{position:absolute;inset:0;width:100%;height:100%;border:0}
.cap{text-align:center;color:var(--m);font-size:14px;margin-top:14px}
.s-media{padding:14px 0 64px}

/* dores + sumario */
.pains{list-style:none;max-width:720px;margin:0 auto;display:grid;gap:12px}
.pains li{display:flex;gap:14px;align-items:flex-start;padding:18px 20px;background:var(--card);border:1px solid var(--l);border-radius:16px;font-size:17px}
.x{flex:none;width:28px;height:28px;border-radius:50%;background:rgba(239,68,68,.14);color:#ef4444;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;margin-top:1px}
.toc{max-width:760px;margin:0 auto;display:grid;gap:14px}
.toc-i{display:flex;gap:16px;padding:20px;background:var(--card);border:1px solid var(--l);border-radius:18px;transition:transform .25s,box-shadow .25s}
.toc-i:hover{transform:translateY(-3px);box-shadow:0 14px 34px rgba(var(--ar),.16)}
.n{flex:none;width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center}
.toc-i b{display:block;font-size:17px}
.toc-i p{color:var(--m);font-size:15px;margin-top:4px}

/* texto da dor */
.pt{font-size:clamp(18px,2.2vw,21px);margin-bottom:22px;color:var(--t)}
.pt:last-child{margin-bottom:0}

/* depoimentos / bonus */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,390px));justify-content:center;gap:20px}
.card{background:var(--card);border:1px solid var(--l);border-radius:20px;padding:26px;transition:transform .25s,box-shadow .25s}
.card:hover{transform:translateY(-5px);box-shadow:0 20px 44px rgba(var(--ar),.18)}
.stars{color:#f59e0b;letter-spacing:2px;margin-bottom:10px}
.q{color:var(--m);font-style:italic;margin-bottom:18px;font-size:15.5px}
.who{display:flex;align-items:center;gap:12px}
.who b{display:block;font-size:14px}
.who span{font-size:13px;color:var(--m)}
.av{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
.bn img{width:100%;height:150px;object-fit:cover;border-radius:14px;margin-bottom:14px}
.gift{font-size:38px;margin-bottom:6px;display:inline-block;animation:wiggle 3s ease-in-out infinite}
@keyframes wiggle{0%,86%,100%{transform:rotate(0)}90%{transform:rotate(-12deg)}94%{transform:rotate(10deg)}98%{transform:rotate(-6deg)}}
.tag{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--a);background:rgba(var(--ar),.12);padding:4px 10px;border-radius:99px;margin:4px 0 10px}
.bn b{display:block;font-size:18px;margin-bottom:6px}
.bn p{color:var(--m);font-size:15px}

/* como usar */
.steps{position:relative;display:grid;gap:26px;padding-left:4px}
.steps::before{content:'';position:absolute;left:23px;top:8px;bottom:8px;width:2px;background:linear-gradient(var(--a),transparent);opacity:.35}
.step{position:relative;display:flex;gap:20px;align-items:flex-start}
.dot{flex:none;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-weight:900;font-size:19px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(var(--ar),.4);z-index:1}
.sb b{display:block;font-size:19px;margin-top:2px}
.sb p{color:var(--m);margin-top:4px}

/* oferta */
.s-offer{background:${dark ? 'radial-gradient(100% 80% at 50% 0%,rgba(var(--ar),.22),transparent 65%),var(--bg)' : 'radial-gradient(100% 80% at 50% 0%,rgba(var(--ar),.12),transparent 65%),var(--bg)'}}
.offer{position:relative;max-width:520px;margin:0 auto;padding:3px;border-radius:30px;background:linear-gradient(120deg,var(--a),#fff0,var(--a2),#fff0,var(--a));background-size:300% 300%;animation:border 6s linear infinite}
@keyframes border{0%{background-position:0% 50%}100%{background-position:300% 50%}}
.offer-in{background:var(--card);border-radius:27px;padding:40px 32px;text-align:center}
.inc{list-style:none;text-align:left;margin-bottom:26px;display:grid;gap:10px}
.inc li{display:flex;gap:12px;align-items:flex-start;font-size:16px}
.ok{flex:none;width:24px;height:24px;border-radius:50%;background:rgba(34,197,94,.16);color:#16a34a;font-weight:900;font-size:13px;display:flex;align-items:center;justify-content:center;margin-top:1px}
.old{color:var(--m);font-size:15px}
.price{font-size:clamp(54px,11vw,78px);font-weight:900;line-height:1.05;color:var(--a);letter-spacing:-.03em;margin:4px 0}
.price small{font-size:26px;vertical-align:top;position:relative;top:10px;margin-right:4px;letter-spacing:0}
.per{color:var(--m);font-size:15px;margin-bottom:26px}
.offer .btn{width:100%;font-size:19px}

/* garantia */
.guar{max-width:620px;margin:0 auto;padding:42px 32px;background:var(--card);border:1px solid var(--l);border-radius:28px}
.shield{font-size:54px;display:inline-block;animation:float 4s ease-in-out infinite}
.days{display:inline-flex;align-items:baseline;gap:6px;margin:10px 0 6px;color:#16a34a}
.days b{font-size:56px;line-height:1;font-weight:900}
.days span{font-size:20px;font-weight:800}
.guar h2{font-size:26px;margin:4px 0 12px}
.guar p{color:var(--m);font-size:17px}

/* faq */
.faq{background:var(--card);border:1px solid var(--l);border-radius:16px;margin-bottom:12px;overflow:hidden}
.faq summary{list-style:none;cursor:pointer;padding:20px 24px;font-weight:700;font-size:17px;display:flex;justify-content:space-between;gap:16px;align-items:center}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:'+';flex:none;font-size:26px;line-height:1;color:var(--a);transition:transform .3s}
.faq[open] summary::after{transform:rotate(45deg)}
.ans{padding:0 24px 22px;color:var(--m);animation:open .35s ease}
@keyframes open{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}

.s-cta{background:var(--alt)}
footer{text-align:center;padding:36px 22px 110px;color:var(--m);font-size:13px;border-top:1px solid var(--l)}

/* barra fixa */
.sticky{position:fixed;left:0;right:0;bottom:0;z-index:50;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:${dark ? 'rgba(11,10,20,.88)' : 'rgba(255,255,255,.9)'};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--l);transform:translateY(110%);transition:transform .4s cubic-bezier(.2,.8,.2,1);text-align:center}
.sticky.on{transform:none}
.sticky .btn{width:100%;max-width:460px;padding:15px 24px;font-size:17px}

@media(max-width:640px){.s{padding:60px 0}.s-headline{padding:64px 0 52px}.btn{padding:17px 28px;font-size:17px}.offer-in{padding:32px 22px}.step{gap:14px}.dot{width:42px;height:42px}.steps::before{left:20px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.js .rv{opacity:1;transform:none}}
`

  const script = `
(function(){
var d=document,w=window;
var els=d.querySelectorAll('.rv');
if('IntersectionObserver' in w){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -40px 0px'});els.forEach(function(el){io.observe(el)})}else{els.forEach(function(el){el.classList.add('in')})}
var sb=d.getElementById('sticky');
if(sb){var off=d.getElementById('oferta');var chk=function(){var show=(w.scrollY||0)>520;if(off){var r=off.getBoundingClientRect();if(r.top<w.innerHeight*0.85&&r.bottom>0)show=false}sb.classList.toggle('on',show)};w.addEventListener('scroll',chk,{passive:true});chk()}
var q=(w.location.search||'').replace(/^\\?/,'');
if(q){var keep=q.split('&').filter(function(p){return /^(utm_|fbclid|gclid|src=|sck=|xcod=)/i.test(p)});if(keep.length){d.querySelectorAll('a[data-cta]').forEach(function(a){var h=a.getAttribute('href');if(h&&h!=='#'&&/^https?:/i.test(h)){a.setAttribute('href',h+(h.indexOf('?')>-1?'&':'?')+keep.join('&'))}})}}
d.querySelectorAll('a[data-cta]').forEach(function(a){a.addEventListener('click',function(){if(w.fbq){var p=a.getAttribute('data-price');var o=p?{value:Number(p),currency:'BRL'}:{};w.fbq('track','InitiateCheckout',o)}})});
})();
`

  // So no editor: mostra tudo de uma vez (sem esperar rolar) e rola ate a secao pedida
  const previewScript = `
document.querySelectorAll('.rv').forEach(function(el){el.classList.add('in')});
window.addEventListener('message',function(e){var m=e.data||{};if(m.type==='scrollTo'){var el=document.querySelector('[data-sid="'+String(m.id).replace(/"/g,'')+'"]');if(el){window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-10,behavior:'instant'})}}});
`

  return '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="UTF-8"/>\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>\n' +
    '<title>' + title + '</title>\n' +
    '<script>document.documentElement.className+=" js"</script>\n' +
    '<style>' + css + '</style>\n' + pixelHead + '\n</head>\n<body>\n' +
    topBar + '\n' + body + '\n' +
    '<footer>© ' + new Date().getFullYear() + ' ' + title + ' · Todos os direitos reservados</footer>\n' +
    sticky + '\n<script>' + script + '</script>\n' +
    (opts.preview ? '<script>' + previewScript + '</script>\n' : '') + '</body>\n</html>'
}

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { usuarioCriativo, msgBloqueioCriativo } from '@/lib/criativoAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Busca de videos no Vecteezy (licenca comercial inclusa).
// Precisa das variaveis VECTEEZY_API_KEY e VECTEEZY_ACCOUNT_ID (a chave e o ID da conta vem do painel de API do Vecteezy).
// Cada busca custa centavos e cada download conta na cota do plano, por isso os resultados ficam 24h em memoria.
const BASE = (process.env.VECTEEZY_API_BASE || 'https://api.vecteezy.com').replace(/\/$/, '')
type Video = { id: string; titulo: string; duracao: number; thumb: string; previa: string; arquivo: string; largura: number; altura: number; pagina: string }
const cache = new Map<string, { t: number; dados: { videos: Video[]; total: number } }>()
const DIA = 24 * 60 * 60 * 1000


// Os arquivos do Vecteezy trazem "-free-video" (gratis) ou "-pro-video" (pago) no nome. So passam os gratis.
function ehGratis(h: any): boolean {
  const alvo = String(h?.thumbnail_url || '') + ' ' + String(h?.preview_url || '')
  return /-free-video/i.test(alvo)
}

function formatar(h: any): Video | null {
  if (!h || h.id === undefined || h.id === null) return null
  const previa = h.preview_url || ''
  const thumb = h.thumbnail_2x_url || h.thumbnail_url || ''
  if (!previa && !thumb) return null
  const tams: any[] = (h.file_metadata && h.file_metadata.available_download_sizes) || []
  const base = tams.find(function(t) { return t && t.id === 'original' }) || tams[0] || {}
  return {
    id: String(h.id), titulo: String(h.title || '').trim(),
    duracao: Number(h.duration) || 0,
    thumb: String(thumb), previa: String(previa), arquivo: String(h.id),
    largura: Number(base.width) || 0, altura: Number(base.height) || 0,
    pagina: 'https://www.vecteezy.com/video/' + h.id,
  }
}

// A busca do Vecteezy funciona melhor em ingles: traduz o que a pessoa digitou (se falhar, usa o texto original)
async function traduzirBusca(q: string): Promise<string> {
  if (!q || !process.env.OPENAI_API_KEY) return q
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0, max_tokens: 40,
      messages: [
        { role: 'system', content: 'Traduza o termo de busca de videos para o ingles, curto (ate 5 palavras), sem aspas e sem explicacao. Se ja estiver em ingles, repita igual.' },
        { role: 'user', content: q },
      ],
    })
    const t = String(r.choices[0]?.message?.content || '').replace(/["\n]/g, ' ').trim()
    return t && t.length <= 80 ? t : q
  } catch (e) { return q }
}

// Titulos em portugues (uma chamada barata para todos os resultados). Se falhar, ficam as tags originais.
async function traduzirTitulos(videos: Video[]): Promise<void> {
  if (!process.env.OPENAI_API_KEY || !videos.length) return
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0, max_tokens: 900, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Voce transforma tags de videos (em ingles) em um titulo curto em portugues do Brasil (3 a 5 palavras, so a primeira letra maiuscula). Responda JSON: {"titulos": ["...", ...]} na mesma ordem e quantidade.' },
        { role: 'user', content: JSON.stringify(videos.map(function(v) { return v.titulo })) },
      ],
    })
    const j = JSON.parse(r.choices[0]?.message?.content || '{}')
    if (Array.isArray(j.titulos) && j.titulos.length === videos.length) videos.forEach(function(v, i) { if (j.titulos[i]) v.titulo = String(j.titulos[i]) })
  } catch (e) { /* mantem as tags */ }
}

export async function GET(req: NextRequest) {
  const u = await usuarioCriativo()
  if (!u) return NextResponse.json({ error: await msgBloqueioCriativo() }, { status: 403 })
  const chave = process.env.VECTEEZY_API_KEY
  const conta = process.env.VECTEEZY_ACCOUNT_ID
  if (!chave || !conta) return NextResponse.json({ conectado: false, videos: [], total: 0, error: 'A chave do Vecteezy ainda nao foi configurada.' })

  const sp = req.nextUrl.searchParams
  const q = String(sp.get('q') || '').trim().slice(0, 100)
  const formato = ['vertical', 'quadrado', 'horizontal'].indexOf(String(sp.get('formato'))) !== -1 ? String(sp.get('formato')) : 'vertical'
  const pagina = Math.min(5, Math.max(1, parseInt(sp.get('pagina') || '1', 10) || 1))
  const id = String(sp.get('id') || '').replace(/\D/g, '')

  // Diagnostico (so admin): /api/criativo/videos?debug=1&q=igreja mostra a resposta crua do Vecteezy (sem a chave)
  if (u.admin && sp.get('debug')) {
    try {
      const extra = String(sp.get('extra') || '').replace(/[^a-zA-Z0-9_=&.\-]/g, '').slice(0, 120)
      const du = BASE + '/v2/' + encodeURIComponent(conta) + '/resources?content_type=video&per_page=3&term=' + encodeURIComponent(q || 'business') + (extra ? '&' + extra : '')
      const dr = await fetch(du, { headers: { Authorization: 'Bearer ' + chave, Accept: 'application/json' } })
      const txt = await dr.text()
      return NextResponse.json({ status: dr.status, url: du.replace(String(conta), '<conta>'), corpo: txt.slice(0, 6000) })
    } catch (e: any) { return NextResponse.json({ erro: String(e?.message || e) }) }
  }

  const chaveCache = [id, q.toLowerCase(), formato, pagina].join('|')
  const guardado = cache.get(chaveCache)
  if (guardado && Date.now() - guardado.t < DIA) return NextResponse.json({ conectado: true, ...guardado.dados })

  const termo = id ? '' : await traduzirBusca(q)
  const url = BASE + '/v2/' + encodeURIComponent(conta) + '/resources' + (id ? '/' + id : '?content_type=video&per_page=100&page=' + pagina + '&term=' + encodeURIComponent(termo || 'business'))
  try {
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + chave, Accept: 'application/json' } })
    if (r.status === 429) return NextResponse.json({ conectado: true, videos: [], total: 0, error: 'Muitas buscas seguidas. Espere um minuto e tente de novo.' })
    if (r.status === 401 || r.status === 403) return NextResponse.json({ conectado: true, videos: [], total: 0, error: 'O Vecteezy recusou a chave de acesso. Confira VECTEEZY_API_KEY e VECTEEZY_ACCOUNT_ID.' })
    if (!r.ok) return NextResponse.json({ conectado: true, videos: [], total: 0, error: 'O Vecteezy não respondeu agora. Tente de novo.' })
    const j: any = await r.json()
    const itens: any[] = id ? [j.resource || j.data || j] : (j.resources || j.data || j.results || [])
    const gratis = itens.filter(function(h) { return ehGratis(h) })
    const todos: Video[] = gratis.map(formatar).filter(Boolean) as Video[]
    // O editor corta o video para caber no formato escolhido, entao nada e escondido: so vem primeiro quem ja tem o formato.
    const combina = function(v: Video) {
      if (!v.largura || !v.altura) return false
      const prop = v.largura / v.altura
      return formato === 'vertical' ? prop < 0.9 : formato === 'quadrado' ? prop >= 0.9 && prop <= 1.15 : prop > 1.15
    }
    const filtrados = id ? todos : todos.filter(combina).concat(todos.filter(function(v) { return !combina(v) }))
    const videos = filtrados.slice(0, 24)
    await traduzirTitulos(videos)
    const dados = { videos, total: filtrados.length }
    cache.set(chaveCache, { t: Date.now(), dados })
    return NextResponse.json({ conectado: true, ...dados })
  } catch (e: any) {
    console.error('[criativo/videos]', e?.message || e)
    return NextResponse.json({ conectado: true, videos: [], total: 0, error: 'Não foi possível buscar agora. Tente de novo.' })
  }
}

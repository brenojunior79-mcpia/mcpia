import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { usuarioCriativo } from '@/lib/criativoAuth'

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


function formatar(h: any): Video | null {
  if (!h || h.id === undefined || h.id === null) return null
  const previa = h.preview_url || h.video_preview_url || h.preview_video_url || h.preview?.url || ''
  const thumb = h.thumbnail_url || h.thumbnail || h.preview_image_url || h.thumb || ''
  if (!previa && !thumb) return null
  return {
    id: String(h.id), titulo: String(h.title || h.name || '').trim(),
    duracao: Number(h.duration) || 0,
    thumb: String(thumb), previa: String(previa), arquivo: String(h.id),
    largura: Number(h.width) || 0, altura: Number(h.height) || 0,
    pagina: String(h.url || h.permalink || h.page_url || ''),
  }
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
  if (!u) return NextResponse.json({ error: 'Este recurso esta em atualizacao no momento.' }, { status: 403 })
  const chave = process.env.VECTEEZY_API_KEY
  const conta = process.env.VECTEEZY_ACCOUNT_ID
  if (!chave || !conta) return NextResponse.json({ conectado: false, videos: [], total: 0, error: 'A chave do Vecteezy ainda nao foi configurada.' })

  const sp = req.nextUrl.searchParams
  const q = String(sp.get('q') || '').trim().slice(0, 100)
  const formato = ['vertical', 'quadrado', 'horizontal'].indexOf(String(sp.get('formato'))) !== -1 ? String(sp.get('formato')) : 'vertical'
  const pagina = Math.min(5, Math.max(1, parseInt(sp.get('pagina') || '1', 10) || 1))
  const id = String(sp.get('id') || '').replace(/\D/g, '')

  const chaveCache = [id, q.toLowerCase(), formato, pagina].join('|')
  const guardado = cache.get(chaveCache)
  if (guardado && Date.now() - guardado.t < DIA) return NextResponse.json({ conectado: true, ...guardado.dados })

  const url = BASE + '/v2/' + encodeURIComponent(conta) + '/resources' + (id ? '/' + id : '?content_type=video&per_page=48&page=' + pagina + '&term=' + encodeURIComponent(q || 'business'))
  try {
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + chave, Accept: 'application/json' } })
    if (r.status === 429) return NextResponse.json({ conectado: true, videos: [], total: 0, error: 'Muitas buscas seguidas. Espere um minuto e tente de novo.' })
    if (r.status === 401 || r.status === 403) return NextResponse.json({ conectado: true, videos: [], total: 0, error: 'O Vecteezy recusou a chave de acesso. Confira VECTEEZY_API_KEY e VECTEEZY_ACCOUNT_ID.' })
    if (!r.ok) return NextResponse.json({ conectado: true, videos: [], total: 0, error: 'O Vecteezy não respondeu agora. Tente de novo.' })
    const j: any = await r.json()
    const itens: any[] = id ? [j.resource || j.data || j] : (j.resources || j.data || j.results || [])
    const todos: Video[] = itens.map(formatar).filter(Boolean) as Video[]
    const filtrados = id ? todos : todos.filter(function(v) {
      if (!v.largura || !v.altura) return true
      const prop = v.largura / v.altura
      return formato === 'vertical' ? prop < 0.9 : formato === 'quadrado' ? prop >= 0.9 && prop <= 1.15 : prop > 1.15
    })
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

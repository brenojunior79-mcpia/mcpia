import { NextRequest, NextResponse } from 'next/server'
import { usuarioCriativo } from '@/lib/criativoAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Fotos de rosto de pessoas reais (Pixabay, uso livre) para os avatares do criativo.
type Foto = { id: string; thumb: string; foto: string }
const cache = new Map<string, { t: number; fotos: Foto[] }>()
const DIA = 24 * 60 * 60 * 1000

const BUSCA: Record<string, string> = {
  h: 'man face portrait smiling',
  m: 'woman face portrait smiling',
}

export async function GET(req: NextRequest) {
  const u = await usuarioCriativo()
  if (!u) return NextResponse.json({ error: 'Este recurso esta em atualizacao no momento.' }, { status: 403 })
  const chave = process.env.PIXABAY_API_KEY
  if (!chave) return NextResponse.json({ error: 'Chave do Pixabay nao configurada.' }, { status: 500 })
  const sexo = req.nextUrl.searchParams.get('sexo') === 'm' ? 'm' : 'h'

  const c = cache.get(sexo)
  if (c && Date.now() - c.t < DIA) return NextResponse.json({ fotos: c.fotos })

  try {
    const url = 'https://pixabay.com/api/?key=' + encodeURIComponent(chave) + '&q=' + encodeURIComponent(BUSCA[sexo]) +
      '&image_type=photo&category=people&orientation=vertical&min_width=500&safesearch=true&order=popular&per_page=40'
    const r = await fetch(url)
    if (!r.ok) return NextResponse.json({ error: 'Nao foi possivel buscar as fotos.' }, { status: 502 })
    const j: any = await r.json()
    const fotos: Foto[] = (j.hits || []).map(function(h: any) {
      return { id: String(h.id), thumb: String(h.previewURL || ''), foto: String(h.webformatURL || '') }
    }).filter(function(f: Foto) { return f.thumb && f.foto })
    cache.set(sexo, { t: Date.now(), fotos })
    return NextResponse.json({ fotos })
  } catch (e) {
    return NextResponse.json({ error: 'Nao foi possivel buscar as fotos.' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { usuarioCriativo } from '@/lib/criativoAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Recebe o audio da narracao e devolve cada palavra com o tempo em que e falada (para as legendas)
export async function POST(req: NextRequest) {
  const u = await usuarioCriativo()
  if (!u) return NextResponse.json({ error: 'Este recurso esta em atualizacao no momento.' }, { status: 403 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI nao configurada.' }, { status: 500 })

  let fd: FormData
  try { fd = await req.formData() } catch (e) { return NextResponse.json({ error: 'Audio nao recebido.' }, { status: 400 }) }
  const arq = fd.get('audio')
  if (!arq || typeof arq === 'string') return NextResponse.json({ error: 'Audio nao recebido.' }, { status: 400 })
  if (arq.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'O audio e grande demais (limite 4 MB).' }, { status: 413 })
  const dica = String(fd.get('dica') || '').slice(0, 600)

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const arquivo = await toFile(Buffer.from(await arq.arrayBuffer()), 'narracao.mp3', { type: 'audio/mpeg' })
    const r: any = await openai.audio.transcriptions.create({
      file: arquivo,
      model: 'whisper-1',
      language: 'pt',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
      ...(dica ? { prompt: dica } : {}),
    } as any)
    const palavras = (Array.isArray(r.words) ? r.words : []).map(function(w: any) {
      return { word: String(w.word || ''), start: Number(w.start) || 0, end: Number(w.end) || 0 }
    }).filter(function(w: any) { return w.word.trim() })
    if (!palavras.length) return NextResponse.json({ error: 'Nao foi possivel identificar a fala no audio.' }, { status: 422 })
    return NextResponse.json({ palavras, duracao: Number(r.duration) || null })
  } catch (e: any) {
    console.error('[criativo/legendas]', e?.message || e)
    return NextResponse.json({ error: 'Nao foi possivel criar as legendas agora. Tente de novo.' }, { status: 502 })
  }
}

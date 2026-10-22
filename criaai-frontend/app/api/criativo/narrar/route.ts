import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { usuarioCriativo } from '@/lib/criativoAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Vozes da OpenAI (todas falam portugues)
const VOZES = ['onyx', 'echo', 'ash', 'verse', 'nova', 'shimmer', 'coral', 'sage']

const ESTILOS: Record<string, string> = {
  natural: 'Fale em portugues do Brasil, de forma natural e clara, como uma pessoa real conversando.',
  vendedor: 'Fale em portugues do Brasil, com energia, entusiasmo e ritmo animado, como em um anuncio de video que convence.',
  emocional: 'Fale em portugues do Brasil, com tom emotivo, calmo e acolhedor, com pausas curtas entre as ideias.',
}

export async function POST(req: NextRequest) {
  const u = await usuarioCriativo()
  if (!u) return NextResponse.json({ error: 'Este recurso esta em atualizacao no momento.' }, { status: 403 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI nao configurada.' }, { status: 500 })

  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const texto = String(b.texto || '').replace(/\s+/g, ' ').trim()
  const voz = VOZES.includes(b.voz) ? b.voz : 'onyx'
  const estilo = ESTILOS[String(b.estilo)] || ESTILOS.natural
  if (texto.length < 5) return NextResponse.json({ error: 'Cole o texto que sera narrado.' }, { status: 400 })
  if (texto.length > 3000) return NextResponse.json({ error: 'O texto passa de 3000 caracteres. Reduza o roteiro.' }, { status: 400 })

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  async function gerar(model: string) {
    const params: any = { model, voice: voz, input: texto, response_format: 'mp3' }
    if (model === 'gpt-4o-mini-tts') params.instructions = estilo
    const r = await openai.audio.speech.create(params)
    return Buffer.from(await r.arrayBuffer())
  }
  try {
    let audio: Buffer
    try { audio = await gerar('gpt-4o-mini-tts') } catch (e: any) {
      console.error('[criativo/narrar] gpt-4o-mini-tts falhou, tentando tts-1:', e?.message || e)
      audio = await gerar('tts-1')
    }
    return new NextResponse(audio as any, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    console.error('[criativo/narrar]', e?.message || e)
    return NextResponse.json({ error: 'Nao foi possivel gerar a narracao agora. Tente de novo.' }, { status: 502 })
  }
}

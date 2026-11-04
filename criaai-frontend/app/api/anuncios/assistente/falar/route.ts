import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { usuarioAssistente } from '@/lib/anunciosAssistente'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Voz da assistente (a fala que a pessoa escuta). Voz da OpenAI que fala portugues do Brasil.
const ESTILO = 'Fale em portugues do Brasil, com voz feminina simpatica, calma e acolhedora, como uma gestora de anuncios paciente orientando uma pessoa leiga. Ritmo natural, sem pressa.'

export async function POST(req: NextRequest) {
  const u = await usuarioAssistente()
  if ('erro' in u) return NextResponse.json({ error: u.erro }, { status: u.status })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI nao configurada.' }, { status: 500 })
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const texto = String(b.texto || '').replace(/\s+/g, ' ').trim().slice(0, 700)
  if (texto.length < 2) return NextResponse.json({ error: 'Sem texto.' }, { status: 400 })
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  async function gerar(model: string) {
    const params: any = { model, voice: 'coral', input: texto, response_format: 'mp3' }
    if (model === 'gpt-4o-mini-tts') params.instructions = ESTILO
    const r = await openai.audio.speech.create(params)
    return Buffer.from(await r.arrayBuffer())
  }
  try {
    let audio: Buffer
    try { audio = await gerar('gpt-4o-mini-tts') } catch (e: any) { audio = await gerar('tts-1') }
    return new NextResponse(new Uint8Array(audio), { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    console.error('[anuncios/assistente/falar]', e && e.message ? e.message : e)
    return NextResponse.json({ error: 'Nao consegui gerar a voz agora.' }, { status: 500 })
  }
}

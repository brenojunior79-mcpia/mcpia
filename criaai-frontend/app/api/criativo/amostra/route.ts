import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { usuarioCriativo } from '@/lib/criativoAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const VOZES = ['onyx', 'echo', 'ash', 'verse', 'nova', 'shimmer', 'coral', 'sage']
const TEXTO = 'Olá! Essa é a minha voz. Posso narrar o seu criativo e fazer o seu anúncio chamar atenção.'

// Amostra curta de cada voz, para o aluno ouvir antes de escolher
export async function GET(req: NextRequest) {
  const u = await usuarioCriativo()
  if (!u) return NextResponse.json({ error: 'Este recurso esta em atualizacao no momento.' }, { status: 403 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI nao configurada.' }, { status: 500 })
  const voz = String(req.nextUrl.searchParams.get('voz') || '')
  if (VOZES.indexOf(voz) === -1) return NextResponse.json({ error: 'Voz invalida.' }, { status: 400 })
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const r = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts', voice: voz as any, input: TEXTO, response_format: 'mp3',
      instructions: 'Fale em portugues do Brasil, de forma natural e simpatica.',
    } as any)
    const audio = Buffer.from(await r.arrayBuffer())
    // O navegador guarda a amostra: ouvir de novo nao gera novo custo
    return new NextResponse(audio as any, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=604800' } })
  } catch (e: any) {
    console.error('[criativo/amostra]', e?.message || e)
    return NextResponse.json({ error: 'Nao foi possivel carregar a amostra agora.' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { usuarioCriativo } from '@/lib/criativoAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const VOZES = ['onyx', 'echo', 'ash', 'verse', 'nova', 'shimmer', 'coral', 'sage']
const TEXTO = 'Olá! Essa é a minha voz. Posso narrar o seu criativo e fazer o seu anúncio chamar atenção.'

const CABECALHOS = { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=604800' }

// Amostra curta de cada voz. A primeira vez gera e guarda no banco; depois e instantaneo e sem custo.
export async function GET(req: NextRequest) {
  const u = await usuarioCriativo()
  if (!u) return NextResponse.json({ error: 'Este recurso esta em atualizacao no momento.' }, { status: 403 })
  const voz = String(req.nextUrl.searchParams.get('voz') || '')
  if (VOZES.indexOf(voz) === -1) return NextResponse.json({ error: 'Voz invalida.' }, { status: 400 })

  const db = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  try {
    const guardada = await db.from('criativo_amostras').select('audio_base64').eq('voz', voz).maybeSingle()
    if (guardada.data && (guardada.data as any).audio_base64) {
      return new NextResponse(Buffer.from((guardada.data as any).audio_base64, 'base64') as any, { status: 200, headers: CABECALHOS })
    }
  } catch (e) { /* segue e gera */ }

  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI nao configurada.' }, { status: 500 })
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const r = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts', voice: voz as any, input: TEXTO, response_format: 'mp3',
      instructions: 'Fale em portugues do Brasil, de forma natural e simpatica.',
    } as any)
    const audio = Buffer.from(await r.arrayBuffer())
    try { await db.from('criativo_amostras').upsert({ voz, audio_base64: audio.toString('base64') }, { onConflict: 'voz' }) } catch (e) {}
    return new NextResponse(audio as any, { status: 200, headers: CABECALHOS })
  } catch (e: any) {
    console.error('[criativo/amostra]', e?.message || e)
    return NextResponse.json({ error: 'Nao foi possivel carregar a amostra agora.' }, { status: 502 })
  }
}

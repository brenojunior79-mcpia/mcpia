import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Resposta do Junior em audio (quando o aluno mandou audio): texto -> voz (OpenAI). Devolve o MP3.
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })
  let texto = ''
  try { const b = await req.json(); texto = String(b?.texto || '').trim() } catch (e) {}
  if (!texto || texto.length > 1200) return NextResponse.json({ error: 'Texto inválido.' }, { status: 400 })
  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: 'ash',
        input: texto,
        instructions: 'Fale em portugues do Brasil, como um rapaz brasileiro jovem, simpatico e acolhedor, mandando um audio de WhatsApp para um aluno. Tom natural de conversa, sem parecer leitura, ritmo tranquilo.',
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(45000),
    })
    if (!r.ok) { console.error('[chat-voz] falhou', r.status); return NextResponse.json({ error: 'Sem áudio agora.' }, { status: 502 }) }
    const buf = await r.arrayBuffer()
    return new NextResponse(buf, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[chat-voz] erro')
    return NextResponse.json({ error: 'Sem áudio agora.' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Audio que o aluno gravou no chat do Suporte: vira texto (Whisper) para o Junior entender.
// O audio nao fica guardado no servidor.
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })
  let arquivo: File | null = null
  try { const fd = await req.formData(); arquivo = fd.get('audio') as File | null } catch (e) {}
  if (!arquivo || !arquivo.size) return NextResponse.json({ error: 'Não recebi o áudio. Tente gravar de novo.' }, { status: 400 })
  if (arquivo.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'O áudio ficou muito grande. Grave uma mensagem mais curta.' }, { status: 400 })
  try {
    const fd = new FormData()
    const tipo = arquivo.type || 'audio/webm'
    const ext = tipo.indexOf('mp4') >= 0 ? 'mp4' : tipo.indexOf('ogg') >= 0 ? 'ogg' : tipo.indexOf('mpeg') >= 0 ? 'mp3' : 'webm'
    fd.append('file', new Blob([await arquivo.arrayBuffer()], { type: tipo }), 'audio.' + ext)
    fd.append('model', 'whisper-1')
    fd.append('language', 'pt')
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY }, body: fd, signal: AbortSignal.timeout(40000) })
    const d = await r.json().catch(function() { return null })
    const texto = String(d?.text || '').trim()
    if (!r.ok || !texto) { console.error('[chat-audio] transcricao falhou', r.status); return NextResponse.json({ error: 'Não consegui entender o áudio. Tente de novo ou escreva.' }, { status: 400 }) }
    return NextResponse.json({ texto })
  } catch (e) {
    console.error('[chat-audio] erro')
    return NextResponse.json({ error: 'Não consegui entender o áudio. Tente de novo ou escreva.' }, { status: 500 })
  }
}

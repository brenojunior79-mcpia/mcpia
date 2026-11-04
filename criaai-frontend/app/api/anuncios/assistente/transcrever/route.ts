import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { usuarioAssistente } from '@/lib/anunciosAssistente'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Transforma o audio que a pessoa gravou em texto (Whisper)
export async function POST(req: NextRequest) {
  const u = await usuarioAssistente()
  if ('erro' in u) return NextResponse.json({ error: u.erro }, { status: u.status })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI nao configurada.' }, { status: 500 })
  let form: FormData
  try { form = await req.formData() } catch (e) { return NextResponse.json({ error: 'Audio invalido.' }, { status: 400 }) }
  const arq: any = form.get('audio')
  if (!arq || typeof arq.arrayBuffer !== 'function') return NextResponse.json({ error: 'Audio nao enviado.' }, { status: 400 })
  if (arq.size < 800) return NextResponse.json({ texto: '' })
  if (arq.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Audio muito longo. Fale um pouco por vez.' }, { status: 400 })
  const tipo = String(arq.type || 'audio/webm')
  const ext = tipo.indexOf('mp4') >= 0 ? 'm4a' : tipo.indexOf('ogg') >= 0 ? 'ogg' : tipo.indexOf('wav') >= 0 ? 'wav' : 'webm'
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const file = await toFile(Buffer.from(await arq.arrayBuffer()), 'fala.' + ext, { type: tipo })
    const r: any = await openai.audio.transcriptions.create({ file, model: 'whisper-1', language: 'pt' })
    return NextResponse.json({ texto: String(r.text || '').trim() })
  } catch (e: any) {
    console.error('[anuncios/assistente/transcrever]', e && e.message ? e.message : e)
    return NextResponse.json({ error: 'Nao consegui entender o audio. Tente de novo.' }, { status: 500 })
  }
}

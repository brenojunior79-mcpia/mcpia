import { NextRequest, NextResponse } from 'next/server'
import { usuarioAssistente } from '@/lib/anunciosAssistente'
import { adminClient } from '@/lib/whatsapp'
import { lerEstado, salvarEstado } from '@/lib/camilaEstado'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const u = await usuarioAssistente()
  if ('erro' in u) return NextResponse.json({ error: u.erro }, { status: u.status })
  return NextResponse.json({ estado: await lerEstado(u.id) })
}

// Guarda o arquivo anexado e as ultimas falas
export async function PUT(req: NextRequest) {
  const u = await usuarioAssistente()
  if ('erro' in u) return NextResponse.json({ error: u.erro }, { status: u.status })
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const campos: any = {}
  if ('midia' in b) {
    const m = b.midia
    if (m === null) campos.midia = null
    else if (m && typeof m.path === 'string' && m.path.indexOf('anuncios/' + u.id + '/') === 0 && m.path.indexOf('..') < 0) {
      campos.midia = { path: m.path, tipo: m.tipo === 'imagem' ? 'imagem' : 'video', nome: String(m.nome || '').slice(0, 120), videoId: m.videoId ? String(m.videoId) : undefined }
    }
  }
  if (Array.isArray(b.dialogo)) {
    campos.dialogo = b.dialogo.slice(-20).filter(function(x: any) { return x && (x.r === 'u' || x.r === 'c') && typeof x.t === 'string' })
      .map(function(x: any) { return { r: x.r, t: String(x.t).slice(0, 400) } })
  }
  await salvarEstado(u.id, campos)
  return NextResponse.json({ ok: true })
}

// Comeca do zero (ou depois que o anuncio foi criado)
export async function DELETE() {
  const u = await usuarioAssistente()
  if ('erro' in u) return NextResponse.json({ error: u.erro }, { status: u.status })
  await adminClient().from('camila_anuncio_estado').delete().eq('user_id', u.id)
  return NextResponse.json({ ok: true })
}

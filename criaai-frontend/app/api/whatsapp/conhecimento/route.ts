import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/whatsapp'
import { baseCanalPadrao } from '@/lib/waIA'

export const dynamic = 'force-dynamic'

const CANAIS = ['recuperacao', 'suporte']

// Le a base de conhecimento do chat (so admin): o texto salvo, ou o texto padrao se ainda nao mudaram nada
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Somente o admin.' }, { status: 403 })
  const canal = String(req.nextUrl.searchParams.get('canal') || '')
  if (CANAIS.indexOf(canal) < 0) return NextResponse.json({ error: 'Chat invalido.' }, { status: 400 })
  const r = await adminClient().from('wa_conhecimento').select('texto, atualizado_em').eq('canal', canal).maybeSingle()
  const salvo = String((r.data as any)?.texto || '').trim()
  if (salvo.length >= 200) return NextResponse.json({ texto: salvo, personalizado: true, atualizado_em: (r.data as any)?.atualizado_em || null })
  return NextResponse.json({ texto: baseCanalPadrao(canal), personalizado: false, atualizado_em: null })
}

// Salva (texto) ou volta ao padrao (restaurar: true). So admin.
export async function POST(req: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Somente o admin.' }, { status: 403 })
  let body: any = {}
  try { body = await req.json() } catch (e) {}
  const canal = String(body?.canal || '')
  if (CANAIS.indexOf(canal) < 0) return NextResponse.json({ error: 'Chat invalido.' }, { status: 400 })
  const db = adminClient()
  if (body?.restaurar === true) {
    const d = await db.from('wa_conhecimento').delete().eq('canal', canal)
    if (d.error) return NextResponse.json({ error: d.error.message }, { status: 500 })
    return NextResponse.json({ ok: true, texto: baseCanalPadrao(canal), personalizado: false })
  }
  const texto = String(body?.texto || '').trim()
  if (texto.length < 200) return NextResponse.json({ error: 'O texto está muito curto. Para voltar ao original, use "Restaurar padrão".' }, { status: 400 })
  if (texto.length > 400000) return NextResponse.json({ error: 'O texto está grande demais.' }, { status: 400 })
  const u = await db.from('wa_conhecimento').upsert({ canal, texto, atualizado_em: new Date().toISOString(), atualizado_por: adminId })
  if (u.error) return NextResponse.json({ error: u.error.message }, { status: 500 })
  return NextResponse.json({ ok: true, personalizado: true, atualizado_em: new Date().toISOString() })
}

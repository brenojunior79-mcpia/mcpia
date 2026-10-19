import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// Liga ou desliga o assistente de IA numa conversa. SOMENTE o admin (atendentes nao conseguem).
export async function POST(req: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Somente o admin pode ligar ou desligar o assistente.' }, { status: 403 })
  let body: any = {}
  try { body = await req.json() } catch (e) {}
  const ids: string[] = (Array.isArray(body?.ids) ? body.ids : body?.id ? [body.id] : []).map(function(x: any) { return String(x) }).filter(Boolean).slice(0, 500)
  if (ids.length === 0 || typeof body?.ativo !== 'boolean') return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 })
  const ativo: boolean = body.ativo
  const r = await adminClient().from('wa_conversations').update({ ia_ativa: ativo, ia_ativada_em: ativo ? new Date().toISOString() : null }).in('id', ids).select('id')
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ativo, total: (r.data || []).length })
}

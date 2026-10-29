import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin, requireStaff } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// Le se o assistente esta ligado para TODAS as conversas (qualquer pessoa da equipe pode ver)
export async function GET() {
  const uid = await requireStaff()
  if (!uid) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const c = await adminClient().from('wa_ia_config').select('geral').eq('id', 1).maybeSingle()
  return NextResponse.json({ geral: (c.data as any)?.geral === true })
}

// Liga ou desliga o assistente de IA numa conversa (ids + ativo) ou em todas (geral). SOMENTE o admin (atendentes nao conseguem).
export async function POST(req: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Somente o admin pode ligar ou desligar o assistente.' }, { status: 403 })
  let body: any = {}
  try { body = await req.json() } catch (e) {}

  // Todas as conversas (inclusive as novas que chegarem)
  if (typeof body?.geral === 'boolean') {
    const r = await adminClient().from('wa_ia_config').upsert({ id: 1, geral: body.geral, atualizado_em: new Date().toISOString() })
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
    return NextResponse.json({ ok: true, geral: body.geral })
  }

  const ids: string[] = (Array.isArray(body?.ids) ? body.ids : body?.id ? [body.id] : []).map(function(x: any) { return String(x) }).filter(Boolean).slice(0, 500)
  if (ids.length === 0 || typeof body?.ativo !== 'boolean') return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 })
  const ativo: boolean = body.ativo
  // Desligar numa conversa vale mesmo com o assistente geral ligado (ia_humano); ligar tira essa marca
  const r = await adminClient().from('wa_conversations').update({ ia_ativa: ativo, ia_humano: !ativo, ia_ativada_em: ativo ? new Date().toISOString() : null }).in('id', ids).select('id')
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ativo, total: (r.data || []).length })
}

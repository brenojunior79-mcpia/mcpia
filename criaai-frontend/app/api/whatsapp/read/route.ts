import { NextRequest, NextResponse } from 'next/server'
import { adminClient, graphFetch, requireStaff, waConfig } from '@/lib/whatsapp'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Zera o contador de nao lidas e avisa o aluno que a mensagem foi lida (tracinhos azuis)
export async function POST(req: NextRequest) {
  const staffId = await requireStaff()
  if (!staffId) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  let convId = ''
  try { convId = String((await req.json())?.conversationId || '') } catch (e) {}
  if (!convId) return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 })

  await createClient().rpc('wa_mark_read', { p_conv: convId })

  try {
    const cfg = waConfig()
    if (cfg.token && cfg.phoneId) {
      const last = await adminClient().from('wa_messages').select('wa_message_id').eq('conversation_id', convId).eq('direction', 'in').order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (last.data?.wa_message_id) await graphFetch(cfg.phoneId + '/messages', { method: 'POST', json: { messaging_product: 'whatsapp', status: 'read', message_id: last.data.wa_message_id } })
    }
  } catch (e) {}
  return NextResponse.json({ ok: true })
}

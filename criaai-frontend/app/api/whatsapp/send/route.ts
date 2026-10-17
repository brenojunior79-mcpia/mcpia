import { NextRequest, NextResponse } from 'next/server'
import { adminClient, canAccessConv, graphError, postMessage, requireStaff, waConfig } from '@/lib/whatsapp'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

// Envia uma mensagem de texto (dentro das 24h) ou um modelo aprovado (a qualquer hora)
export async function POST(req: NextRequest) {
  const staffId = await requireStaff()
  if (!staffId) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  const cfg = waConfig()
  if (!cfg.token || !cfg.phoneId) return NextResponse.json({ error: 'O WhatsApp ainda nao foi conectado (faltam as chaves da Meta na Vercel).' }, { status: 400 })

  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 }) }
  const convId = String(input?.conversationId || '')
  const text = typeof input?.text === 'string' ? input.text.trim() : ''
  const tpl = input?.template && typeof input.template.name === 'string' ? input.template : null
  if (!convId || (!text && !tpl)) return NextResponse.json({ error: 'Escreva uma mensagem.' }, { status: 400 })
  if (text.length > 4000) return NextResponse.json({ error: 'Mensagem muito longa.' }, { status: 400 })

  if (!(await canAccessConv(staffId, convId))) return NextResponse.json({ error: 'Essa conversa nao esta com voce.' }, { status: 403 })
  const admin = adminClient()
  const c = await admin.from('wa_conversations').select('id, wa_id, last_inbound_at, assigned_to').eq('id', convId).maybeSingle()
  if (!c.data) return NextResponse.json({ error: 'Conversa nao encontrada.' }, { status: 404 })

  // Conversa em espera: quem responde primeiro assume (so uma pessoa consegue)
  let assumiu = false
  if (!(c.data as any).assigned_to) {
    const claim = await admin.from('wa_conversations').update({ assigned_to: staffId }).eq('id', convId).is('assigned_to', null).select('id')
    if (!claim.data || claim.data.length === 0) {
      if (!(await canAccessConv(staffId, convId))) return NextResponse.json({ error: 'Outra pessoa acabou de assumir esta conversa.' }, { status: 409 })
    } else assumiu = true
  }

  let payload: any
  let shown: string
  let type = 'text'
  if (tpl) {
    const params: string[] = Array.isArray(tpl.params) ? tpl.params.map(function(x: any) { return String(x) }).filter(function(x: string) { return x.length > 0 }) : []
    payload = {
      messaging_product: 'whatsapp', to: c.data.wa_id, type: 'template',
      template: { name: String(tpl.name).trim(), language: { code: String(tpl.language || 'pt_BR').trim() }, ...(params.length ? { components: [{ type: 'body', parameters: params.map(function(t) { return { type: 'text', text: t } }) }] } : {}) },
    }
    const preview = typeof tpl.preview === 'string' ? tpl.preview.trim().slice(0, 1500) : ''
    shown = preview ? '📄 ' + preview : '[Modelo: ' + String(tpl.name).trim() + ']' + (params.length ? ' ' + params.join(' | ') : '')
    type = 'template'
  } else {
    const last = c.data.last_inbound_at ? new Date(c.data.last_inbound_at).getTime() : 0
    if (Date.now() - last > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Passaram 24 horas desde a ultima mensagem do aluno. Envie um modelo aprovado.', window: 'closed' }, { status: 409 })
    }
    payload = { messaging_product: 'whatsapp', to: c.data.wa_id, type: 'text', text: { body: text, preview_url: true } }
    shown = text
  }

  const r = await postMessage(payload)
  if (!r.ok) {
    if (assumiu) await admin.from('wa_conversations').update({ assigned_to: null }).eq('id', convId).eq('assigned_to', staffId)
    return NextResponse.json({ error: graphError(r.data) }, { status: 400 })
  }

  const waId = r.data?.messages?.[0]?.id || null
  const now = new Date().toISOString()
  await admin.from('wa_messages').insert({ conversation_id: convId, wa_message_id: waId, direction: 'out', type, body: shown, status: 'sent', sent_by: staffId, created_at: now })
  const upd: any = { last_message_at: now, last_text: 'Você: ' + shown.slice(0, 120), status: 'aberta', unread: 0 }
  await admin.from('wa_conversations').update(upd).eq('id', convId)
  return NextResponse.json({ ok: true })
}

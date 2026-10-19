import { NextRequest, NextResponse } from 'next/server'
import { acessoPermitido, adminClient, canAccessConv, GRAPH, graphError, phoneIdDaConversa, postMessage, requireStaff, waConfig } from '@/lib/whatsapp'
import { classificar } from '@/lib/waMedia'

export const maxDuration = 60
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
  const media = input?.media && typeof input.media.path === 'string' ? input.media : null
  if (!convId || (!text && !tpl && !media)) return NextResponse.json({ error: 'Escreva uma mensagem.' }, { status: 400 })
  if (text.length > 4000) return NextResponse.json({ error: 'Mensagem muito longa.' }, { status: 400 })

  // Perfil e conversa buscados juntos (menos idas ao banco = envio mais rapido)
  const admin = adminClient()
  const [perfil, c] = await Promise.all([
    admin.from('profiles').select('is_admin, wa_scope').eq('id', staffId).maybeSingle(),
    admin.from('wa_conversations').select('id, wa_id, last_inbound_at, assigned_to, connection_id').eq('id', convId).maybeSingle(),
  ])
  if (!c.data) return NextResponse.json({ error: 'Conversa nao encontrada.' }, { status: 404 })
  if (!acessoPermitido(staffId, perfil.data, c.data)) return NextResponse.json({ error: 'Essa conversa nao esta com voce.' }, { status: 403 })
  // Cada conversa responde pelo numero em que aconteceu (suporte ou recuperacao)
  const phoneId = await phoneIdDaConversa(admin, (c.data as any).connection_id || null)
  if (!phoneId) return NextResponse.json({ error: 'O numero desta conversa nao esta mais cadastrado em Conexoes.' }, { status: 400 })

  // Conversa em espera: quem responde primeiro assume (so uma pessoa consegue)
  let assumiu = false
  if (!(c.data as any).assigned_to) {
    const claim = await admin.from('wa_conversations').update({ assigned_to: staffId }).eq('id', convId).is('assigned_to', null).select('id')
    if (!claim.data || claim.data.length === 0) {
      if (!(await canAccessConv(staffId, convId))) return NextResponse.json({ error: 'Outra pessoa acabou de assumir esta conversa.' }, { status: 409 })
    } else assumiu = true
  }

  // Responder uma mensagem especifica (citacao): so vale para texto e arquivos, e so de mensagens desta conversa
  let ctxId: string | null = null
  const rt = typeof input?.replyTo === 'string' ? input.replyTo.slice(0, 200) : ''
  if (rt && !tpl) {
    const q = await admin.from('wa_messages').select('wa_message_id').eq('conversation_id', convId).eq('wa_message_id', rt).maybeSingle()
    if (q.data) ctxId = rt
  }
  let payload: any
  let shown: string
  let type = 'text'
  let mediaPath: string | null = null
  let mediaMime: string | null = null
  if (media) {
    const last = c.data.last_inbound_at ? new Date(c.data.last_inbound_at).getTime() : 0
    if (Date.now() - last > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Passaram 24 horas desde a ultima mensagem do aluno. Envie um modelo aprovado.', window: 'closed' }, { status: 409 })
    }
    const path = String(media.path)
    if (path.indexOf('out/' + convId + '/') !== 0 || path.indexOf('..') >= 0) return NextResponse.json({ error: 'Arquivo invalido.' }, { status: 400 })
    const cl = classificar(String(media.mime || ''))
    if ('erro' in cl) return NextResponse.json({ error: cl.erro }, { status: 400 })
    const dl = await admin.storage.from('wa-media').download(path)
    if (dl.error || !dl.data) return NextResponse.json({ error: 'Nao achei o arquivo enviado. Tente de novo.' }, { status: 400 })
    if (dl.data.size > cl.max) return NextResponse.json({ error: 'Arquivo grande demais.' }, { status: 400 })
    const filename = String(media.filename || 'arquivo').replace(/[^\w.\- ()\u00C0-\u017F]/g, '_').slice(0, 100)
    const caption = typeof media.caption === 'string' ? media.caption.trim().slice(0, 1000) : ''
    const fd = new FormData()
    fd.append('messaging_product', 'whatsapp')
    fd.append('type', cl.mime)
    fd.append('file', new Blob([await dl.data.arrayBuffer()], { type: cl.mime }), filename)
    let up: any = null
    try {
      const res = await fetch(GRAPH + '/' + phoneId + '/media', { method: 'POST', headers: { Authorization: 'Bearer ' + cfg.token }, body: fd })
      up = { ok: res.ok, data: await res.json().catch(function() { return null }) }
    } catch (e) { up = { ok: false, data: null } }
    if (!up.ok || !up.data?.id) {
      if (assumiu) await admin.from('wa_conversations').update({ assigned_to: null }).eq('id', convId).eq('assigned_to', staffId)
      return NextResponse.json({ error: graphError(up.data) }, { status: 400 })
    }
    const obj: any = { id: up.data.id }
    if (cl.kind !== 'audio' && caption) obj.caption = caption
    if (cl.kind === 'document') obj.filename = filename
    payload = { messaging_product: 'whatsapp', to: c.data.wa_id, type: cl.kind, [cl.kind]: obj }
    if (ctxId) payload.context = { message_id: ctxId }
    type = cl.kind
    mediaPath = path
    mediaMime = cl.mime
    shown = cl.kind === 'document' ? (caption ? filename + ' — ' + caption : filename) : caption
  } else if (tpl) {
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
    if (ctxId) payload.context = { message_id: ctxId }
    shown = text
  }

  let r = await postMessage(payload, phoneId)
  // Se a Meta nao aceitar a citacao (ex.: mensagem muito antiga), envia sem citar
  if (!r.ok && ctxId) { ctxId = null; const sem = { ...payload }; delete sem.context; r = await postMessage(sem, phoneId) }
  if (!r.ok) {
    if (assumiu) await admin.from('wa_conversations').update({ assigned_to: null }).eq('id', convId).eq('assigned_to', staffId)
    return NextResponse.json({ error: graphError(r.data) }, { status: 400 })
  }

  const waId = r.data?.messages?.[0]?.id || null
  const now = new Date().toISOString()
  const rotulo = type === 'image' ? '📷 ' + (shown || 'Imagem') : type === 'video' ? '🎬 ' + (shown || 'Vídeo') : type === 'audio' ? '🎤 Áudio' : type === 'document' ? '📎 ' + shown : shown
  const upd: any = { last_message_at: now, last_text: 'Você: ' + rotulo.slice(0, 120), status: 'aberta', unread: 0 }
  // Tudo que falta gravar roda junto (antes era um depois do outro)
  const gravar: PromiseLike<any>[] = [
    admin.from('wa_messages').insert({ conversation_id: convId, wa_message_id: waId, direction: 'out', type, body: shown || null, media_path: mediaPath, mime: mediaMime, status: 'sent', sent_by: staffId, reply_to_wa_id: ctxId, created_at: now }),
    admin.from('wa_conversations').update(upd).eq('id', convId),
  ]
  if (assumiu) {
    gravar.push((async function() {
      const pr = await admin.from('profiles').select('full_name, email').eq('id', staffId).maybeSingle()
      const nome = ((pr.data as any)?.full_name || String((pr.data as any)?.email || 'Atendente').split('@')[0]).trim().split(/\s+/).slice(0, 2).join(' ')
      await admin.from('wa_messages').insert({ conversation_id: convId, direction: 'out', type: 'system', body: 'Conversa atribuída a ' + nome + ' por envio de mensagem.', status: 'sent', sent_by: staffId, created_at: new Date(new Date(now).getTime() - 2).toISOString() })
    })())
  }
  await Promise.all(gravar)
  return NextResponse.json({ ok: true })
}

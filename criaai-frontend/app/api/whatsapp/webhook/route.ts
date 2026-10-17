import { NextRequest, NextResponse } from 'next/server'
import { adminClient, graphFetch, postMessage, validSignature, waConfig } from '@/lib/whatsapp'
import { abertoAgora, normalizar } from '@/lib/waHours'
import { aplicaNome, casaPalavra } from '@/lib/waFlows'
import { primeiroNome } from '@/lib/waBroadcast'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

// A Meta chama este endereco uma vez para confirmar que ele e' seu (GET) e depois a cada mensagem (POST).
export async function GET(req: NextRequest) {
  const cfg = waConfig()
  const p = req.nextUrl.searchParams
  if (cfg.verifyToken && p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === cfg.verifyToken) {
    return new NextResponse(p.get('hub.challenge') || '', { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/amr': 'amr', 'video/mp4': 'mp4', 'video/3gpp': '3gp', 'application/pdf': 'pdf' }

function describe(m: any): { type: string; body: string | null; preview: string; mediaId: string | null; mime: string | null } | null {
  const t = String(m.type || 'text')
  switch (t) {
    case 'text': return { type: t, body: m.text?.body || '', preview: m.text?.body || '', mediaId: null, mime: null }
    case 'image': return { type: t, body: m.image?.caption || null, preview: '📷 ' + (m.image?.caption || 'Imagem'), mediaId: m.image?.id || null, mime: m.image?.mime_type || null }
    case 'audio': return { type: t, body: null, preview: m.audio?.voice ? '🎤 Áudio' : '🎵 Áudio', mediaId: m.audio?.id || null, mime: m.audio?.mime_type || null }
    case 'video': return { type: t, body: m.video?.caption || null, preview: '🎬 ' + (m.video?.caption || 'Vídeo'), mediaId: m.video?.id || null, mime: m.video?.mime_type || null }
    case 'document': return { type: t, body: m.document?.filename || m.document?.caption || null, preview: '📎 ' + (m.document?.filename || 'Documento'), mediaId: m.document?.id || null, mime: m.document?.mime_type || null }
    case 'sticker': return { type: t, body: null, preview: 'Figurinha', mediaId: m.sticker?.id || null, mime: m.sticker?.mime_type || null }
    case 'location': { const l = m.location || {}; const txt = '📍 Localização: https://maps.google.com/?q=' + l.latitude + ',' + l.longitude; return { type: t, body: txt, preview: '📍 Localização', mediaId: null, mime: null } }
    case 'button': return { type: 'text', body: m.button?.text || '', preview: m.button?.text || '', mediaId: null, mime: null }
    case 'interactive': { const x = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || ''; return { type: 'text', body: x, preview: x, mediaId: null, mime: null } }
    case 'reaction': return null
    default: return { type: 'text', body: '[Tipo de mensagem não suportado: ' + t + ']', preview: '[mensagem não suportada]', mediaId: null, mime: null }
  }
}

async function saveMedia(admin: any, convId: string, msgId: string, mediaId: string, mime: string | null): Promise<void> {
  try {
    const meta = await graphFetch(mediaId)
    const url = meta.data?.url
    if (!meta.ok || !url) return
    const cfg = waConfig()
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + cfg.token } })
    if (!res.ok) return
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1 || buf.length > 20 * 1024 * 1024) return
    const type = (mime || meta.data?.mime_type || 'application/octet-stream').split(';')[0]
    const path = convId + '/' + msgId + '.' + (EXT[type] || 'bin')
    const up = await admin.storage.from('wa-media').upload(path, buf, { contentType: type, upsert: true })
    if (up.error) { console.error('[whatsapp] upload:', up.error.message); return }
    await admin.from('wa_messages').update({ media_path: path, mime: type }).eq('id', msgId)
  } catch (e) {
    console.error('[whatsapp] midia:', e)
  }
}

// Fora do horario de atendimento: responde uma vez (a cada X horas) com o aviso configurado
async function respostaAutomatica(admin: any, convId: string, waId: string): Promise<boolean> {
  try {
    const st = await admin.from('wa_settings').select('value').eq('key', 'hours').maybeSingle()
    const h = normalizar(st.data?.value)
    if (!h.away_enabled || !h.away_message.trim() || abertoAgora(h)) return false
    const since = new Date(Date.now() - h.cooldown_hours * 3600000).toISOString()
    const prev = await admin.from('wa_messages').select('id').eq('conversation_id', convId).eq('direction', 'out').eq('type', 'text').is('sent_by', null).is('flow_id', null).gte('created_at', since).limit(1)
    if (prev.data && prev.data.length > 0) return false
    const r = await postMessage({ messaging_product: 'whatsapp', to: waId, type: 'text', text: { body: h.away_message } })
    if (!r.ok) { console.error('[whatsapp] resposta automatica:', JSON.stringify(r.data?.error || r.data)); return false }
    const now = new Date().toISOString()
    await admin.from('wa_messages').insert({ conversation_id: convId, wa_message_id: r.data?.messages?.[0]?.id || null, direction: 'out', type: 'text', body: h.away_message, status: 'sent', sent_by: null, created_at: now })
    await admin.from('wa_conversations').update({ last_message_at: now, last_text: '🤖 ' + h.away_message.slice(0, 120) }).eq('id', convId)
    return true
  } catch (e) {
    console.error('[whatsapp] resposta automatica:', e)
    return false
  }
}

// Fluxos criados na aba Fluxos: o primeiro que combinar responde (uma resposta automatica por mensagem)
async function fluxosPersonalizados(admin: any, convId: string, waId: string, texto: string, nomeContato: string | null): Promise<void> {
  try {
    const fl = await admin.from('wa_flows').select('*').eq('enabled', true).order('created_at', { ascending: true }).limit(50)
    const lista: any[] = fl.data || []
    if (lista.length === 0) return
    const st = await admin.from('wa_settings').select('value').eq('key', 'hours').maybeSingle()
    const aberto = abertoAgora(normalizar(st.data?.value))
    const cnt = await admin.from('wa_messages').select('id', { count: 'exact', head: true }).eq('conversation_id', convId).eq('direction', 'in')
    const primeira = (cnt.count || 0) <= 1
    for (const f of lista) {
      if (f.when_hours === 'dentro' && !aberto) continue
      if (f.when_hours === 'fora' && aberto) continue
      if (f.trigger === 'primeira' && !primeira) continue
      if (f.trigger === 'palavra' && !casaPalavra(texto, f.keywords || [], f.match)) continue
      if (f.trigger !== 'primeira') {
        const since = new Date(Date.now() - (Number(f.cooldown_hours) || 12) * 3600000).toISOString()
        const prev = await admin.from('wa_messages').select('id').eq('conversation_id', convId).eq('flow_id', f.id).gte('created_at', since).limit(1)
        if (prev.data && prev.data.length > 0) continue
      }
      const corpo = aplicaNome(String(f.message || ''), primeiroNome(nomeContato))
      if (!corpo.trim()) continue
      const r = await postMessage({ messaging_product: 'whatsapp', to: waId, type: 'text', text: { body: corpo } })
      if (!r.ok) { console.error('[whatsapp] fluxo ' + f.name + ':', JSON.stringify(r.data?.error || r.data)); return }
      const now = new Date().toISOString()
      await admin.from('wa_messages').insert({ conversation_id: convId, wa_message_id: r.data?.messages?.[0]?.id || null, direction: 'out', type: 'text', body: corpo, status: 'sent', sent_by: null, flow_id: f.id, created_at: now })
      await admin.from('wa_conversations').update({ last_message_at: now, last_text: '🤖 ' + corpo.slice(0, 120) }).eq('id', convId)
      return
    }
  } catch (e) {
    console.error('[whatsapp] fluxos:', e)
  }
}

export async function POST(req: NextRequest) {
  const cfg = waConfig()
  const raw = await req.text()
  if (cfg.appSecret && !validSignature(raw, req.headers.get('x-hub-signature-256'), cfg.appSecret)) {
    return new NextResponse('Assinatura invalida', { status: 401 })
  }
  try {
    const body = JSON.parse(raw)
    const admin = adminClient()
    for (const entry of body.entry || []) {
      for (const ch of entry.changes || []) {
        const v = ch.value
        if (!v) continue
        // Outro numero (ex.: Recuperacao): so acompanha entregue/lido/falha dos fluxos automaticos.
        // As mensagens recebidas nele NAO entram no atendimento do suporte.
        if (cfg.phoneId && v.metadata?.phone_number_id && String(v.metadata.phone_number_id) !== cfg.phoneId) {
          const cn = await admin.from('wa_connections').select('id, active').eq('phone_number_id', String(v.metadata.phone_number_id)).maybeSingle()
          const connId: string | null = cn.data && (cn.data as any).active ? String((cn.data as any).id) : null
          // Respostas das pessoas ao numero de Recuperacao entram no "Chat de recuperacao" (sem respostas automaticas)
          if (connId) {
            for (const m of v.messages || []) {
              const d = describe(m)
              if (!d) continue
              const name = (v.contacts || []).find(function(c: any) { return c.wa_id === m.from })?.profile?.name || null
              const ts = new Date(Number(m.timestamp) * 1000)
              const r = await admin.rpc('wa_ingest_canal', {
                p_wa_id: String(m.from), p_name: name, p_wa_msg_id: String(m.id), p_type: d.type, p_body: d.body, p_preview: d.preview,
                p_media_id: d.mediaId, p_mime: d.mime, p_ts: isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString(), p_connection: connId,
              })
              if (r.error) { console.error('[whatsapp] ingest recuperacao:', r.error.message); continue }
              const out = r.data as any
              if (d.mediaId && out?.message_id) await saveMedia(admin, out.conversation_id, out.message_id, d.mediaId, d.mime)
            }
          }
          for (const s of v.statuses || []) {
            const id = String(s.id || '')
            const st = String(s.status || '')
            if (!id) continue
            const agora = new Date().toISOString()
            if (st === 'sent') await admin.from('wa_auto_sends').update({ status: 'sent', updated_at: agora }).eq('wa_message_id', id).in('status', ['sent'])
            else if (st === 'delivered') await admin.from('wa_auto_sends').update({ status: 'delivered', updated_at: agora }).eq('wa_message_id', id).eq('status', 'sent')
            else if (st === 'read') await admin.from('wa_auto_sends').update({ status: 'read', updated_at: agora }).eq('wa_message_id', id).in('status', ['sent', 'delivered'])
            else if (st === 'failed') {
              const e0 = s.errors?.[0]
              await admin.from('wa_auto_sends').update({ status: 'failed', error: String(e0?.error_data?.details || e0?.message || e0?.title || 'Falha no envio').slice(0, 300), updated_at: agora }).eq('wa_message_id', id).in('status', ['sent', 'delivered'])
            }
            // Mesmo status no historico da conversa (tracinhos do chat de recuperacao)
            if (st === 'delivered') await admin.from('wa_messages').update({ status: 'delivered' }).eq('wa_message_id', id).in('status', ['sending', 'sent'])
            else if (st === 'read') await admin.from('wa_messages').update({ status: 'read' }).eq('wa_message_id', id).in('status', ['sending', 'sent', 'delivered'])
            else if (st === 'failed') { const e1 = s.errors?.[0]; await admin.from('wa_messages').update({ status: 'failed', error: String(e1?.error_data?.details || e1?.message || e1?.title || 'Falha no envio').slice(0, 300) }).eq('wa_message_id', id) }
          }
          continue
        }

        for (const m of v.messages || []) {
          const d = describe(m)
          if (!d) continue
          const name = (v.contacts || []).find(function(c: any) { return c.wa_id === m.from })?.profile?.name || null
          const ts = new Date(Number(m.timestamp) * 1000)
          const r = await admin.rpc('wa_ingest', {
            p_wa_id: String(m.from), p_name: name, p_wa_msg_id: String(m.id), p_type: d.type, p_body: d.body, p_preview: d.preview,
            p_media_id: d.mediaId, p_mime: d.mime, p_ts: isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString(),
          })
          if (r.error) { console.error('[whatsapp] ingest:', r.error.message); continue }
          const out = r.data as any
          if (d.mediaId && out?.message_id) await saveMedia(admin, out.conversation_id, out.message_id, d.mediaId, d.mime)
          // So responde sozinho a mensagem nova (nao a reenvios da Meta)
          if (out?.conversation_id && out?.message_id) {
            const respondeu = await respostaAutomatica(admin, out.conversation_id, String(m.from))
            if (!respondeu) await fluxosPersonalizados(admin, out.conversation_id, String(m.from), d.type === 'text' ? String(d.body || '') : '', name)
          }
        }

        for (const s of v.statuses || []) {
          const id = String(s.id || '')
          if (!id) continue
          const st = String(s.status || '')
          // Disparos em massa: acompanha entregue / lido / falha de cada pessoa
          if (st === 'delivered') await admin.from('wa_broadcast_recipients').update({ status: 'delivered' }).eq('wa_message_id', id).eq('status', 'sent')
          else if (st === 'read') await admin.from('wa_broadcast_recipients').update({ status: 'read' }).eq('wa_message_id', id).in('status', ['sent', 'delivered'])
          else if (st === 'failed') {
            const e0 = s.errors?.[0]
            await admin.from('wa_broadcast_recipients').update({ status: 'failed', error: String(e0?.error_data?.details || e0?.message || e0?.title || 'Falha no envio').slice(0, 300) }).eq('wa_message_id', id).in('status', ['sent', 'delivered'])
          }
          if (st === 'sent') await admin.from('wa_messages').update({ status: 'sent' }).eq('wa_message_id', id).in('status', ['sending'])
          else if (st === 'delivered') await admin.from('wa_messages').update({ status: 'delivered' }).eq('wa_message_id', id).in('status', ['sending', 'sent'])
          else if (st === 'read') await admin.from('wa_messages').update({ status: 'read' }).eq('wa_message_id', id).in('status', ['sending', 'sent', 'delivered'])
          else if (st === 'failed') {
            const e = s.errors?.[0]
            await admin.from('wa_messages').update({ status: 'failed', error: String(e?.error_data?.details || e?.message || e?.title || 'Falha no envio').slice(0, 300) }).eq('wa_message_id', id)
          }
        }
      }
    }
  } catch (e) {
    // Sempre responde 200 para a Meta nao ficar reenviando o mesmo aviso
    console.error('[whatsapp] webhook:', e)
  }
  return NextResponse.json({ ok: true })
}

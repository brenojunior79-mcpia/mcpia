import { NextRequest, NextResponse } from 'next/server'
import { adminClient, graphError, graphFetch, requireAdmin, waConfig } from '@/lib/whatsapp'
import { montarParams, payloadModelo, type ParamCfg } from '@/lib/waBroadcast'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// A Meta pediu para ir mais devagar / o limite do numero acabou: para e continua depois
const LIMITE = [130429, 131048, 80007, 4, 17, 32, 613]
// Problema no modelo ou na chave: nao adianta continuar
const GRAVE = [190, 132000, 132001, 132005, 132007, 132012, 132015, 132016]

// Envia o proximo lote do disparo. A tela chama de novo ate acabar (da para fechar e continuar depois).
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  const cfg = waConfig()
  if (!cfg.token || !cfg.phoneId) return NextResponse.json({ error: 'O WhatsApp ainda nao foi conectado.' }, { status: 400 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 }) }
  const id = String(input?.id || '')
  const admin = adminClient()

  const b = await admin.from('wa_broadcasts').select('*').eq('id', id).maybeSingle()
  if (!b.data) return NextResponse.json({ error: 'Disparo nao encontrado.' }, { status: 404 })
  const camp: any = b.data
  if (camp.status === 'cancelado' || camp.status === 'concluido') return NextResponse.json({ ok: true, status: camp.status, contagem: (await admin.rpc('wa_broadcast_counts', { p_id: id })).data || {} })
  if (camp.status === 'pausado') await admin.from('wa_broadcasts').update({ status: 'rodando', pause_reason: null }).eq('id', id)

  const params: ParamCfg[] = Array.isArray(camp.params) ? camp.params : []
  const claim = await admin.rpc('wa_broadcast_claim', { p_id: id, p_n: 60 })
  const lote: any[] = (claim.data as any[]) || []
  const inicio = Date.now()

  const est = { enviados: 0, falhas: 0, parar: '', primeiroErro: '' }
  const volta: number[] = []

  async function um(r: any) {
    if (est.parar) { volta.push(r.id); return }
    let res: { ok: boolean; status: number; data: any }
    try {
      res = await graphFetch(cfg.phoneId + '/messages', { method: 'POST', json: payloadModelo(r.wa_id, camp.template_name, camp.template_language, montarParams(params, r.name || '')) })
    } catch (e) {
      volta.push(r.id); return
    }
    if (res.ok) {
      est.enviados++
      await admin.from('wa_broadcast_recipients').update({ status: 'sent', wa_message_id: res.data?.messages?.[0]?.id || null, sent_at: new Date().toISOString(), error: null }).eq('id', r.id)
      return
    }
    const code = Number(res.data?.error?.code)
    if (LIMITE.indexOf(code) >= 0 || GRAVE.indexOf(code) >= 0) {
      est.parar = graphError(res.data) + (LIMITE.indexOf(code) >= 0 ? ' O disparo foi pausado; continue mais tarde.' : '')
      volta.push(r.id)
      return
    }
    est.falhas++
    if (!est.primeiroErro) est.primeiroErro = graphError(res.data)
    await admin.from('wa_broadcast_recipients').update({ status: 'failed', error: graphError(res.data).slice(0, 300) }).eq('id', r.id)
  }

  // 10 envios ao mesmo tempo
  for (let i = 0; i < lote.length; i += 10) {
    if (est.parar || Date.now() - inicio > 45000) { for (const r of lote.slice(i)) volta.push(r.id); break }
    await Promise.all(lote.slice(i, i + 10).map(um))
    // Muitas falhas seguidas e nenhum envio: algo esta errado, para
    if (!est.parar && est.enviados === 0 && est.falhas >= 10) est.parar = 'Os primeiros envios falharam: ' + est.primeiroErro
  }

  if (volta.length > 0) await admin.from('wa_broadcast_recipients').update({ status: 'pending', claimed_at: null }).in('id', volta)

  const contagem = ((await admin.rpc('wa_broadcast_counts', { p_id: id })).data || {}) as Record<string, number>
  const faltam = (contagem.pending || 0) + (contagem.sending || 0)
  let status = 'rodando'
  if (est.parar) {
    status = 'pausado'
    await admin.from('wa_broadcasts').update({ status: 'pausado', pause_reason: est.parar.slice(0, 400) }).eq('id', id)
  } else if (faltam === 0) {
    status = 'concluido'
    await admin.from('wa_broadcasts').update({ status: 'concluido', pause_reason: null }).eq('id', id)
  }
  return NextResponse.json({ ok: true, status, contagem, motivo: est.parar || null })
}

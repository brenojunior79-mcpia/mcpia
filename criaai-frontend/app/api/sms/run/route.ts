import { NextRequest, NextResponse } from 'next/server'
import { adminClient, aplicaNomeSms, enviarSms, requireAdmin, zenviaConfig } from '@/lib/sms'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// Envia o proximo lote do disparo. A tela chama de novo ate acabar.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Só administradores.' }, { status: 403 })
  if (zenviaConfig().missing.length) return NextResponse.json({ error: 'A Zenvia ainda não foi conectada.' }, { status: 400 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }) }
  const id = String(input?.id || '')
  const admin = adminClient()
  const b = await admin.from('sms_broadcasts').select('id, message, status').eq('id', id).maybeSingle()
  if (!b.data) return NextResponse.json({ error: 'Disparo não encontrado.' }, { status: 404 })
  const camp: any = b.data

  const contar = async function() {
    const c: Record<string, number> = {}
    for (const st of ['pending', 'sending', 'sent', 'failed', 'cancelled']) {
      const r = await admin.from('sms_recipients').select('id', { count: 'exact', head: true }).eq('broadcast_id', id).eq('status', st)
      c[st] = r.count || 0
    }
    return c
  }

  if (input?.cancelar === true) {
    await admin.from('sms_recipients').update({ status: 'cancelled' }).eq('broadcast_id', id).in('status', ['pending', 'sending'])
    await admin.from('sms_broadcasts').update({ status: 'cancelado' }).eq('id', id)
    return NextResponse.json({ ok: true, status: 'cancelado', contagem: await contar() })
  }
  if (camp.status === 'cancelado' || camp.status === 'concluido') return NextResponse.json({ ok: true, status: camp.status, contagem: await contar() })
  if (camp.status === 'pausado') await admin.from('sms_broadcasts').update({ status: 'rodando', pause_reason: null }).eq('id', id)

  // Envios que ficaram "em andamento" ha mais de 2 minutos voltam para a fila
  await admin.from('sms_recipients').update({ status: 'pending', claimed_at: null }).eq('broadcast_id', id).eq('status', 'sending').lt('claimed_at', new Date(Date.now() - 120000).toISOString())

  const fila = await admin.from('sms_recipients').select('id').eq('broadcast_id', id).eq('status', 'pending').order('id', { ascending: true }).limit(40)
  const ids = (fila.data || []).map(function(x: any) { return x.id })
  let lote: any[] = []
  if (ids.length) {
    const claim = await admin.from('sms_recipients').update({ status: 'sending', claimed_at: new Date().toISOString() }).in('id', ids).eq('status', 'pending').select('id, phone, name')
    lote = (claim.data as any[]) || []
  }

  const inicio = Date.now()
  const est = { enviados: 0, falhas: 0, parar: '', primeiroErro: '' }
  const volta: string[] = []
  async function um(r: any) {
    if (est.parar) { volta.push(r.id); return }
    const res = await enviarSms(r.phone, aplicaNomeSms(camp.message, r.name || ''))
    if (res.ok) {
      est.enviados++
      await admin.from('sms_recipients').update({ status: 'sent', zenvia_id: res.id, sent_at: new Date().toISOString(), error: null }).eq('id', r.id)
      return
    }
    if (res.grave) { est.parar = res.erro; volta.push(r.id); return }
    est.falhas++
    if (!est.primeiroErro) est.primeiroErro = res.erro
    await admin.from('sms_recipients').update({ status: 'failed', error: res.erro.slice(0, 300) }).eq('id', r.id)
  }
  for (let i = 0; i < lote.length; i += 10) {
    if (est.parar || Date.now() - inicio > 45000) { for (const r of lote.slice(i)) volta.push(r.id); break }
    await Promise.all(lote.slice(i, i + 10).map(um))
    // Os primeiros envios todos falharam: algo esta errado (remetente, saldo, chave). Para.
    if (!est.parar && est.enviados === 0 && est.falhas >= 10) est.parar = 'Os primeiros envios falharam: ' + est.primeiroErro
  }
  if (volta.length > 0) await admin.from('sms_recipients').update({ status: 'pending', claimed_at: null }).in('id', volta)

  const contagem = await contar()
  const faltam = (contagem.pending || 0) + (contagem.sending || 0)
  let status = 'rodando'
  if (est.parar) {
    status = 'pausado'
    await admin.from('sms_broadcasts').update({ status: 'pausado', pause_reason: est.parar.slice(0, 400) }).eq('id', id)
  } else if (faltam === 0) {
    status = 'concluido'
    await admin.from('sms_broadcasts').update({ status: 'concluido', pause_reason: null }).eq('id', id)
  }
  return NextResponse.json({ ok: true, status, contagem, motivo: est.parar || null, primeiroErro: est.primeiroErro || null })
}

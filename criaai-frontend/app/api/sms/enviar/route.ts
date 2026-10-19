import { NextRequest, NextResponse } from 'next/server'
import { adminClient, aplicaNomeSms, enviarSms, montarPublicoSms, requireAdmin, semAcentos, SMS_SEGMENTOS, zenviaConfig, type SmsSegmento } from '@/lib/sms'
import { normalizarNumero, primeiroNome } from '@/lib/waBroadcast'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// Admin: cria um disparo de SMS (a tela chama /api/sms/run em seguida para enviar) ou manda um teste so para o admin
export async function POST(req: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Só administradores.' }, { status: 403 })
  const cfg = zenviaConfig()
  if (cfg.missing.length) return NextResponse.json({ error: 'A Zenvia ainda não foi conectada. Faltam: ' + cfg.missing.join(', ') + '.' }, { status: 400 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }) }
  let msg = String(input?.mensagem || '').trim()
  if (input?.semAcentos !== false) msg = semAcentos(msg).trim()
  if (!msg) return NextResponse.json({ error: 'Escreva a mensagem.' }, { status: 400 })
  if (msg.length > 480) return NextResponse.json({ error: 'A mensagem está muito grande (máximo 480 letras).' }, { status: 400 })
  const admin = adminClient()

  // Teste: so para o celular do proprio admin
  if (input?.teste === true) {
    const me = await admin.from('profiles').select('full_name, whatsapp').eq('id', adminId).maybeSingle()
    const tel = normalizarNumero((me.data as any)?.whatsapp)
    if (!tel) return NextResponse.json({ error: 'Seu perfil não tem um celular válido cadastrado. Informe o número do teste.' }, { status: 400 })
    const r = await enviarSms(tel, aplicaNomeSms(msg, primeiroNome((me.data as any)?.full_name)))
    if (!r.ok) return NextResponse.json({ error: 'A Zenvia recusou o teste: ' + r.erro }, { status: 502 })
    return NextResponse.json({ ok: true, teste: true, para: '...' + tel.slice(-4) })
  }

  const seg = String(input?.segmento || '') as SmsSegmento
  if (!SMS_SEGMENTOS.some(function(s) { return s.k === seg })) return NextResponse.json({ error: 'Escolha para quem enviar.' }, { status: 400 })
  const pub = await montarPublicoSms(seg)
  if (pub.lista.length === 0) return NextResponse.json({ error: 'Ninguém com celular válido nesse público.' }, { status: 400 })
  const b = await admin.from('sms_broadcasts').insert({ created_by: adminId, message: msg, segmento: seg, status: 'rodando', total: pub.lista.length }).select('id').single()
  if (b.error || !b.data) return NextResponse.json({ error: 'Não consegui criar o disparo.' }, { status: 500 })
  const id = (b.data as any).id as string
  for (let i = 0; i < pub.lista.length; i += 500) {
    const rows = pub.lista.slice(i, i + 500).map(function(p) { return { broadcast_id: id, phone: p.phone, name: p.nome || null, user_id: p.id, status: 'pending' } })
    const ins = await admin.from('sms_recipients').insert(rows)
    if (ins.error) {
      await admin.from('sms_broadcasts').delete().eq('id', id)
      return NextResponse.json({ error: 'Não consegui montar a lista: ' + ins.error.message }, { status: 500 })
    }
  }
  return NextResponse.json({ ok: true, id, total: pub.lista.length })
}

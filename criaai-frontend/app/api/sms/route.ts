import { NextResponse } from 'next/server'
import { adminClient, montarPublicoSms, requireAdmin, zenviaConfig } from '@/lib/sms'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// Admin: situacao da Zenvia, quantas pessoas recebem em cada publico e o historico de disparos
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Só administradores.' }, { status: 403 })
  const cfg = zenviaConfig()
  const admin = adminClient()
  let publico: any = { porSegmento: {}, semNumero: 0, optout: 0 }
  try { const p = await montarPublicoSms('todos'); publico = { porSegmento: p.porSegmento, semNumero: p.semNumero, optout: p.optout } } catch (e) {}
  const h = await admin.from('sms_broadcasts').select('id, created_at, message, segmento, status, pause_reason, total').order('created_at', { ascending: false }).limit(8)
  const historico = await Promise.all((h.data || []).map(async function(b: any) {
    const cont = async function(st: string) { const r = await admin.from('sms_recipients').select('id', { count: 'exact', head: true }).eq('broadcast_id', b.id).eq('status', st); return r.count || 0 }
    const [sent, failed, pending] = await Promise.all([cont('sent'), cont('failed'), cont('pending')])
    return { ...b, sent, failed, pending }
  }))
  const out = await admin.from('sms_optout').select('phone, created_at').order('created_at', { ascending: false }).limit(50)
  return NextResponse.json({ configurado: cfg.missing.length === 0, faltando: cfg.missing, publico, historico, optout: out.data || [] })
}

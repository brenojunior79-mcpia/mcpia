import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// Chave do numero sem diferenca de 9o digito (mesma regra do banco: wa_chave)
function chave(wa: string): string {
  const d = String(wa || '').replace(/\D/g, '')
  const m = d.match(/^55(\d{2})9?(\d{8})$/)
  return m ? '55' + m[1] + m[2] : d
}
function variantes(wa: string): string[] {
  const d = String(wa || '').replace(/\D/g, '')
  const m = d.match(/^55(\d{2})(9?)(\d{8})$/)
  if (!m) return d ? [d] : []
  return ['55' + m[1] + '9' + m[3], '55' + m[1] + m[3]]
}

// Lista os eventos recebidos da Hubla (pix gerado, compra aprovada...) com o chat de cada pessoa (so admin)
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  const url = new URL(req.url)
  const tipo = (url.searchParams.get('tipo') || '').trim()
  const q = (url.searchParams.get('q') || '').trim().toLowerCase()
  const admin = adminClient()

  let qb = admin.from('wa_auto_runs')
    .select('id, flow_id, wa_id, email, name, event_type, data, status, sent_count, error, created_at')
    .eq('is_test', false)
    .order('created_at', { ascending: false })
    .limit(q ? 600 : 150)
  if (tipo) qb = qb.eq('event_type', tipo)
  const r = await qb
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel carregar os eventos.' }, { status: 500 })
  let runs: any[] = r.data || []
  if (q) {
    const qd = q.replace(/\D/g, '')
    runs = runs.filter(function(x) {
      return String(x.name || '').toLowerCase().includes(q) || String(x.email || '').toLowerCase().includes(q) || (qd.length >= 4 && String(x.wa_id || '').includes(qd))
    }).slice(0, 150)
  }

  const fl = await admin.from('wa_auto_flows').select('id, name, connection_id')
  const fluxos: Record<string, { name: string; connection_id: string | null }> = {}
  for (const f of (fl.data || []) as any[]) fluxos[f.id] = { name: f.name, connection_id: f.connection_id }

  // Conversa de cada pessoa (no chat de recuperacao do fluxo), achando com ou sem o 9
  const todas: string[] = []
  const conexoes: string[] = []
  for (const x of runs) {
    for (const v of variantes(x.wa_id)) if (todas.indexOf(v) === -1) todas.push(v)
    const c = fluxos[x.flow_id]?.connection_id
    if (c && conexoes.indexOf(c) === -1) conexoes.push(c)
  }
  const mapa: Record<string, string> = {}
  if (todas.length && conexoes.length) {
    const cv = await admin.from('wa_conversations').select('id, wa_id, connection_id, last_message_at').in('wa_id', todas).in('connection_id', conexoes).order('last_message_at', { ascending: true })
    for (const c of (cv.data || []) as any[]) mapa[c.connection_id + '|' + chave(c.wa_id)] = c.id
  }

  const eventos = runs.map(function(x) {
    const fx = fluxos[x.flow_id]
    const conn = fx?.connection_id || null
    return {
      id: x.id,
      created_at: x.created_at,
      event_type: x.event_type,
      name: x.name || '',
      email: x.email || '',
      wa_id: x.wa_id || '',
      produto: x.data?.produto || '',
      metodo: x.data?.metodo || '',
      status: x.status,
      sent_count: x.sent_count || 0,
      error: x.error || '',
      fluxo: fx?.name || '',
      conversation_id: conn ? (mapa[conn + '|' + chave(x.wa_id)] || null) : null,
    }
  })
  return NextResponse.json({ eventos })
}

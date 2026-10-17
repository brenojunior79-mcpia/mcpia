import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin, requireStaff } from '@/lib/whatsapp'
import { abertoAgora, normalizar, DIAS } from '@/lib/waHours'

export const dynamic = 'force-dynamic'

// Le o horario de atendimento (equipe) e devolve se esta aberto agora
export async function GET() {
  if (!(await requireStaff())) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  const r = await adminClient().from('wa_settings').select('value').eq('key', 'hours').maybeSingle()
  const h = normalizar(r.data?.value)
  return NextResponse.json({ settings: h, openNow: abertoAgora(h) })
}

// Salva o horario (so admin)
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores podem mudar o horario.' }, { status: 403 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 }) }
  const h = normalizar(input)
  if (h.away_enabled && !h.away_message.trim()) return NextResponse.json({ error: 'Escreva a mensagem de aviso.' }, { status: 400 })
  for (const d of DIAS) {
    const x = h.days[d.k]
    if (x.on && x.end <= x.start) return NextResponse.json({ error: d.nome + ': o horário de fim precisa ser depois do início.' }, { status: 400 })
  }
  const up = await adminClient().from('wa_settings').upsert({ key: 'hours', value: h, updated_at: new Date().toISOString() })
  if (up.error) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
  return NextResponse.json({ ok: true, settings: h, openNow: abertoAgora(h) })
}

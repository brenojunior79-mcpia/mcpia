import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireStaff } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Equipe (admin ou atendente): ve quando cada aluno esteve online na plataforma pela ultima vez.
// Devolve { presenca: { [profile_id]: last_seen } }. Quem nunca entrou nao aparece.
export async function GET(req: NextRequest) {
  const staffId = await requireStaff()
  if (!staffId) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  const ids = String(req.nextUrl.searchParams.get('ids') || '').split(',').map(function(s) { return s.trim() }).filter(function(s) { return UUID.test(s) }).slice(0, 300)
  if (!ids.length) return NextResponse.json({ presenca: {}, agora: new Date().toISOString() })
  const r = await adminClient().from('user_presence').select('user_id, last_seen').in('user_id', ids)
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel carregar.' }, { status: 500 })
  const presenca: Record<string, string> = {}
  ;(r.data || []).forEach(function(p: any) { presenca[p.user_id] = p.last_seen })
  return NextResponse.json({ presenca, agora: new Date().toISOString() })
}

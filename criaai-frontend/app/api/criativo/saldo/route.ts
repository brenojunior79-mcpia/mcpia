import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { saldoCriativo, LIBERADO_ALUNOS } from '@/lib/criativoAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: mostra quantos criativos o aluno ainda pode gerar.
export async function GET() {
  const s = await saldoCriativo()
  if (!s) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })
  return NextResponse.json({ liberado: s.admin || LIBERADO_ALUNOS, admin: s.admin, ilimitado: s.ilimitado, temPlano: s.temPlano, novo: s.novo, limite: s.limite, usados: s.usados, restante: s.restante })
}

// POST: gasta 1 credito quando o criativo fica pronto (admin nao gasta).
export async function POST() {
  const s = await saldoCriativo()
  if (!s) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })
  if (s.admin || s.ilimitado) return NextResponse.json({ ok: true, restante: s.restante })
  if (!LIBERADO_ALUNOS) return NextResponse.json({ error: 'Este recurso esta em atualizacao no momento.' }, { status: 403 })
  if (s.restante <= 0) return NextResponse.json({ error: 'Seus creditos de criativo acabaram.' }, { status: 403 })
  const db = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  // Soma 1 so se o valor ainda for o que lemos (evita gastar em dobro com duas abas ao mesmo tempo)
  const up = await db.from('profiles').update({ credits_videos_used: s.usados + 1 }).eq('id', s.id).eq('credits_videos_used', s.usados).select('credits_videos_used')
  if (up.error) return NextResponse.json({ error: 'Nao foi possivel registrar o credito.' }, { status: 500 })
  if (!up.data || !up.data.length) {
    const again = await db.from('profiles').select('credits_videos_used').eq('id', s.id).maybeSingle()
    const novo = Number((again.data as any)?.credits_videos_used || s.usados) + 1
    await db.from('profiles').update({ credits_videos_used: novo }).eq('id', s.id)
    return NextResponse.json({ ok: true, restante: Math.max(0, s.limite - novo) })
  }
  return NextResponse.json({ ok: true, restante: Math.max(0, s.limite - (s.usados + 1)) })
}

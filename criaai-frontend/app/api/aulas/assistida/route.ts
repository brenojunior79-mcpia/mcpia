import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { AULAS_RANKING } from '@/lib/aulasRanking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Marca uma aula como assistida (vale pontos no ranking). So conta uma vez por aluno e por aula.
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })
  let videoId = ''
  try { const b = await req.json(); videoId = String(b?.videoId || '') } catch (e) {}
  if (!AULAS_RANKING.includes(videoId)) return NextResponse.json({ error: 'Aula invalida.' }, { status: 400 })
  const db = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const r = await db.from('aulas_assistidas').upsert({ user_id: user.id, video_id: videoId }, { onConflict: 'user_id,video_id', ignoreDuplicates: true })
  if (r.error) return NextResponse.json({ error: 'Nao foi possivel registrar.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

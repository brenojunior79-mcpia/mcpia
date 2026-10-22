import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function quem(): Promise<{ admin: boolean; nome: string } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const p = await supabase.from('profiles').select('is_admin, is_support, full_name').eq('id', user.id).maybeSingle()
  const d: any = p.data
  if (!d || !(d.is_admin || d.is_support)) return null
  return { admin: !!d.is_admin, nome: String(d.full_name || '').trim().split(/\s+/)[0] || (d.is_admin ? 'Admin' : 'Atendente') }
}

function db() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

// Admin ou atendente libera um aluno (por e-mail) na Estrutura Express, sem depender da compra
export async function POST(req: NextRequest) {
  const q = await quem()
  if (!q) return NextResponse.json({ error: 'Somente a equipe pode fazer isso.' }, { status: 403 })
  let body: any = {}
  try { body = await req.json() } catch (e) {}
  const email = String(body?.email || '').trim().toLowerCase()
  const nota = String(body?.nota || '').trim().slice(0, 200)
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  const r = await db().from('estrutura_liberados').upsert({ email, nota: nota || null, liberado_por: q.nome }, { onConflict: 'email' })
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// So o admin tira a liberacao manual
export async function DELETE(req: NextRequest) {
  const q = await quem()
  if (!q || !q.admin) return NextResponse.json({ error: 'Somente o admin pode fazer isso.' }, { status: 403 })
  const email = String(req.nextUrl.searchParams.get('email') || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  const r = await db().from('estrutura_liberados').delete().eq('email', email)
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function souAdmin(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const p = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  return !!(p.data as any)?.is_admin
}

function db() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

// Admin libera um aluno (por e-mail) na Estrutura Express, sem depender da compra
export async function POST(req: NextRequest) {
  if (!(await souAdmin())) return NextResponse.json({ error: 'Somente o admin pode fazer isso.' }, { status: 403 })
  let body: any = {}
  try { body = await req.json() } catch (e) {}
  const email = String(body?.email || '').trim().toLowerCase()
  const nota = String(body?.nota || '').trim().slice(0, 200)
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  const r = await db().from('estrutura_liberados').upsert({ email, nota: nota || null }, { onConflict: 'email' })
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Admin tira a liberacao manual
export async function DELETE(req: NextRequest) {
  if (!(await souAdmin())) return NextResponse.json({ error: 'Somente o admin pode fazer isso.' }, { status: 403 })
  const email = String(req.nextUrl.searchParams.get('email') || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  const r = await db().from('estrutura_liberados').delete().eq('email', email)
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

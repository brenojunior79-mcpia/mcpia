import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { adminClient } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// Ultimas tentativas de assinatura pelo cartao (so admin)
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 })
  const admin = adminClient()
  const p = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!(p.data as any)?.is_admin) return NextResponse.json({ error: 'Só o admin.' }, { status: 403 })
  const r = await admin.from('mp_eventos').select('id, created_at, user_id, email, nome, plano, tipo, motivo').order('created_at', { ascending: false }).limit(50)
  const eventos = (r.data || []) as any[]
  // WhatsApp do aluno (do cadastro), para o admin chamar com um toque
  const ids = Array.from(new Set(eventos.map(function(e) { return e.user_id }).filter(Boolean)))
  const emails = Array.from(new Set(eventos.map(function(e) { return String(e.email || '').toLowerCase() }).filter(Boolean)))
  const zapPorId: Record<string, string> = {}, zapPorEmail: Record<string, string> = {}
  if (ids.length) { const q = await admin.from('profiles').select('id, whatsapp').in('id', ids); for (const x of (q.data || []) as any[]) if (x.whatsapp) zapPorId[x.id] = String(x.whatsapp) }
  if (emails.length) { const q = await admin.from('profiles').select('email, whatsapp').in('email', emails); for (const x of (q.data || []) as any[]) if (x.whatsapp) zapPorEmail[String(x.email).toLowerCase()] = String(x.whatsapp) }
  return NextResponse.json({ eventos: eventos.map(function(e) { return { id: e.id, created_at: e.created_at, email: e.email, nome: e.nome, plano: e.plano, tipo: e.tipo, motivo: e.motivo, whatsapp: zapPorId[e.user_id] || zapPorEmail[String(e.email || '').toLowerCase()] || '' } }) })
}

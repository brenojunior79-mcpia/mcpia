import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Quantas pessoas ja tem a Estrutura Express (compras reais da Hubla, sem reembolso). Guarda 60 segundos.
let guardado: { t: number; total: number } | null = null

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  if (guardado && Date.now() - guardado.t < 60000) return NextResponse.json({ total: guardado.total })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const r = await admin.from('hubla_compras').select('email, wa').eq('cat', 'e').eq('reembolsado', false).limit(20000)
  if (r.error) return NextResponse.json({ total: guardado ? guardado.total : 0 })
  // Cada pessoa conta uma vez: pelo telefone (8 ultimos digitos) ou, se nao tiver, pelo e-mail
  const pessoas: Record<string, boolean> = {}
  for (const c of (r.data || []) as any[]) {
    const tel = String(c.wa || '').replace(/\D/g, '').slice(-8)
    const chave = tel.length === 8 ? 't' + tel : (c.email ? 'e' + String(c.email).toLowerCase() : '')
    if (chave) pessoas[chave] = true
  }
  const total = Object.keys(pessoas).length
  guardado = { t: Date.now(), total }
  return NextResponse.json({ total })
}

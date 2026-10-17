import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { adminClient, requireAdmin, waConfig } from '@/lib/whatsapp'
import { processarFluxos } from '@/lib/waAuto'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

function igual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

// Roda os passos que ja chegaram na hora. O agendador do banco chama isto a cada minuto.
export async function POST(req: NextRequest) {
  const admin = adminClient()
  const header = req.headers.get('x-auto-secret') || ''
  let permitido = false
  if (header) {
    const s = await admin.from('wa_auto_secret').select('secret').eq('id', 1).maybeSingle()
    const segredo = String(s.data?.secret || '')
    permitido = !!segredo && igual(header, segredo)
  } else {
    permitido = !!(await requireAdmin())
  }
  if (!permitido) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  const cfg = waConfig()
  if (!cfg.token) return NextResponse.json({ error: 'WhatsApp nao conectado.' }, { status: 400 })
  const r = await processarFluxos(admin, cfg.token)
  return NextResponse.json({ ok: true, ...r })
}

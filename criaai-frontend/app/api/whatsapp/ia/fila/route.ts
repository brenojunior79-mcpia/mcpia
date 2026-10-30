import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { adminClient, requireAdmin } from '@/lib/whatsapp'
import { processarFilaIA } from '@/lib/waIAFila'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

function igual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

// Envia as respostas do assistente que estao na fila, "digitando" como uma pessoa. O agendador do banco chama isto a cada minuto.
export async function POST(req: NextRequest) {
  const admin = adminClient()
  const header = req.headers.get('x-auto-secret') || ''
  let permitido = false
  if (header) {
    const s = await admin.from('wa_auto_secret').select('secret').eq('id', 1).maybeSingle()
    const segredo = String((s.data as any)?.secret || '')
    permitido = !!segredo && igual(header, segredo)
  } else {
    permitido = !!(await requireAdmin())
  }
  if (!permitido) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  const r = await processarFilaIA(admin)
  return NextResponse.json({ ok: true, ...r })
}

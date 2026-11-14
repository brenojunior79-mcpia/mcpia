import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// Produtos cadastrados para filtrar os fluxos ("so dispara para este produto").
// Ficam em wa_settings (chave 'produtos'), sem tabela nova. O fluxo guarda o NOME do produto e o motor confere
// se o nome do produto que veio da Hubla CONTEM esse nome (sem diferenca de maiuscula), como ja funcionava.
type Produto = { id: string; nome: string }

function limpar(lista: any): Produto[] {
  const vistos: Record<string, boolean> = {}
  const out: Produto[] = []
  for (const p of (Array.isArray(lista) ? lista : []).slice(0, 50)) {
    const nome = String(p?.nome || '').replace(/\s+/g, ' ').trim().slice(0, 80)
    if (!nome) continue
    const chave = nome.toLowerCase()
    if (vistos[chave]) continue
    vistos[chave] = true
    const id = String(p?.id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || ('p' + Math.random().toString(36).slice(2, 10))
    out.push({ id, nome })
  }
  return out
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  const admin = adminClient()
  const [r, v] = await Promise.all([
    admin.from('wa_settings').select('value').eq('key', 'produtos').maybeSingle(),
    // Sugestoes: nomes de produtos que ja apareceram nas vendas da Hubla
    admin.from('hubla_compras').select('produto').not('produto', 'is', null).order('paid_at', { ascending: false }).limit(1000),
  ])
  const produtos = limpar((r.data?.value as any)?.lista)
  const contagem: Record<string, { nome: string; n: number }> = {}
  for (const x of (v.data || []) as any[]) {
    const nome = String(x.produto || '').replace(/\s+/g, ' ').trim()
    if (!nome) continue
    const k = nome.toLowerCase()
    if (!contagem[k]) contagem[k] = { nome, n: 0 }
    contagem[k].n++
  }
  const sugestoes = Object.values(contagem).sort(function(a, b) { return b.n - a.n }).slice(0, 12).map(function(x) { return x.nome })
  return NextResponse.json({ produtos, sugestoes })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'So administradores.' }, { status: 403 })
  let input: any
  try { input = await req.json() } catch (e) { return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 }) }
  const produtos = limpar(input?.produtos)
  const up = await adminClient().from('wa_settings').upsert({ key: 'produtos', value: { lista: produtos }, updated_at: new Date().toISOString() })
  if (up.error) return NextResponse.json({ error: 'Nao foi possivel salvar.' }, { status: 500 })
  return NextResponse.json({ ok: true, produtos })
}

import { NextResponse } from 'next/server'
import { graph, usuarioAssistente } from '@/lib/anunciosAssistente'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Lista as paginas do Facebook e os pixels da conta de anuncios conectada (para a conversa oferecer as opcoes)
export async function GET() {
  const u = await usuarioAssistente()
  if ('erro' in u) return NextResponse.json({ error: u.erro }, { status: u.status })
  const [pg, px] = await Promise.all([
    graph('me/accounts', u.token, { query: { fields: 'id,name', limit: '50' } }),
    graph(u.conta + '/adspixels', u.token, { query: { fields: 'id,name', limit: '50' } }),
  ])
  const paginas = pg.ok ? ((pg.data.data || []) as any[]).map(function(p) { return { id: String(p.id), name: String(p.name || p.id) } }) : []
  const pixels = px.ok ? ((px.data.data || []) as any[]).map(function(p) { return { id: String(p.id), name: String(p.name || p.id) } }) : []
  return NextResponse.json({
    conta: { id: u.conta, name: u.contaNome },
    paginas, pixels,
    avisos: [pg.ok ? '' : 'Paginas: ' + pg.erro, px.ok ? '' : 'Pixels: ' + px.erro].filter(Boolean),
  })
}

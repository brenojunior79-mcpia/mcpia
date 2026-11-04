import { NextRequest, NextResponse } from 'next/server'
import { faltando, graph, limparRascunho, rascunhoVazio, usuarioAssistente } from '@/lib/anunciosAssistente'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CAMPOS_IA = ['produto', 'paginaId', 'pixelId', 'orcamentoDiario', 'idadeMin', 'idadeMax', 'genero', 'titulo', 'legenda', 'botao']

// Guarda no rascunho o que a IA confirmou (campos) ou o link que a pessoa colou na tela (linkColado).
// O servidor valida tudo: pagina e pixel precisam existir na conta, link https, orcamento dentro do limite.
export async function POST(req: NextRequest) {
  const u = await usuarioAssistente()
  if ('erro' in u) return NextResponse.json({ error: u.erro }, { status: u.status })
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const temMidia = !!b.temMidia

  const [pg, px] = await Promise.all([
    graph('me/accounts', u.token, { query: { fields: 'id,name', limit: '50' } }),
    graph(u.conta + '/adspixels', u.token, { query: { fields: 'id,name', limit: '50' } }),
  ])
  const paginas = pg.ok ? ((pg.data.data || []) as any[]).map(function(p) { return { id: String(p.id) } }) : []
  const pixels = px.ok ? ((px.data.data || []) as any[]).map(function(p) { return { id: String(p.id) } }) : []
  const anterior = limparRascunho(b.rascunho, paginas, pixels, rascunhoVazio())
  let atual = anterior
  const recusados: string[] = []

  const campos: any = {}
  const bruto = b.campos && typeof b.campos === 'object' ? b.campos : {}
  CAMPOS_IA.forEach(function(k) { if (k in bruto) campos[k] = bruto[k] })
  if (Object.keys(campos).length) {
    atual = limparRascunho(campos, paginas, pixels, anterior)
    const vistos: any = atual
    Object.keys(campos).forEach(function(k) {
      const v = campos[k]
      if ((k === 'paginaId' || k === 'pixelId' || k === 'orcamentoDiario') && v !== null && v !== '' && vistos[k] === null) recusados.push(k === 'paginaId' ? 'pagina (id invalido)' : k === 'pixelId' ? 'pixel (id invalido)' : 'orcamento (fora do limite)')
    })
  }

  let linkStatus = ''
  if (typeof b.linkColado === 'string' && b.linkColado.trim()) {
    const achou = b.linkColado.match(/https?:\/\/[^\s]+/i)
    if (!achou) linkStatus = 'invalido'
    else {
      const url = achou[0].replace(/[.,;)]+$/, '')
      if (/(instagram\.com|facebook\.com|fb\.com|fb\.watch|youtube\.com|youtu\.be|wa\.me|whatsapp\.com|tiktok\.com)/i.test(url)) linkStatus = 'rede_social'
      else {
        const novo = limparRascunho({ link: url.indexOf('http://') === 0 ? 'https://' + url.slice(7) : url }, paginas, pixels, atual)
        if (novo.link) { atual = novo; linkStatus = 'ok' } else linkStatus = 'invalido'
      }
    }
  }

  const falta = faltando(atual, temMidia)
  return NextResponse.json({ rascunho: atual, falta, pronto: falta.length === 0, recusados, linkStatus })
}

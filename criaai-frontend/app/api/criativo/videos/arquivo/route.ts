import { NextRequest, NextResponse } from 'next/server'
import { usuarioCriativo } from '@/lib/criativoAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Entrega o arquivo de um video do Pixabay pelo nosso servidor (para o navegador conseguir usar no editor).
// So aceita enderecos do Pixabay.
export async function GET(req: NextRequest) {
  const u = await usuarioCriativo()
  if (!u) return NextResponse.json({ error: 'Este recurso esta em atualizacao no momento.' }, { status: 403 })
  let alvo: URL
  try { alvo = new URL(String(req.nextUrl.searchParams.get('u') || '')) } catch (e) { return NextResponse.json({ error: 'Endereco invalido.' }, { status: 400 }) }
  if (alvo.protocol !== 'https:' || !/^(cdn\.)?pixabay\.com$/.test(alvo.hostname)) return NextResponse.json({ error: 'Endereco nao permitido.' }, { status: 400 })
  try {
    const r = await fetch(alvo.toString())
    if (!r.ok || !r.body) return NextResponse.json({ error: 'Nao foi possivel baixar o video.' }, { status: 502 })
    return new NextResponse(r.body as any, { status: 200, headers: { 'Content-Type': r.headers.get('content-type') || 'video/mp4', 'Cache-Control': 'private, max-age=3600' } })
  } catch (e) {
    return NextResponse.json({ error: 'Nao foi possivel baixar o video.' }, { status: 502 })
  }
}

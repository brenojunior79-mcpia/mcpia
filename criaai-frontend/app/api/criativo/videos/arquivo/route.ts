import { NextRequest, NextResponse } from 'next/server'
import { usuarioCriativo, msgBloqueioCriativo } from '@/lib/criativoAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Baixa o arquivo de um video do Vecteezy pelo nosso servidor (o download usa a cota do plano, por isso so acontece
// quando a pessoa monta o criativo) e entrega para o editor do navegador.
const BASE = (process.env.VECTEEZY_API_BASE || 'https://api.vecteezy.com').replace(/\/$/, '')

export async function GET(req: NextRequest) {
  const u = await usuarioCriativo()
  if (!u) return NextResponse.json({ error: await msgBloqueioCriativo() }, { status: 403 })
  const chave = process.env.VECTEEZY_API_KEY
  const conta = process.env.VECTEEZY_ACCOUNT_ID
  if (!chave || !conta) return NextResponse.json({ error: 'A chave do Vecteezy ainda nao foi configurada.' }, { status: 503 })
  const id = String(req.nextUrl.searchParams.get('id') || '').replace(/\D/g, '')
  if (!id) return NextResponse.json({ error: 'Video invalido.' }, { status: 400 })

  // Diagnostico (so admin): ?debug=1&id=123 mostra como o Vecteezy responde ao pedido de download (conta 1 download da cota)
  if (u.admin && req.nextUrl.searchParams.get('debug')) {
    try {
      const extra = String(req.nextUrl.searchParams.get('extra') || '').replace(/[^a-zA-Z0-9_=&.\-]/g, '').slice(0, 120)
      const dr = await fetch(BASE + '/v2/' + encodeURIComponent(conta) + '/resources/' + id + '/download' + (extra ? '?' + extra : ''), { headers: { Authorization: 'Bearer ' + chave, Accept: 'application/json' }, redirect: 'manual' })
      const tipo = dr.headers.get('content-type') || ''
      const corpo = /video\//.test(tipo) ? '(arquivo de video)' : (await dr.text()).slice(0, 3000)
      return NextResponse.json({ status: dr.status, tipo, local: dr.headers.get('location') || '', corpo })
    } catch (e: any) { return NextResponse.json({ erro: String(e?.message || e) }) }
  }

  try {
    const cab = { Authorization: 'Bearer ' + chave, Accept: 'application/json' }
    const r = await fetch(BASE + '/v2/' + encodeURIComponent(conta) + '/resources/' + id + '/download', { headers: cab })
    if (!r.ok) return NextResponse.json({ error: 'O Vecteezy não liberou o download deste vídeo (' + r.status + ').' }, { status: 502 })
    const tipo = r.headers.get('content-type') || ''
    if (/video\//.test(tipo) && r.body) {
      return new NextResponse(r.body as any, { status: 200, headers: { 'Content-Type': tipo, 'Cache-Control': 'private, max-age=3600' } })
    }
    const j: any = await r.json()
    const link = j.url || j.download_url || j.link || (j.data && (j.data.url || j.data.download_url)) || (j.resource && j.resource.download_url)
    let alvo: URL
    try { alvo = new URL(String(link || '')) } catch (e) { return NextResponse.json({ error: 'O Vecteezy não devolveu o endereço do vídeo.' }, { status: 502 }) }
    if (alvo.protocol !== 'https:' || !/(^|\.)vecteezy\.com$|(^|\.)amazonaws\.com$|(^|\.)cloudfront\.net$/.test(alvo.hostname)) return NextResponse.json({ error: 'Endereco nao permitido.' }, { status: 400 })
    const f = await fetch(alvo.toString())
    if (!f.ok || !f.body) return NextResponse.json({ error: 'Nao foi possivel baixar o video.' }, { status: 502 })
    // Registra o tamanho real do arquivo para sabermos se o Vecteezy esta entregando video pesado demais para o navegador
    console.log('[vecteezy/arquivo] id=' + id + ' tipo=' + (f.headers.get('content-type') || '?') + ' mb=' + (Number(f.headers.get('content-length') || 0) / 1048576).toFixed(1))
    return new NextResponse(f.body as any, { status: 200, headers: { 'Content-Type': f.headers.get('content-type') || 'video/mp4', 'Cache-Control': 'private, max-age=3600' } })
  } catch (e) {
    return NextResponse.json({ error: 'Nao foi possivel baixar o video.' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// Cadastro so com o e-mail usado na compra. A tela pergunta aqui antes de criar a conta
// (o banco confere de novo na hora de criar, entao burlar a tela nao adianta).
// Freio simples por IP para ninguem ficar testando e-mails dos outros.
const tentativas = new Map<string, number[]>()

export async function POST(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'sem-ip'
  const agora = Date.now()
  const lista = (tentativas.get(ip) || []).filter(function(t) { return agora - t < 10 * 60 * 1000 })
  if (lista.length >= 20) return NextResponse.json({ ok: false, erro: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
  lista.push(agora)
  tentativas.set(ip, lista)
  if (tentativas.size > 5000) tentativas.clear()

  let email = ''
  try { email = String((await req.json())?.email || '').trim().toLowerCase().slice(0, 200) } catch (e) {}
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok: false, erro: 'E-mail inválido.' }, { status: 400 })

  const r = await adminClient().rpc('email_pode_cadastrar', { p_email: email })
  if (r.error) {
    console.error('[cadastro] verificar:', r.error.message)
    // Se a conferencia falhar, nao trava a pessoa na tela: o banco confere de novo ao criar a conta
    return NextResponse.json({ ok: true, conferido: false })
  }
  return NextResponse.json({ ok: r.data === true, conferido: true })
}

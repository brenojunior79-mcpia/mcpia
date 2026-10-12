import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function page(title: string, text: string, form?: string) {
  const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title></head>' +
    '<body style="margin:0;background:#f4f5fa;font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px;">' +
    '<div style="background:#fff;max-width:420px;width:100%;border-radius:18px;padding:32px 26px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.08);">' +
    '<div style="font-size:18px;font-weight:700;color:#5b4ef8;margin-bottom:14px;">Plataforma do Cristão Próspero</div>' +
    '<h1 style="font-size:20px;margin:0 0 10px;color:#1a1c2e;">' + title + '</h1>' +
    '<p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 20px;">' + text + '</p>' + (form || '') +
    '</div></body></html>'
  return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

async function unsubscribe(u: string) {
  if (!UUID.test(u)) return false
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const r = await supabase.rpc('email_unsubscribe', { p_user: u })
  return !r.error
}

// Abrir o link mostra uma confirmacao (assim programas que "visitam" links nao descadastram sem querer)
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u') || ''
  if (!UUID.test(u)) return page('Link inválido', 'Esse link não é válido. Se quiser sair da lista, responda ao e-mail pedindo.')
  const form = '<form method="POST" action="/api/email/unsubscribe?u=' + u + '"><button type="submit" style="padding:13px 26px;border:none;border-radius:12px;background:#5b4ef8;color:#fff;font-size:15px;font-weight:700;cursor:pointer;">Sair da lista</button></form>'
  return page('Quer sair da lista?', 'Você deixará de receber nossos e-mails de novidades e convites.', form)
}

// Confirmacao (botao da pagina) e descadastro em 1 clique (Gmail/Yahoo)
export async function POST(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u') || ''
  const ok = await unsubscribe(u)
  if (!ok) return page('Algo deu errado', 'Não foi possível concluir agora. Tente de novo em alguns minutos.')
  return page('Pronto!', 'Você saiu da lista e não vai mais receber nossos e-mails de novidades.')
}

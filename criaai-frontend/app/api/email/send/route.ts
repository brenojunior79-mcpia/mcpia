import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { buildEmail, firstNameOf, normalizeButtonUrl, SITE_URL } from '@/lib/email-template'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const AUDIENCES = ['teste', 'todos', 'sem_plano', 'com_plano', 'inativos_14', 'inativos_14_30', 'inativos_30']
// Quem nao acessa ha X dias: [minimo, maximo]
const INACTIVE_RANGES: Record<string, [number, number | null]> = { inativos_14: [14, null], inativos_14_30: [14, 30], inativos_30: [30, null] }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BATCH = 100            // o Resend aceita ate 100 e-mails por chamada
const PAUSE_MS = 650         // limite padrao do Resend: 2 chamadas por segundo
const TIME_BUDGET_MS = 50000 // a funcao pode rodar ate 60s

function hasPlan(status: any) { return status === 'active' || status === 'trialing' }
function sleep(ms: number) { return new Promise(function(r) { setTimeout(r, ms) }) }

async function sendBatch(apiKey: string, messages: any[]): Promise<{ ok: boolean, error?: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    })
    if (res.ok) return { ok: true }
    if (res.status === 429) { await sleep(1500 * (attempt + 1)); continue }
    let msg = 'Erro ' + res.status
    try { const j = await res.json(); msg = j.message || j.error || msg } catch (e) {}
    return { ok: false, error: msg }
  }
  return { ok: false, error: 'Limite de envios do Resend atingido. Tente de novo em instantes.' }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const me = await supabase.from('profiles').select('is_admin, full_name').eq('id', user.id).single()
    if (!me.data?.is_admin) return NextResponse.json({ error: 'Somente o admin pode enviar' }, { status: 403 })

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'A chave RESEND_API_KEY ainda não foi colocada na Vercel.' }, { status: 500 })
    const from = process.env.EMAIL_FROM || 'Cristão Próspero <novidades@mcpia.site>'
    // Opcional: para onde vão as respostas dos alunos (ajuda a reputação do e-mail)
    const replyTo = process.env.EMAIL_REPLY_TO || ''

    const body = await req.json()
    const subject = String(body.subject || '').trim()
    const message = String(body.message || '').trim()
    const buttonText = String(body.buttonText || '').trim()
    const buttonUrl = String(body.buttonUrl || '').trim()
    const imageUrl = String(body.imageUrl || '').trim()
    const imageLink = String(body.imageLink || '').trim()
    const audience = String(body.audience || 'teste')

    if (!subject || subject.length > 120) return NextResponse.json({ error: 'O assunto precisa ter entre 1 e 120 letras.' }, { status: 400 })
    if (!message || message.length > 5000) return NextResponse.json({ error: 'A mensagem precisa ter entre 1 e 5000 letras.' }, { status: 400 })
    if (AUDIENCES.indexOf(audience) === -1) return NextResponse.json({ error: 'Público inválido.' }, { status: 400 })
    if (buttonUrl && !normalizeButtonUrl(buttonUrl)) return NextResponse.json({ error: 'O link do botão precisa começar com https:// ou com /' }, { status: 400 })
    // A imagem precisa ser uma das enviadas pela propria plataforma
    const imagePrefix = (process.env.NEXT_PUBLIC_SUPABASE_URL || '') + '/storage/v1/object/public/email-images/'
    if (imageUrl && (imageUrl.indexOf(imagePrefix) !== 0 || /[\s"'<>]/.test(imageUrl))) return NextResponse.json({ error: 'Imagem inválida. Envie a imagem de novo.' }, { status: 400 })
    if (imageLink && !normalizeButtonUrl(imageLink)) return NextResponse.json({ error: 'O link da imagem precisa começar com https:// ou com /' }, { status: 400 })
    if (buttonUrl && !buttonText) return NextResponse.json({ error: 'Escreva o texto do botão ou deixe o link vazio.' }, { status: 400 })

    // Quem vai receber
    let targets: { id: string, email: string, name: string }[] = []
    if (audience === 'teste') {
      if (!user.email) return NextResponse.json({ error: 'Sua conta não tem e-mail.' }, { status: 400 })
      targets = [{ id: user.id, email: user.email, name: firstNameOf(me.data?.full_name) }]
    } else {
      let all: any[] = []
      let fromRow = 0
      while (true) {
        const page = await supabase
          .from('profiles')
          .select('id, email, full_name, subscription_status, email_unsubscribed, refunded_at')
          .order('id', { ascending: true })
          .range(fromRow, fromRow + 999)
        if (page.error) {
          const hint = /email_unsubscribed/.test(page.error.message || '') ? ' Rode o arquivo Q1-emails.sql no Supabase primeiro.' : ''
          return NextResponse.json({ error: 'Erro ao carregar os alunos: ' + page.error.message + hint }, { status: 500 })
        }
        const rows = page.data || []
        all = all.concat(rows)
        if (rows.length < 1000) break
        fromRow += 1000
      }
      // Quem nao acessa ha X dias
      let inactiveIds: Record<string, boolean> | null = null
      if (INACTIVE_RANGES[audience]) {
        const range = INACTIVE_RANGES[audience]
        const ir = await supabase.rpc('email_inactive_users', { p_min_days: range[0], p_max_days: range[1] })
        if (ir.error) return NextResponse.json({ error: 'Não foi possível listar os alunos inativos: ' + ir.error.message + ' (rode o arquivo Z1-alunos-inativos.sql no Supabase)' }, { status: 500 })
        inactiveIds = {}
        ;(ir.data || []).forEach(function(r: any) { if (inactiveIds) inactiveIds[r.user_id] = true })
      }
      targets = all.filter(function(p: any) {
        if (p.email_unsubscribed) return false
        if (p.refunded_at) return false
        if (inactiveIds && !inactiveIds[p.id]) return false
        if (!p.email || !EMAIL_RE.test(p.email)) return false
        if (audience === 'sem_plano') return !hasPlan(p.subscription_status)
        if (audience === 'com_plano') return hasPlan(p.subscription_status)
        return true
      }).map(function(p: any) { return { id: p.id, email: p.email, name: firstNameOf(p.full_name) } })
    }

    if (targets.length === 0) return NextResponse.json({ error: 'Nenhum aluno para receber esse envio.' }, { status: 400 })

    // O envio ganha um numero proprio antes de sair, para contar as aberturas
    const broadcastId = crypto.randomUUID()
    // O registro do envio e criado antes, para as primeiras aberturas ja serem contadas
    const created = await supabase.from('email_broadcasts').insert({
      id: broadcastId, subject, audience, sent_by: user.id, total: targets.length, sent_count: 0, failed_count: 0,
    })
    if (created.error) return NextResponse.json({ error: 'Erro ao registrar o envio: ' + created.error.message }, { status: 500 })
    const started = Date.now()
    let sent = 0
    let failed = 0
    let firstError = ''
    let processed = 0

    for (let i = 0; i < targets.length; i += BATCH) {
      if (Date.now() - started > TIME_BUDGET_MS) break
      const chunk = targets.slice(i, i + BATCH)
      const messages = chunk.map(function(t) {
        const unsub = SITE_URL + '/api/email/unsubscribe?u=' + t.id
        const openPixelUrl = SITE_URL + '/api/email/open?b=' + broadcastId + '&u=' + t.id
        const mail = buildEmail({ subject, message, buttonText, buttonUrl, imageUrl, imageLink, name: t.name, unsubscribeUrl: unsub, openPixelUrl })
        const msg: any = {
          from, to: [t.email], subject, html: mail.html, text: mail.text,
          headers: { 'List-Unsubscribe': '<' + unsub + '>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        }
        if (replyTo) msg.reply_to = replyTo
        return msg
      })
      const r = await sendBatch(apiKey, messages)
      if (r.ok) sent += chunk.length
      else { failed += chunk.length; if (!firstError) firstError = r.error || '' }
      processed += chunk.length
      // se o primeiro lote falhar por configuracao (dominio, chave), nao adianta continuar
      if (!r.ok && sent === 0) break
      await sleep(PAUSE_MS)
    }

    const notSent = targets.length - processed
    if (sent === 0) {
      await supabase.from('email_broadcasts').delete().eq('id', broadcastId)
    } else {
      await supabase.from('email_broadcasts').update({ sent_count: sent, failed_count: failed + notSent }).eq('id', broadcastId)
    }

    if (sent === 0) {
      return NextResponse.json({ error: 'Nenhum e-mail foi enviado. ' + (firstError || '') }, { status: 502 })
    }
    return NextResponse.json({ ok: true, total: targets.length, sent, failed, notSent, firstError })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao enviar' }, { status: 500 })
  }
}

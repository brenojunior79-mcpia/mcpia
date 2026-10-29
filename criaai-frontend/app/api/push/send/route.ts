import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase-server'
import { VAPID_PUBLIC_KEY } from '@/lib/push-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const AUDIENCES = ['teste', 'todos', 'sem_plano', 'com_plano']

function hasPlan(status: any) {
  return status === 'active' || status === 'trialing'
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const me = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!me.data?.is_admin) return NextResponse.json({ error: 'Somente o admin pode enviar' }, { status: 403 })

    const privateKey = process.env.VAPID_PRIVATE_KEY
    if (!privateKey) {
      return NextResponse.json({ error: 'A chave VAPID_PRIVATE_KEY ainda não foi colocada na Vercel.' }, { status: 500 })
    }

    const body = await req.json()
    const title = String(body.title || '').trim()
    const message = String(body.body || '').trim()
    let url = String(body.url || '').trim()
    const audience = String(body.audience || 'teste')

    if (!title || title.length > 65) return NextResponse.json({ error: 'O título precisa ter entre 1 e 65 letras.' }, { status: 400 })
    if (!message || message.length > 240) return NextResponse.json({ error: 'A mensagem precisa ter entre 1 e 240 letras.' }, { status: 400 })
    if (AUDIENCES.indexOf(audience) === -1) return NextResponse.json({ error: 'Público inválido.' }, { status: 400 })
    // Somente links dentro da propria plataforma
    if (!url) url = '/dashboard'
    if (url.charAt(0) !== '/' || url.charAt(1) === '/') return NextResponse.json({ error: 'O link precisa começar com / (página da própria plataforma).' }, { status: 400 })

    webpush.setVapidDetails('https://mcpia.site', VAPID_PUBLIC_KEY, privateKey)

    // Busca todos os aparelhos cadastrados (em blocos de 1000)
    let subs: any[] = []
    let from = 0
    while (true) {
      const page = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth, user_id, profiles(subscription_status)')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + 999)
      if (page.error) return NextResponse.json({ error: 'Erro ao carregar os aparelhos: ' + page.error.message }, { status: 500 })
      const rows = page.data || []
      subs = subs.concat(rows)
      if (rows.length < 1000) break
      from += 1000
    }

    const targets = subs.filter(function(s: any) {
      const prof: any = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
      const status = prof?.subscription_status
      if (audience === 'teste') return s.user_id === user.id
      if (audience === 'sem_plano') return !hasPlan(status)
      if (audience === 'com_plano') return hasPlan(status)
      return true
    })

    if (targets.length === 0) {
      return NextResponse.json({
        error: audience === 'teste'
          ? 'O seu aparelho ainda não está cadastrado. Abra a plataforma no seu celular ou computador e toque em "Ativar notificações".'
          : 'Nenhum aparelho cadastrado para esse público.',
      }, { status: 400 })
    }

    const broadcastId = randomUUID()
    // Envios de teste nao entram no relatorio
    const payload = JSON.stringify(audience === 'teste' ? { title, body: message, url } : { title, body: message, url, tipo: 'broadcast', ref: broadcastId })
    let sent = 0
    let failed = 0
    const deadIds: string[] = []

    const CHUNK = 25
    for (let i = 0; i < targets.length; i += CHUNK) {
      const chunk = targets.slice(i, i + CHUNK)
      const results = await Promise.allSettled(chunk.map(function(s: any) {
        return webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 24, timeout: 10000 }
        )
      }))
      results.forEach(function(r, idx) {
        if (r.status === 'fulfilled') {
          sent++
        } else {
          failed++
          const code = (r.reason as any)?.statusCode
          // 404/410 = o aparelho nao existe mais (app desinstalado ou permissao removida)
          if (code === 404 || code === 410) deadIds.push(chunk[idx].id)
        }
      })
    }

    if (deadIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', deadIds)
    }

    await supabase.from('push_broadcasts').insert({
      id: broadcastId, title, body: message, url, audience, sent_by: user.id,
      total: targets.length, sent_count: sent, failed_count: failed,
    })

    return NextResponse.json({ ok: true, total: targets.length, sent, failed, removed: deadIds.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao enviar' }, { status: 500 })
  }
}

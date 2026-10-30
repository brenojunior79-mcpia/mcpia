import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { timingSafeEqual } from 'crypto'
import { VAPID_PUBLIC_KEY } from '@/lib/push-config'
import { testeVendaAdmin } from '@/lib/pushAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Notificacoes automaticas no celular. A Vercel chama esta rota todo dia (vercel.json) com o CRON_SECRET.
//  1) "Sentimos sua falta": quem esta ha 2 dias ou mais sem abrir a plataforma (no maximo 1 vez a cada 7 dias).
//  2) "Oferta da Estrutura Express": quem ainda nao tem a Estrutura Express (no maximo 1 vez por semana; o intervalo fica no card em Admin > Notificacoes).
// Os horarios ficam no vercel.json: 'Sentimos sua falta' as 9h e 'Oferta Express' as 18h (Brasilia). O admin pode testar em /api/push/auto?teste=1 (so no aparelho dele).
const PADRAO: Record<string, { title: string; body: string; url: string }> = {
  sentimos_falta: {
    title: 'Sentimos sua falta 🙏',
    body: 'Faz alguns dias que você não entra na plataforma. Volte e continue de onde parou!',
    url: '/dashboard',
  },
  oferta_express: {
    title: '🎉 R$ 100 de desconto na Estrutura Express',
    body: 'Produto, site e criativos prontos para você. A oferta termina hoje à meia-noite!',
    url: '/dashboard/estrutura-express',
  },
  // Todo dia as 19h (Brasilia): chamado pelo agendador do banco (pg_cron), nao pela Vercel
  ranking_diario: {
    title: '🏆 Veja como está o ranking!',
    body: 'Os 3 primeiros ganham R$ 200, R$ 150 e R$ 100 no Pix. Entre agora, ganhe pontos e suba de posição!',
    url: '/dashboard',
  },
}

type Aviso = { title: string; body: string; url: string }

// Le os textos e se esta ligado no banco (card em Admin > Notificacoes); se falhar, usa o padrao
async function carregarConfig(admin: any): Promise<Record<string, Aviso & { ativo: boolean }>> {
  const out: Record<string, Aviso & { ativo: boolean }> = {}
  const r = await admin.from('push_auto_config').select('tipo, ativo, titulo, mensagem, url')
  for (const t of Object.keys(PADRAO)) out[t] = { ...PADRAO[t], ativo: true }
  for (const c of (r.data || []) as any[]) {
    if (out[c.tipo]) out[c.tipo] = { title: c.titulo || out[c.tipo].title, body: c.mensagem || out[c.tipo].body, url: c.url || out[c.tipo].url, ativo: c.ativo !== false }
  }
  return out
}

async function enviar(admin: any, alvos: any[], aviso: { title: string; body: string; url: string }, tipo?: string) {
  // 'tipo' faz o aparelho avisar quando a notificacao chega e quando a pessoa clica (relatorio em Admin > Notificacoes)
  const payload = JSON.stringify(tipo ? { title: aviso.title, body: aviso.body, url: aviso.url, tipo } : aviso)
  const mortos: string[] = []
  const okUsers: Record<string, boolean> = {}
  let enviados = 0, falhas = 0
  const CHUNK = 25
  for (let i = 0; i < alvos.length; i += CHUNK) {
    const lote = alvos.slice(i, i + CHUNK)
    const res = await Promise.allSettled(lote.map(function(s: any) {
      return webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 12, timeout: 10000 })
    }))
    res.forEach(function(r, idx) {
      if (r.status === 'fulfilled') { enviados++; okUsers[lote[idx].user_id] = true }
      else {
        falhas++
        const code = (r.reason as any)?.statusCode
        if (code === 404 || code === 410) mortos.push(lote[idx].sub_id)
      }
    })
  }
  if (mortos.length) await admin.from('push_subscriptions').delete().in('id', mortos)
  return { enviados, falhas, removidos: mortos.length, pessoas: Object.keys(okUsers) }
}

async function tratar(req: NextRequest) {
  const segredo = process.env.CRON_SECRET
  const cab = req.headers.get('authorization') || ''
  let ehCron = !!segredo && cab === 'Bearer ' + segredo

  const admin: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  // Agendador do banco (pg_cron): manda o segredo no cabecalho x-auto-secret (o mesmo usado nos fluxos do WhatsApp)
  const hdr = req.headers.get('x-auto-secret') || ''
  if (!ehCron && hdr) {
    const s = await admin.from('wa_auto_secret').select('secret').eq('id', 1).maybeSingle()
    const seg = String((s.data as any)?.secret || '')
    const a = Buffer.from(hdr), b = Buffer.from(seg)
    ehCron = !!seg && a.length === b.length && timingSafeEqual(a, b)
  }
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!privateKey) return NextResponse.json({ error: 'VAPID_PRIVATE_KEY nao configurada.' }, { status: 500 })
  webpush.setVapidDetails('https://mcpia.site', VAPID_PUBLIC_KEY, privateKey)

  // Teste do admin: manda os dois avisos so para o aparelho dele (nao registra nada)
  if (!ehCron) {
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    const me = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (!me.data?.is_admin) return NextResponse.json({ error: 'Somente o admin' }, { status: 403 })
    // Admin pode disparar agora o envio de verdade (mesma regra do envio das 18h)
    if (req.nextUrl.searchParams.get('executar') === '1') { const so1 = String(req.nextUrl.searchParams.get('tipo') || ''); return NextResponse.json(await rodarTodos(admin, PADRAO[so1] ? so1 : '')) }
    const tipo = String(req.nextUrl.searchParams.get('tipo') || '')
    if (tipo === 'venda_admin') {
      const n = await testeVendaAdmin(admin)
      if (!n) return NextResponse.json({ error: 'Seu aparelho ainda nao esta cadastrado. Abra a plataforma no celular e ative as notificacoes.' }, { status: 400 })
      return NextResponse.json({ teste: true, venda_admin: { enviados: n } })
    }
    const subs = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth, user_id').eq('user_id', user.id)
    const meus = (subs.data || []).map(function(s: any) { return { sub_id: s.id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth, user_id: s.user_id } })
    if (!meus.length) return NextResponse.json({ error: 'Seu aparelho ainda nao esta cadastrado. Abra a plataforma no celular e ative as notificacoes.' }, { status: 400 })
    const cfg = await carregarConfig(admin)
    const tipos = cfg[tipo] ? [tipo] : Object.keys(cfg)
    const out: any = {}
    for (const t of tipos) { const r = await enviar(admin, meus, cfg[t]); out[t] = { enviados: r.enviados, falhas: r.falhas } }
    return NextResponse.json({ teste: true, ...out })
  }

  const so = String(req.nextUrl.searchParams.get('tipo') || '')
  return NextResponse.json(await rodarTodos(admin, PADRAO[so] ? so : ''))
}

// Envio de verdade: so quem esta na regra de cada aviso e ainda nao recebeu dentro do prazo
async function rodarTodos(admin: any, so: string) {
  const cfg = await carregarConfig(admin)
  const resultado: any = {}
  // O ranking das 19h so roda quando pedido de proposito (tipo=ranking_diario); os envios da Vercel nao o incluem
  for (const tipo of ['sentimos_falta', 'oferta_express', 'ranking_diario']) {
    if (so ? tipo !== so : tipo === 'ranking_diario') continue
    if (!cfg[tipo].ativo) { resultado[tipo] = { desligado: true, pessoas: 0, enviados: 0 }; continue }
    const q = await admin.rpc('push_auto_alvos', { p_tipo: tipo })
    if (q.error) { resultado[tipo] = { erro: q.error.message }; continue }
    const alvos = (q.data || []) as any[]
    if (!alvos.length) { resultado[tipo] = { pessoas: 0, enviados: 0 }; continue }
    const r = await enviar(admin, alvos, cfg[tipo], tipo)
    if (r.pessoas.length) {
      await admin.from('push_auto_envios').insert(r.pessoas.map(function(id) { return { user_id: id, tipo } }))
    }
    resultado[tipo] = { pessoas: r.pessoas.length, enviados: r.enviados, falhas: r.falhas, removidos: r.removidos }
  }
  return { ok: true, ...resultado }
}

export async function GET(req: NextRequest) { return tratar(req) }
export async function POST(req: NextRequest) { return tratar(req) }

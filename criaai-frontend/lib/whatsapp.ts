// WhatsApp oficial (Meta Cloud API). Tudo aqui roda so no servidor.
import { createHmac, timingSafeEqual } from 'crypto'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

const VERSION = process.env.WHATSAPP_API_VERSION || 'v23.0'
export const GRAPH = 'https://graph.facebook.com/' + VERSION

export function waConfig() {
  const token = process.env.WHATSAPP_TOKEN || ''
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || ''
  const appSecret = process.env.WHATSAPP_APP_SECRET || ''
  const missing: string[] = []
  if (!token) missing.push('WHATSAPP_TOKEN')
  if (!phoneId) missing.push('WHATSAPP_PHONE_NUMBER_ID')
  if (!verifyToken) missing.push('WHATSAPP_VERIFY_TOKEN')
  if (!appSecret) missing.push('WHATSAPP_APP_SECRET')
  return { token, phoneId, verifyToken, appSecret, missing }
}

export function adminClient() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Confere se o aviso veio mesmo da Meta (assinatura com o App Secret)
export function validSignature(raw: string, header: string | null, secret: string): boolean {
  try {
    if (!header || header.indexOf('sha256=') !== 0) return false
    const expected = createHmac('sha256', secret).update(raw).digest('hex')
    const got = header.slice(7)
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(got, 'utf8')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch (e) {
    return false
  }
}

// Quem esta logado e e' da equipe (admin ou atendente)? Devolve o id ou null.
export async function requireStaff(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const r = await supabase.rpc('wa_is_staff')
  return r.data === true ? user.id : null
}

export async function graphFetch(path: string, init?: RequestInit & { json?: any }): Promise<{ ok: boolean; status: number; data: any }> {
  const cfg = waConfig()
  const headers: Record<string, string> = { Authorization: 'Bearer ' + cfg.token }
  let body: any = init?.body
  if (init?.json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(init.json) }
  const res = await fetch(path.indexOf('http') === 0 ? path : GRAPH + '/' + path.replace(/^\//, ''), { method: init?.method || 'GET', headers, body })
  let data: any = null
  try { data = await res.json() } catch (e) {}
  return { ok: res.ok, status: res.status, data }
}

// Admin ve tudo; atendente ve as conversas dele e as que estao em espera (sem atendente)
export async function canAccessConv(userId: string, convId: string): Promise<boolean> {
  const admin = adminClient()
  const p = await admin.from('profiles').select('is_admin, wa_scope').eq('id', userId).maybeSingle()
  if ((p.data as any)?.is_admin) return true
  const c = await admin.from('wa_conversations').select('assigned_to, connection_id').eq('id', convId).maybeSingle()
  if (!c.data) return false
  const a = (c.data as any).assigned_to
  if (a && a !== userId) return false
  // Escopo do atendente: suporte, recuperacao ou todos
  const escopo = String((p.data as any)?.wa_scope || 'suporte')
  if (escopo === 'todos') return true
  return (escopo === 'recuperacao') === !!(c.data as any).connection_id
}

// 'suporte' | 'recuperacao' | 'todos' (admin = todos) do usuario logado
export async function escopoDoUsuario(userId: string): Promise<string> {
  const p = await adminClient().from('profiles').select('is_admin, wa_scope').eq('id', userId).maybeSingle()
  if ((p.data as any)?.is_admin) return 'todos'
  return String((p.data as any)?.wa_scope || 'suporte')
}

// So admin (para criar/apagar modelos)
export async function requireAdmin(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const p = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  return (p.data as any)?.is_admin ? user.id : null
}

// ID da conta do WhatsApp Business (WABA), necessario para os modelos.
// Usa WHATSAPP_WABA_ID se existir; senao descobre pelo proprio token (a conta que tem o numero).
let wabaCache: { phoneId: string; waba: string } | null = null
export async function wabaId(): Promise<string> {
  const env = (process.env.WHATSAPP_WABA_ID || '').trim()
  if (env) return env
  const cfg = waConfig()
  if (!cfg.token || !cfg.phoneId) return ''
  if (wabaCache && wabaCache.phoneId === cfg.phoneId) return wabaCache.waba
  const d = await graphFetch('debug_token?input_token=' + encodeURIComponent(cfg.token))
  const ids: string[] = []
  const gs: any[] = d.data?.data?.granular_scopes || []
  for (const g of gs) {
    if (g.scope !== 'whatsapp_business_management' && g.scope !== 'whatsapp_business_messaging') continue
    for (const t of (g.target_ids || [])) { if (ids.indexOf(String(t)) < 0) ids.push(String(t)) }
  }
  let found = ''
  for (const id of ids) {
    const p = await graphFetch(id + '/phone_numbers?fields=id&limit=50')
    const list: any[] = p.data?.data || []
    if (p.ok && list.some(function(x) { return String(x.id) === cfg.phoneId })) { found = id; break }
  }
  if (!found && ids.length === 1) found = ids[0]
  if (found) wabaCache = { phoneId: cfg.phoneId, waba: found }
  return found
}

// Envia uma mensagem. Numeros do Brasil: a Meta entrega o numero sem o 9 (55 + DDD + 8 digitos),
// mas a lista do modo de teste guarda com o 9. Se recusar por "numero nao liberado" (131030), tenta com o 9.
export async function postMessage(payload: any, phoneIdOverride?: string): Promise<{ ok: boolean; status: number; data: any }> {
  const cfg = waConfig()
  const phoneId = phoneIdOverride || cfg.phoneId
  let r = await graphFetch(phoneId + '/messages', { method: 'POST', json: payload })
  const to = String(payload?.to || '')
  if (!r.ok && Number(r.data?.error?.code) === 131030 && /^55\d{2}[6-9]\d{7}$/.test(to)) {
    const retry = await graphFetch(phoneId + '/messages', { method: 'POST', json: { ...payload, to: to.slice(0, 4) + '9' + to.slice(4) } })
    if (retry.ok) r = retry
  }
  return r
}

export function graphError(data: any): string {
  const e = data?.error
  if (!e) return 'Erro ao falar com o WhatsApp.'
  const code = Number(e.code)
  if (code === 190) return 'A chave de acesso (token) do WhatsApp venceu ou esta errada. Gere uma nova na Meta.'
  if (code === 131047 || code === 131051) return 'Passaram 24 horas desde a ultima mensagem do aluno. Envie um modelo aprovado.'
  if (code === 132001) return 'Esse modelo nao existe ou o idioma esta errado.'
  if (code === 131030) return 'Esse numero nao esta liberado para receber mensagens (modo de teste).'
  return (e.error_user_msg || e.message || 'Erro ao falar com o WhatsApp.') + (code ? ' (codigo ' + code + ')' : '')
}

// Qual numero (Phone Number ID) atende uma conversa: sem conexao = o numero de suporte (Vercel)
export async function phoneIdDaConversa(admin: any, connectionId: string | null): Promise<string> {
  if (!connectionId) return waConfig().phoneId
  const c = await admin.from('wa_connections').select('phone_number_id').eq('id', connectionId).maybeSingle()
  return String(c.data?.phone_number_id || '')
}

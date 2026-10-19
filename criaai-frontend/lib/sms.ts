// Disparo de SMS pela Zenvia. Tudo aqui roda so no servidor.
import { adminClient, requireAdmin } from '@/lib/whatsapp'
import { normalizarNumero, primeiroNome } from '@/lib/waBroadcast'

export { requireAdmin, adminClient }

export type SmsSegmento = 'todos' | 'sem_plano' | 'plano' | 'deixaram_de_pagar'
export const SMS_SEGMENTOS: { k: SmsSegmento; nome: string }[] = [
  { k: 'todos', nome: 'Todos os alunos' },
  { k: 'sem_plano', nome: 'Quem não tem plano' },
  { k: 'plano', nome: 'Quem tem plano ativo' },
  { k: 'deixaram_de_pagar', nome: 'Deixaram de pagar (cancelados ou em atraso)' },
]

export function zenviaConfig() {
  const token = (process.env.ZENVIA_API_TOKEN || '').trim()
  const from = (process.env.ZENVIA_SMS_FROM || '').trim()
  const missing: string[] = []
  if (!token) missing.push('ZENVIA_API_TOKEN')
  if (!from) missing.push('ZENVIA_SMS_FROM')
  return { token, from, missing }
}

// Tira acentos: com acento o SMS vira "unicode" e cabe so 70 letras por mensagem (em vez de 160)
export function semAcentos(t: string): string {
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\x20-\x7E\n]/g, '')
}

export function aplicaNomeSms(texto: string, nome: string): string {
  return String(texto || '').split('{{nome}}').join(nome || '').replace(/\s+([,.!?])/g, '$1').replace(/ {2,}/g, ' ').trim()
}

// Envia um SMS. Devolve { ok, id, erro }
export async function enviarSms(to: string, texto: string): Promise<{ ok: boolean; id: string | null; erro: string; grave: boolean }> {
  const cfg = zenviaConfig()
  if (cfg.missing.length) return { ok: false, id: null, erro: 'Zenvia não configurada (' + cfg.missing.join(', ') + ').', grave: true }
  try {
    const res = await fetch('https://api.zenvia.com/v2/channels/sms/messages', {
      method: 'POST',
      headers: { 'X-API-TOKEN': cfg.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: cfg.from, to, contents: [{ type: 'text', text: texto }] }),
      signal: AbortSignal.timeout(15000),
    })
    const j: any = await res.json().catch(function() { return null })
    if (res.ok) return { ok: true, id: String(j?.id || '') || null, erro: '', grave: false }
    const msg = String(j?.message || j?.error?.message || j?.code || ('Erro ' + res.status)).slice(0, 250)
    // 401/403 = chave errada ou sem permissao; 429 = limite: nao adianta continuar agora
    return { ok: false, id: null, erro: msg, grave: res.status === 401 || res.status === 403 || res.status === 429 }
  } catch (e: any) {
    return { ok: false, id: null, erro: 'Sem resposta da Zenvia (' + String(e?.message || e).slice(0, 80) + ')', grave: false }
  }
}

export type PessoaSms = { id: string; nome: string; phone: string }

// Quem recebe: alunos com celular valido, sem repetir numero, sem quem pediu para sair e sem reembolsados
export async function montarPublicoSms(seg: SmsSegmento): Promise<{ lista: PessoaSms[]; porSegmento: Record<string, number>; semNumero: number; optout: number }> {
  const admin = adminClient()
  const rows: any[] = []
  for (let from = 0; from < 50000; from += 1000) {
    const r = await admin.from('profiles').select('id, full_name, whatsapp, subscription_status, refunded_at, is_admin').order('created_at', { ascending: true }).range(from, from + 999)
    if (r.error) throw new Error('Não consegui ler os alunos.')
    rows.push(...(r.data || []))
    if (!r.data || r.data.length < 1000) break
  }
  const out = new Set<string>()
  for (let from = 0; from < 50000; from += 1000) {
    const r = await admin.from('sms_optout').select('phone').order('phone', { ascending: true }).range(from, from + 999)
    if (r.error) break
    for (const x of (r.data || [])) out.add(String((x as any).phone))
    if (!r.data || r.data.length < 1000) break
  }
  const vistos = new Set<string>()
  const todos: { p: PessoaSms; status: string }[] = []
  let semNumero = 0
  for (const x of rows) {
    if (x.is_admin) continue
    const tel = normalizarNumero(x.whatsapp)
    if (!tel) { semNumero++; continue }
    const ativo = x.subscription_status === 'active' || x.subscription_status === 'trialing'
    if (x.refunded_at && !ativo) { vistos.add(tel); continue }
    if (vistos.has(tel)) continue
    vistos.add(tel)
    if (out.has(tel)) continue
    todos.push({ p: { id: x.id, nome: primeiroNome(x.full_name), phone: tel }, status: String(x.subscription_status || '') })
  }
  const ativo = function(s: string) { return s === 'active' || s === 'trialing' }
  const pick = function(k: SmsSegmento) {
    return todos.filter(function(t) {
      if (k === 'plano') return ativo(t.status)
      if (k === 'sem_plano') return !ativo(t.status)
      if (k === 'deixaram_de_pagar') return t.status === 'canceled' || t.status === 'past_due'
      return true
    }).map(function(t) { return t.p })
  }
  const porSegmento: Record<string, number> = {}
  for (const s of SMS_SEGMENTOS) porSegmento[s.k] = pick(s.k).length
  return { lista: pick(seg), porSegmento, semNumero, optout: out.size }
}

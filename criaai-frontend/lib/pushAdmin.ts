// Aviso de venda no celular do admin (so contas is_admin). Usado pelos avisos da Hubla e da Cakto.
// Nunca derruba o aviso principal: qualquer erro e so logado, e cada venda avisa no maximo uma vez.
import webpush from 'web-push'
import { VAPID_PUBLIC_KEY } from '@/lib/push-config'

export type AvisoVenda = {
  chave: string            // identifica a venda (evita aviso repetido quando a plataforma reenvia o evento)
  renovacao: boolean
  produto: string          // "Plano Pro", "Estrutura Express", "Pacote de 30 criativos"...
  valor?: number | null
  email?: string | null
  nome?: string | null
  origem: 'Hubla' | 'Cakto'
}

function brl(v: number) { return 'R$ ' + v.toFixed(2).replace('.', ',') }

export function montarAviso(a: Pick<AvisoVenda, 'renovacao' | 'produto' | 'valor' | 'email' | 'nome' | 'origem'>) {
  const quem = (a.nome || '').trim() || (a.email || '').trim()
  const partes = [a.produto, a.valor && a.valor > 0 ? brl(a.valor) : '', quem].filter(Boolean)
  return {
    title: a.renovacao ? '🔄 Renovação aprovada!' : '💰 Venda aprovada!',
    body: partes.join(' · ') + ' (' + a.origem + ')',
    url: '/dashboard/admin',
  }
}

async function enviarParaAdmins(admin: any, payload: { title: string; body: string; url: string }): Promise<number> {
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!privateKey) return 0
  webpush.setVapidDetails('https://mcpia.site', VAPID_PUBLIC_KEY, privateKey)
  const admins = await admin.from('profiles').select('id').eq('is_admin', true)
  const ids = ((admins.data || []) as any[]).map(function(x) { return x.id })
  if (!ids.length) return 0
  const subs = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', ids)
  const lista = (subs.data || []) as any[]
  const mortos: string[] = []
  let ok = 0
  await Promise.allSettled(lista.map(function(s) {
    return webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 6, timeout: 8000 })
      .then(function() { ok++ })
      .catch(function(e: any) { const c = e && e.statusCode; if (c === 404 || c === 410) mortos.push(s.id) })
  }))
  if (mortos.length) await admin.from('push_subscriptions').delete().in('id', mortos)
  return ok
}

export async function avisarVendaAdmin(admin: any, a: AvisoVenda): Promise<void> {
  try {
    const cfg = await admin.from('push_auto_config').select('ativo').eq('tipo', 'venda_admin').maybeSingle()
    if (cfg.data && cfg.data.ativo === false) return
    // So avisa se esta venda ainda nao foi avisada (chave unica)
    const ins = await admin.from('push_vendas_avisadas').insert({ chave: a.chave.slice(0, 200) })
    if (ins.error) return
    await enviarParaAdmins(admin, montarAviso(a))
  } catch (e) { console.error('[push-venda] erro:', e) }
}

// Teste do card: manda um exemplo para o admin
export async function testeVendaAdmin(admin: any): Promise<number> {
  return enviarParaAdmins(admin, montarAviso({ renovacao: false, produto: 'Plano Pro', valor: 39.9, nome: 'Exemplo de aluno', email: null, origem: 'Hubla' }))
}

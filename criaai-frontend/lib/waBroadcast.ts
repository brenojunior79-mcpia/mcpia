// Disparo em massa: quem recebe, e como o numero e' ajustado para o WhatsApp
import { adminClient } from '@/lib/whatsapp'

export type Segmento = 'todos' | 'plano' | 'sem_plano' | 'sem_plano_250' | 'contatos'
export const TAMANHO_LOTE = 250
export const SEGMENTOS: { k: Segmento; nome: string }[] = [
  { k: 'todos', nome: 'Todos os alunos' },
  { k: 'plano', nome: 'Só quem tem plano ativo' },
  { k: 'sem_plano', nome: 'Só quem não tem plano' },
  { k: 'sem_plano_250', nome: 'Sem plano: próximos 250 que ainda não receberam este modelo' },
  { k: 'contatos', nome: 'Contatos importados (que não são alunos)' },
]

// Devolve o numero no formato do WhatsApp (55 + DDD + numero) ou null se nao der para usar
export function normalizarNumero(raw: any): string | null {
  let d = String(raw || '').replace(/\D/g, '')
  if (!d) return null
  d = d.replace(/^0+/, '')
  if (d.length === 10 || d.length === 11) d = '55' + d
  if (d.length !== 12 && d.length !== 13) return null
  if (d.slice(0, 2) !== '55') return null
  const ddd = parseInt(d.slice(2, 4), 10)
  if (ddd < 11 || ddd > 99) return null
  const resto = d.slice(4)
  if (resto.length === 9 && resto[0] !== '9') return null
  if (resto.length === 8 && resto[0] === '0') return null
  return d
}

export function primeiroNome(nome: any): string {
  const n = String(nome || '').trim().split(/\s+/)[0] || ''
  if (!n || n.indexOf('@') >= 0) return ''
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
}

export type Aluno = { id: string | null; nome: string; wa: string; plano: boolean }
export type Publico = {
  total: number          // alunos cadastrados (sem administradores)
  semNumero: number      // sem WhatsApp salvo ou numero invalido
  reembolsados: number   // ficam de fora do disparo
  repetidos: number      // mesmo numero em mais de uma conta
  comPlano: number       // dentro dos que podem receber
  semPlano: number
  podem: number          // numeros unicos que recebem em "Todos"
  contatos: number       // contatos importados que nao sao alunos
  restantes: number      // sem plano que ainda NAO receberam o modelo escolhido (so quando o modelo e informado)
  lote: number           // quantos entram no proximo lote de 250
  lista: Aluno[]         // quem recebe, ja filtrado pelo segmento
}

// Le todos os alunos (a leitura vem em paginas de 1000) e monta o publico
export async function montarPublico(seg: Segmento, template?: string): Promise<Publico> {
  const admin = adminClient()
  const rows: any[] = []
  for (let from = 0; from < 50000; from += 1000) {
    const r = await admin.from('profiles').select('id, full_name, whatsapp, subscription_status, refunded_at, is_admin').order('created_at', { ascending: true }).range(from, from + 999)
    if (r.error) throw new Error('Nao consegui ler os alunos.')
    rows.push(...(r.data || []))
    if (!r.data || r.data.length < 1000) break
  }
  const alunos = rows.filter(function(x) { return !x.is_admin })
  let semNumero = 0, reembolsados = 0, repetidos = 0
  const vistos = new Set<string>()
  const todos: Aluno[] = []
  for (const x of alunos) {
    const wa = normalizarNumero(x.whatsapp)
    if (!wa) { semNumero++; continue }
    if (x.refunded_at && !(x.subscription_status === 'active' || x.subscription_status === 'trialing')) { reembolsados++; vistos.add(wa); continue }
    if (vistos.has(wa)) { repetidos++; continue }
    vistos.add(wa)
    todos.push({ id: x.id, nome: primeiroNome(x.full_name), wa, plano: x.subscription_status === 'active' || x.subscription_status === 'trialing' })
  }
  // Contatos importados (ex: lista da Unnichat) que ainda nao sao alunos
  const contatos: Aluno[] = []
  for (let from = 0; from < 50000; from += 1000) {
    const r = await admin.from('wa_contatos').select('wa_id, name').order('wa_id', { ascending: true }).range(from, from + 999)
    if (r.error) break
    for (const c of (r.data || [])) {
      const wa = normalizarNumero(c.wa_id)
      if (!wa || vistos.has(wa)) continue
      vistos.add(wa)
      contatos.push({ id: null, nome: primeiroNome(c.name), wa, plano: false })
    }
    if (!r.data || r.data.length < 1000) break
  }
  const comPlano = todos.filter(function(a) { return a.plano }).length
  const semPlanoLista = todos.filter(function(a) { return !a.plano })
  // Quem ja recebeu (ou esta na fila de) este mesmo modelo em disparos anteriores nao entra no proximo lote
  let jaRecebeu = new Set<string>()
  if (template) {
    const bs = await admin.from('wa_broadcasts').select('id').eq('template_name', template).neq('segment', 'teste')
    const ids = (bs.data || []).map(function(b: any) { return b.id })
    for (let i = 0; i < ids.length; i += 20) {
      for (let from = 0; from < 50000; from += 1000) {
        const r = await admin.from('wa_broadcast_recipients').select('wa_id').in('broadcast_id', ids.slice(i, i + 20)).in('status', ['sent', 'delivered', 'read', 'pending', 'sending']).range(from, from + 999)
        if (r.error) break
        for (const x of (r.data || [])) jaRecebeu.add(String((x as any).wa_id).replace(/\D/g, '').slice(-8))
        if (!r.data || r.data.length < 1000) break
      }
    }
  }
  const restantesLista = semPlanoLista.filter(function(a) { return !jaRecebeu.has(a.wa.slice(-8)) })
  const lote = restantesLista.slice(0, TAMANHO_LOTE)
  const lista = seg === 'contatos' ? contatos : seg === 'plano' ? todos.filter(function(a) { return a.plano }) : seg === 'sem_plano' ? semPlanoLista : seg === 'sem_plano_250' ? lote : todos
  return { total: alunos.length, semNumero, reembolsados, repetidos, comPlano, semPlano: todos.length - comPlano, podem: todos.length, contatos: contatos.length, restantes: restantesLista.length, lote: lote.length, lista }
}

// Monta o corpo do modelo: cada variavel pode ser o primeiro nome do aluno ou um texto fixo
export type ParamCfg = { mode: 'nome' | 'texto'; value: string }
export function montarParams(cfg: ParamCfg[], nome: string): string[] {
  return cfg.map(function(p) {
    if (p.mode === 'nome') return nome || (p.value || '').trim() || 'amigo(a)'
    return (p.value || '').trim()
  })
}

export function payloadModelo(to: string, name: string, language: string, params: string[]) {
  return {
    messaging_product: 'whatsapp', to, type: 'template',
    template: { name, language: { code: language }, ...(params.length ? { components: [{ type: 'body', parameters: params.map(function(t) { return { type: 'text', text: t } }) }] } : {}) },
  }
}

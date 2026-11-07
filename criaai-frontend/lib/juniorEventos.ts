// Eventos que a plataforma recebe da Hubla (Pix gerado, compra aprovada, carrinho abandonado, reembolso...) e da propria plataforma (conta criada),
// transformados em uma "linha do tempo" curta da pessoa para o Junior entender o momento dela ANTES de responder.
// Fontes: wa_auto_runs (eventos com telefone), hubla_events (todos os eventos da Hubla, por e-mail), hubla_compras (compras) e profiles (conta).

export const REGRA_EVENTOS = `# O QUE A PLATAFORMA JA SABE DESTA PESSOA (EVENTOS REAIS DA HUBLA E DA PLATAFORMA - USE EM SILENCIO)
Abaixo estao os eventos reais registrados sobre esta pessoa. Use para entender o momento dela e conduzir melhor a conversa. Exemplos:
- comprou e ainda NAO tem conta criada: ela so precisa criar a conta (mensagem padrao do primeiro acesso), nao e problema de pagamento;
- gerou Pix/boleto e nao pagou, ou entrou no checkout e nao finalizou: ajude a concluir a compra com carinho (link de pagamento so se ela pedir ou aceitar);
- pagamento recusado ou Pix vencido: ofereca o link de novo para tentar outro cartao ou gerar outro Pix;
- compra reembolsada: o acesso nao fica liberado; nao ofereca liberar;
- compra aprovada ha pouco tempo: e normal ela ainda estar no comeco; conduza o primeiro acesso.
REGRAS: (1) so afirme o que esta na lista; se algo nao aparece, voce NAO sabe (ela pode ter comprado com outro e-mail ou telefone: nesse caso siga a regra de consulta de compra). (2) Nao recite a lista, nao diga "vi nos eventos", "o sistema registrou" nem cite datas e horarios sem a pessoa pedir; so use para agir certo. (3) "Acesso liberado na Hubla" NAO e acesso a plataforma: a conta na plataforma so existe quando a pessoa cria. (4) Nunca revele e-mail completo, valores ou dados de outra pessoa. (5) Horarios sao de Brasilia.`

const NOME_EVENTO: Record<string, string> = {
  'lead.abandoned_checkout': 'entrou no checkout e não finalizou a compra',
  'invoice.created': 'gerou a cobrança (Pix, boleto ou cartão)',
  'invoice.payment_failed': 'pagamento recusado ou falhou',
  'invoice.expired': 'Pix ou boleto venceu sem pagamento',
  'invoice.payment_succeeded': 'pagamento aprovado',
  'customer.member_added': 'a Hubla registrou o aluno (isso não cria a conta na plataforma)',
  'subscription.activated': 'assinatura ativada',
  'subscription.expiring': 'assinatura perto de vencer',
  'subscription.deactivated': 'assinatura cancelada ou encerrada',
  'customer.member_removed': 'acesso removido na Hubla',
  'invoice.refunded': 'compra reembolsada',
  'refund_request.created': 'pediu reembolso',
  'refund_request.accepted': 'reembolso aceito',
  'member.module_completed': 'concluiu um módulo na área de membros antiga',
  'member.course_completed': 'concluiu o curso na área de membros antiga',
}

const NOME_PROD: Record<string, string> = { m: 'Mentoria', e: 'Estrutura Express', c: 'Créditos da plataforma', p: 'Plano da plataforma', o: 'outro produto' }

function quando(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function variantes(wa: string): string[] {
  const d = String(wa || '').replace(/\D/g, '')
  const m = d.match(/^55(\d{2})(9?)(\d{8})$/)
  if (!m) return d ? [d] : []
  return ['55' + m[1] + '9' + m[3], '55' + m[1] + m[3]]
}

type Linha = { t: number; txt: string }

// Devolve o bloco de texto para o prompt (ou '' se nao houver nada / der erro: o Junior segue normal)
export async function eventosDaPessoa(db: any, p: { waId?: string; emails?: string[]; profileId?: string | null }): Promise<string> {
  try {
    const emails: string[] = []
    const addEmail = function(e: any) { const x = String(e || '').trim().toLowerCase(); if (x && x.indexOf('@') > 0 && emails.indexOf(x) < 0) emails.push(x) }
    for (const e of p.emails || []) addEmail(e)

    let perfil: any = null
    if (p.profileId) {
      const r = await db.from('profiles').select('email, created_at, subscription_status').eq('id', p.profileId).maybeSingle()
      perfil = r.data || null
      if (perfil) addEmail(perfil.email)
    }

    const linhas: Linha[] = []
    const tail = String(p.waId || '').replace(/\D/g, '').slice(-8)
    const vars = variantes(p.waId || '')

    // 1) Eventos com telefone (cobranca gerada com o metodo, compra aprovada...)
    if (vars.length) {
      const r = await db.from('wa_auto_runs').select('email, event_type, data, created_at').in('wa_id', vars).eq('is_test', false).order('created_at', { ascending: false }).limit(20)
      for (const x of r.data || []) {
        addEmail(x.email)
        const nome = NOME_EVENTO[x.event_type]
        if (!nome) continue
        const met = x.data && x.data.metodo ? ' (' + x.data.metodo + ')' : ''
        const prod = x.data && x.data.produto ? ' - ' + x.data.produto : ''
        linhas.push({ t: new Date(x.created_at).getTime(), txt: nome + met + prod })
      }
    }

    // 2) Compras (por e-mail e pelo telefone)
    const compras: any[] = []
    if (emails.length) { const r = await db.from('hubla_compras').select('email, cat, produto, paid_at, reembolsado').in('email', emails).limit(20); for (const x of r.data || []) compras.push(x) }
    if (tail.length === 8) { const r = await db.from('hubla_compras').select('email, cat, produto, paid_at, reembolsado, wa').like('wa', '%' + tail).limit(20); for (const x of r.data || []) { addEmail(x.email); compras.push(x) } }
    const vistas: Record<string, boolean> = {}
    for (const c of compras) {
      const chave = String(c.email) + '|' + String(c.cat) + '|' + String(c.paid_at)
      if (vistas[chave]) continue
      vistas[chave] = true
      const prod = NOME_PROD[String(c.cat)] || c.produto || 'produto'
      linhas.push({ t: c.paid_at ? new Date(c.paid_at).getTime() : 0, txt: 'compra registrada: ' + prod + (c.reembolsado === true ? ' (REEMBOLSADA)' : '') })
    }

    // 3) Eventos da Hubla por e-mail (carrinho abandonado, Pix vencido, recusa, reembolso...)
    if (emails.length) {
      const r = await db.from('hubla_events').select('event_type, created_at').eq('provider', 'hubla').in('email', emails).order('created_at', { ascending: false }).limit(60)
      for (const x of r.data || []) {
        const nome = NOME_EVENTO[x.event_type]
        if (!nome) continue
        if (x.event_type === 'invoice.created' || x.event_type === 'invoice.payment_succeeded') continue // ja vem do item 1 (com o metodo) e das compras
        linhas.push({ t: new Date(x.created_at).getTime(), txt: nome })
      }
    }

    // 4) Conta na plataforma
    if (!perfil && emails.length) {
      const r = await db.from('profiles').select('email, created_at, subscription_status').in('email', emails).limit(1)
      perfil = (r.data || [])[0] || null
    }
    const contaTxt = perfil
      ? 'JA TEM conta na plataforma (criada em ' + quando(perfil.created_at) + (perfil.subscription_status === 'active' ? ', plano ativo' : '') + ').'
      : 'AINDA NAO TEM conta criada na plataforma (nenhum cadastro encontrado com os e-mails e telefone conhecidos).'

    if (linhas.length === 0 && !perfil) return ''

    // Ordena, tira repeticoes proximas e fica com os mais recentes
    linhas.sort(function(a, b) { return a.t - b.t })
    const out: string[] = []
    let ultTxt = ''
    let ultT = 0
    for (const l of linhas) {
      if (l.txt === ultTxt && Math.abs(l.t - ultT) < 10 * 60 * 1000) continue
      ultTxt = l.txt; ultT = l.t
      out.push('- ' + (l.t ? quando(new Date(l.t).toISOString()) : 'data desconhecida') + ': ' + l.txt)
    }
    const recentes = out.slice(-14)
    return REGRA_EVENTOS + '\nConta da pessoa: ' + contaTxt + '\nEventos (do mais antigo para o mais recente):\n' + (recentes.length ? recentes.join('\n') : '- nenhum evento de compra encontrado.')
  } catch (e) {
    console.error('[junior-eventos] erro:', e)
    return ''
  }
}

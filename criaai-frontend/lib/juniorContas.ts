// Contas da plataforma ligadas ao numero de WhatsApp da pessoa (uma pessoa pode ter varios cadastros com e-mails diferentes).
// O Junior usa isso para saber quem tem assinatura, mesmo quando a conversa nao esta ligada a um cadastro.

export type ContaDoNumero = { id: string; email: string; ativa: boolean; status: string; plano: string; criada: string }

const so = function(v: any): string { return String(v || '').replace(/\D/g, '') }

export async function contasDoTelefone(admin: any, waId: string): Promise<ContaDoNumero[]> {
  try {
    const tail = so(waId).slice(-8)
    if (tail.length < 8) return []
    const r = await admin.from('profiles').select('id, email, whatsapp, subscription_status, created_at, plans(name)').like('whatsapp', '%' + tail.slice(-4) + '%').limit(300)
    if (r.error) return []
    const out: ContaDoNumero[] = []
    for (const p of (r.data || []) as any[]) {
      if (so(p.whatsapp).slice(-8) !== tail) continue
      const plano = Array.isArray(p.plans) ? (p.plans[0] && p.plans[0].name) : (p.plans && p.plans.name)
      const st = String(p.subscription_status || 'inactive')
      out.push({ id: p.id, email: String(p.email || ''), ativa: st === 'active' || st === 'trialing', status: st, plano: String(plano || ''), criada: String(p.created_at || '') })
    }
    // Plano ativo primeiro, depois a mais recente
    out.sort(function(a, b) { return (a.ativa === b.ativa ? 0 : a.ativa ? -1 : 1) || new Date(b.criada).getTime() - new Date(a.criada).getTime() })
    return out
  } catch (e) { return [] }
}

function rotuloStatus(c: ContaDoNumero): string {
  if (c.ativa) return 'PLANO ATIVO' + (c.plano ? ' (' + c.plano + ')' : '')
  if (c.status === 'past_due') return 'assinatura em atraso'
  if (c.status === 'canceled') return 'assinatura cancelada'
  return 'sem plano ativo'
}

// Bloco para o prompt do Junior
export function blocoContasDoNumero(contas: ContaDoNumero[]): string {
  if (!contas.length) return ''
  const linhas = contas.map(function(c) { return '- ' + c.email + ': ' + rotuloStatus(c) })
  return 'CONTAS DESTE NUMERO (conferido agora no sistema, por telefone; o sistema TEM acesso a isso):\n' + linhas.join('\n') + '\n'
    + 'REGRA DO BRENO: quando a pessoa perguntar qual plano ela tem, qual ela fez/assinou, pedir para voce olhar no sistema, ou mandar print da tela de planos/assinatura, responda com ESTES dados (qual e-mail esta com plano ativo e qual plano). Se houver mais de uma conta, diga com carinho qual e-mail esta ativo e que ela deve entrar na plataforma com ele (https://www.mcpia.site/login). Nunca diga "nao consigo acessar informacoes do sistema" nem "nao e necessario se preocupar com plano". Se nenhuma conta tiver plano ativo, diga isso e pergunte se ela pagou com outro e-mail (se disser o e-mail, use a marca de verificacao da assinatura). Ela ja e aluna: nao trate como aluna nova.'
}

// Resposta pronta (usada se o modelo disser que nao consegue ver o sistema)
export function resumoContasDoNumero(contas: ContaDoNumero[]): string {
  if (!contas.length) return ''
  const ativas = contas.filter(function(c) { return c.ativa })
  if (ativas.length === 1 && contas.length === 1) return 'Conferi aqui no sistema: o seu plano' + (ativas[0].plano ? ' ' + ativas[0].plano : '') + ' está ativo no e-mail ' + ativas[0].email + ' ✅\n\nEntre na plataforma com esse e-mail: https://www.mcpia.site/login'
  if (ativas.length >= 1) return 'Conferi aqui no sistema. O seu plano' + (ativas[0].plano ? ' ' + ativas[0].plano : '') + ' está ativo no e-mail ' + ativas[0].email + ' ✅\n\nVocê tem mais de um cadastro com esse número, então entre sempre com esse e-mail: https://www.mcpia.site/login'
  return 'Conferi aqui no sistema, com o seu número, e nenhum cadastro seu está com plano ativo agora. Você pagou com outro e-mail? Se sim, me diga qual foi 🙏'
}

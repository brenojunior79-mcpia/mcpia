// Consulta de compra nos RELATORIOS DE VENDAS (Hubla e Cakto) pelo Junior.
// Quando a pessoa diz que comprou (Mentoria, Estrutura Express, plano...) por outra plataforma, ou nao consegue se cadastrar,
// o Junior emite a marca [[CONSULTAR_COMPRA: e-mail ou telefone]]. Quem consulta e escreve a resposta e este arquivo (o sistema).
// Fontes: hubla_compras (webhook + relatorios importados, por e-mail ou WhatsApp) e compras_externas (relatorios Hubla/Cakto, por e-mail ou telefone).

const MARCA_RE = /\[\[\s*CONSULTAR_COMPRA[^\]]*\]\]/i
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

export function pediuConsultarCompra(texto: string): boolean {
  return MARCA_RE.test(String(texto || ''))
}

export function removerMarcaCompra(texto: string): string {
  return String(texto || '').replace(new RegExp(MARCA_RE.source, 'gi'), '').trim()
}

// O que a pessoa informou na marca: e-mails e telefones
export function dadosDaMarcaCompra(texto: string): { emails: string[]; telefones: string[] } {
  const m = String(texto || '').match(MARCA_RE)
  if (!m) return { emails: [], telefones: [] }
  const corpo = m[0]
  const emails: string[] = []
  for (const e of corpo.match(EMAIL_RE) || []) { const x = e.trim().toLowerCase(); if (emails.indexOf(x) < 0) emails.push(x) }
  const semEmail = corpo.replace(EMAIL_RE, ' ')
  const telefones: string[] = []
  for (const t of semEmail.match(/\+?\d[\d\s().-]{8,16}\d/g) || []) {
    const d = t.replace(/\D/g, '')
    const cauda = d.length >= 10 ? d.slice(-11) : ''
    if (cauda && telefones.indexOf(cauda) < 0) telefones.push(cauda)
  }
  return { emails: emails.slice(0, 3), telefones: telefones.slice(0, 3) }
}

const COMUM = `Voce consegue consultar os RELATORIOS DE VENDAS do Breno (todas as vendas do ano na Hubla e na Cakto), mas quem consulta e escreve o resultado e o SISTEMA, nao voce.
- QUANDO EMITIR: a pessoa diz que ja COMPROU (Mentoria, Estrutura Express, creditos, plano...) por outra plataforma ou com outro e-mail, ou diz que nao consegue criar a conta/fazer o cadastro porque "o e-mail nao e aceito", ou pergunta se a compra dela aparece. Nao peca comprovante antes: consulte primeiro.
- COMO: responda APENAS com a marca [[CONSULTAR_COMPRA: e-mail ou telefone]] usando o que ela informou (pode colocar ate 2 e-mails e 1 telefone). Se ela ainda nao informou nenhum e-mail nem telefone, pergunte so isto: "Qual e-mail você usou na hora da compra?" (no WhatsApp, o numero desta conversa tambem e consultado automaticamente: pode emitir a marca sem pedir nada).
- NUNCA diga que a compra existe ou nao existe, nem o e-mail da compra, antes de o sistema responder. Depois que o sistema responder, siga a conversa a partir do resultado.
- Se o sistema nao achou a compra: peca o comprovante (print ou PDF) para voce conferir. Se for um comprovante de pagamento, o sistema nao confirma sozinho: diga que anotou e vai conferir. Nao mande a pessoa para outra plataforma nem para atendente.`

export const REGRA_COMPRA_WHATSAPP = `# CONSULTA DE COMPRA NOS RELATORIOS DE VENDAS (PRIORIDADE MAXIMA)\n${COMUM}`
export const REGRA_COMPRA_CHAT = `# CONSULTA DE COMPRA NOS RELATORIOS DE VENDAS (PRIORIDADE MAXIMA)\n${COMUM}`

function mascarar(email: string): string {
  const [u, d] = String(email || '').split('@')
  if (!u || !d) return ''
  return u.slice(0, Math.min(2, u.length)) + '***@' + d
}

const NOME_PROD: Record<string, string> = { m: 'Mentoria', e: 'Estrutura Express', c: 'Créditos da plataforma', p: 'Plano da plataforma', o: 'outro produto' }
const NOME_PLAT: Record<string, string> = { h: 'Hubla', k: 'Cakto' }

function mesBR(aamm: string | null | undefined): string {
  const s = String(aamm || '')
  if (!/^\d{4}$/.test(s)) return ''
  return s.slice(2) + '/20' + s.slice(0, 2)
}

type Achado = { email: string | null; plat: string; produtos: string; mes: string; reembolsada: boolean }

// Procura nas duas bases por e-mail e por telefone (ultimos 8 digitos). Devolve a resposta pronta para a pessoa.
export async function consultarCompraPeloJunior(db: any, p: { emails: string[]; telefones: string[]; waId?: string; contaEmail?: string }): Promise<{ texto: string; achou: boolean }> {
  try {
    const emails = p.emails.map(function(e) { return String(e).trim().toLowerCase() }).filter(Boolean)
    const tels: string[] = []
    for (const t of p.telefones.concat(p.waId ? [p.waId] : [])) {
      const d = String(t || '').replace(/\D/g, '')
      if (d.length >= 10) { const c = d.slice(-11); if (tels.indexOf(c) < 0) tels.push(c) }
    }
    if (emails.length === 0 && tels.length === 0) {
      return { achou: false, texto: 'Qual e-mail você usou na hora da compra? Com ele eu consulto aqui.' }
    }

    const achados: Achado[] = []
    const exCols = 'email, tel, plataformas, produtos, pago_mes, reembolsada'
    if (emails.length) {
      const r = await db.from('compras_externas').select(exCols).in('email', emails).limit(20)
      for (const x of r.data || []) achados.push({ email: x.email, plat: x.plataformas, produtos: x.produtos, mes: mesBR(x.pago_mes), reembolsada: x.reembolsada === true })
      const h = await db.from('hubla_compras').select('email, cat, paid_at, reembolsado').in('email', emails).limit(20)
      for (const x of h.data || []) achados.push({ email: x.email, plat: 'h', produtos: String(x.cat || 'o'), mes: x.paid_at ? new Date(x.paid_at).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }) : '', reembolsada: x.reembolsado === true })
    }
    for (const t of tels) {
      const cauda = t.slice(-8)
      const r = await db.from('compras_externas').select(exCols).like('tel', '%' + cauda).limit(10)
      for (const x of r.data || []) achados.push({ email: x.email, plat: x.plataformas, produtos: x.produtos, mes: mesBR(x.pago_mes), reembolsada: x.reembolsada === true })
      const h = await db.from('hubla_compras').select('email, cat, paid_at, reembolsado').like('wa', '%' + cauda).limit(10)
      for (const x of h.data || []) achados.push({ email: x.email, plat: 'h', produtos: String(x.cat || 'o'), mes: x.paid_at ? new Date(x.paid_at).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }) : '', reembolsada: x.reembolsado === true })
    }

    const validos = achados.filter(function(a) { return !a.reembolsada })
    if (achados.length === 0) {
      try { await db.from('hubla_events').insert({ provider: 'junior', event_type: 'junior.consulta_compra', email: emails[0] || null, action: 'nao_achou', note: ('Sem compra nos relatorios. tels: ' + tels.join(',')).slice(0, 300) }) } catch (e) { /* historico e so conforto */ }
      return { achou: false, texto: 'Procurei aqui nos relatórios de vendas' + (emails.length ? ' com ' + (emails.length > 1 ? 'esses e-mails' : 'esse e-mail') : '') + (tels.length ? (emails.length ? ' e com o seu número' : ' com o seu número') : '') + ' e não encontrei nenhuma compra. Me manda o comprovante (um print ou o PDF) e o nome que aparece nele, que eu confiro.' }
    }
    if (validos.length === 0) {
      return { achou: true, texto: 'Encontrei a compra nos relatórios, mas ela consta como reembolsada, por isso o acesso não fica liberado.' }
    }

    // Monta a lista curta do que foi encontrado (sem repetir)
    const linhas: string[] = []
    const emailsCompra: string[] = []
    for (const a of validos) {
      const prods = Array.from(new Set(String(a.produtos).split(''))).map(function(c) { return NOME_PROD[c] || 'outro produto' })
      const plats = Array.from(new Set(String(a.plat).split(''))).map(function(c) { return NOME_PLAT[c] || c })
      const linha = prods.join(' e ') + (plats.length ? ' pela ' + plats.join(' e pela ') : '') + (a.mes ? ' (' + a.mes + ')' : '')
      if (linhas.indexOf(linha) < 0) linhas.push(linha)
      if (a.email && emailsCompra.indexOf(a.email) < 0) emailsCompra.push(a.email)
    }
    const digitados = emails
    const bateu = emailsCompra.filter(function(e) { return digitados.indexOf(e) >= 0 })
    let texto = 'Achei sim! Consta nos relatórios de vendas: ' + linhas.slice(0, 3).join('; ') + '.'
    if (bateu.length === 0 && emailsCompra.length) {
      // Achou pelo telefone: o cadastro precisa ser com o e-mail da compra (mostramos so uma parte dele)
      texto += ' O e-mail dessa compra é ' + mascarar(emailsCompra[0]) + '. Para criar a conta na plataforma, use exatamente esse e-mail.'
    } else if (bateu.length) {
      texto += ' O e-mail ' + bateu[0] + ' é o da compra, então é com ele que você cria a conta na plataforma.'
    }
    try { await db.from('hubla_events').insert({ provider: 'junior', event_type: 'junior.consulta_compra', email: emails[0] || emailsCompra[0] || null, action: 'achou', note: ('Compra achada: ' + linhas.join('; ')).slice(0, 300) }) } catch (e) { /* historico e so conforto */ }
    return { achou: true, texto }
  } catch (e) {
    console.error('[junior-compra] erro:', e)
    return { achou: false, texto: 'Não consegui consultar agora. Me manda o comprovante da compra (um print ou o PDF) que eu confiro por ele.' }
  }
}

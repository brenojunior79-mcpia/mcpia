// Verificacao da assinatura (plano da plataforma: Starter, Pro, Premium) pelo Junior.
// Quando o aluno diz que pagou/assinou e as ferramentas continuam bloqueadas, o Junior emite a marca [[VERIFICAR_ASSINATURA: email]].
// Quem confere e libera de verdade e este arquivo (o sistema), nunca a IA: o texto que o aluno le vem daqui.
// Fonte do pagamento: hubla_compras (compras de plano, categoria 'p'), por e-mail ou pelo numero do WhatsApp da conversa.
// Toda liberacao fica registrada em hubla_events (provider 'junior') para o admin conferir.

import { LINKS_PLANOS } from '@/lib/junior'

export const LINK_PLATAFORMA = 'https://www.mcpia.site/'
const LINK_STARTER = LINKS_PLANOS.Starter

// Link de checkout do plano que a pessoa tinha (Pro -> link do Pro). Sem plano conhecido: Starter.
async function linkDoPlanoDela(db: any, perfil: any): Promise<{ nome: string; link: string }> {
  try {
    if (perfil && perfil.plan_id) {
      const pl = await db.from('plans').select('name').eq('id', perfil.plan_id).maybeSingle()
      const nome = String((pl.data as any)?.name || '')
      if (nome && LINKS_PLANOS[nome]) return { nome, link: LINKS_PLANOS[nome] }
    }
  } catch (e) { /* cai no Starter */ }
  return { nome: '', link: LINK_STARTER }
}
const DIAS_VALIDADE = 35 // assinatura mensal: pagamento de ate 35 dias vale

const MARCA_RE = /\[\[\s*VERIFICAR_ASSINATURA[^\]]*\]\]/i
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

export function pediuVerificarAssinatura(texto: string): boolean {
  return MARCA_RE.test(String(texto || ''))
}

// E-mails que a pessoa informou, vindos na marca: [[VERIFICAR_ASSINATURA: a@x.com b@y.com]]
export function emailsDaMarcaAssinatura(texto: string): string[] {
  const m = String(texto || '').match(MARCA_RE)
  if (!m) return []
  const achados = m[0].match(EMAIL_RE) || []
  const unicos: string[] = []
  for (const e of achados) {
    const x = e.trim().toLowerCase()
    if (unicos.indexOf(x) < 0) unicos.push(x)
  }
  return unicos.slice(0, 3)
}

export function removerMarcaAssinatura(texto: string): string {
  return String(texto || '').replace(new RegExp(MARCA_RE.source, 'gi'), '').trim()
}

const COMUM = `Voce consegue conferir a assinatura do plano da plataforma (Starter, Pro, Premium: Gerador de Criativos, Gerador de Ebook, Gerador de Site) e liberar o acesso, mas quem confere e libera e o SISTEMA, nao voce.
- QUANDO EMITIR: a pessoa diz que ASSINOU ou PAGOU o plano da plataforma e as ferramentas continuam bloqueadas, aparece "sem plano" ou "assinatura em atraso", ela nao consegue gerar criativo, ebook ou site, ou pede para verificar ou liberar a assinatura. Vale tambem para aluno novo.
- NAO EMITA para a Estrutura Express (siga a regra da Estrutura Express), nem para Mentoria, nem para quem so quer saber o preco ou quer assinar agora (nesse caso mande o link do plano que esta na base).
- NUNCA diga que liberou, que o pagamento foi ou nao confirmado, nem que a equipe vai liberar: quem decide e o sistema. Nao peca print nem comprovante antes da marca e nao use a marca de atendente junto.`

export const REGRA_ASSINATURA_WHATSAPP = `# VERIFICACAO DA ASSINATURA NO WHATSAPP (PRIORIDADE MAXIMA - SOBREPOE A BASE, inclusive "Plano pago e acesso nao liberado" e "Se ele diz que ja pagou... encaminhe para a equipe")
${COMUM}
- PERGUNTA SOBRE O PLANO ("qual plano eu fiz?", "lembra qual eu assinei?", "da uma olhada no sistema", print da tela de planos): se existir a secao CONTAS DESTE NUMERO, responda com ela (sem marca); se nao existir, pergunte o e-mail e use a marca. NUNCA responda que nao consegue ver o sistema.
- Se a conta dela AINDA NAO esta identificada (veja a linha "Conta identificada" no fim das instrucoes) e ela ainda nao disse o e-mail na conversa: pergunte so isto, curto: "Qual e-mail você usa na plataforma?" (sem marca).
- Assim que ela disser o e-mail (ou se a conta ja esta identificada), responda APENAS com a marca [[VERIFICAR_ASSINATURA: e-mail]]. Se ela disser dois e-mails (o da plataforma e o da compra), coloque os dois separados por espaco. Se a conta ja esta identificada e ela nao disse e-mail, use [[VERIFICAR_ASSINATURA]]. Nao escreva mais nada junto: o sistema confere, libera se estiver tudo certo e responde a pessoa.
- Se o sistema respondeu que nao achou o pagamento e pediu o e-mail usado na compra, e ela mandar esse e-mail, emita a marca de novo com os dois e-mails (o da plataforma e o da compra).`

export const REGRA_ASSINATURA_CHAT = `# VERIFICACAO DA ASSINATURA (PRIORIDADE MAXIMA - SOBREPOE A BASE, inclusive "Plano pago e acesso nao liberado" e "Se ele diz que ja pagou... encaminhe para a equipe")
${COMUM}
- O aluno esta logado, entao a conta ja e conhecida. Quando ele disser que pagou/assinou e esta bloqueado, responda APENAS com a marca [[VERIFICAR_ASSINATURA]]. Se ele disser que pagou com OUTRO e-mail, coloque esse e-mail: [[VERIFICAR_ASSINATURA: e-mail]]. Nao escreva mais nada junto: o sistema confere, libera se estiver tudo certo e responde.`

type Resultado = { texto: string; humano: boolean; status: string }

function norm(e: any): string {
  return String(e || '').trim().toLowerCase()
}

function dataBR(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

// db = cliente Supabase com a chave de servico.
// conta = e-mail da conta ligada a conversa/login (se houver). emails = e-mails que a pessoa informou na conversa.
export async function verificarAssinaturaPeloJunior(db: any, p: { conta?: string | null; waId?: string | null; emails?: string[]; origem: 'chat' | 'whatsapp' }): Promise<Resultado> {
  const zap = p.origem === 'whatsapp'
  const digitados = (p.emails || []).map(norm).filter(Boolean)
  let status = 'erro'
  try {
    const colunas = 'id, email, subscription_status, plan_id, refunded_at, is_admin, updated_at'
    const perfilDe = async function(email: string): Promise<any> {
      if (!email) return null
      const r = await db.from('profiles').select(colunas).eq('email', email).maybeSingle()
      return r.data || null
    }

    // 1) Conta: a da conversa/login; senao a que a pessoa digitou
    let conta = norm(p.conta)
    let perfil = await perfilDe(conta)
    if (!perfil) {
      for (const e of digitados) {
        perfil = await perfilDe(e)
        if (perfil) { conta = e; break }
      }
    }
    const emailsCompra = Array.from(new Set([...digitados, conta].filter(Boolean)))
    // Digitou um e-mail de compra diferente do da conta: e a segunda tentativa dela
    const digitouOutro = digitados.some(function(e) { return e !== conta })

    // 2) Pagamentos da plataforma (compras de plano) por e-mail e pelo numero do WhatsApp desta conversa
    const tail = String(p.waId || '').replace(/\D/g, '').slice(-8)
    const compras: any[] = []
    const vistos = new Set<string>()
    const juntar = function(lista: any[] | null | undefined) {
      for (const c of lista || []) {
        const k = String(c.id)
        if (!vistos.has(k)) { vistos.add(k); compras.push(c) }
      }
    }
    const cols = 'id, produto, paid_at, reembolsado, email, wa, plano'
    if (emailsCompra.length) juntar((await db.from('hubla_compras').select(cols).eq('cat', 'p').in('email', emailsCompra)).data)
    if (tail.length === 8) juntar((await db.from('hubla_compras').select(cols).eq('cat', 'p').like('wa', '%' + tail)).data)
    const validas = compras.filter(function(c) { return c.reembolsado !== true })
    const reembolsadas = compras.filter(function(c) { return c.reembolsado === true })
    let ultima: string | null = null
    let planoPago = ''
    for (const c of validas) {
      if (c.paid_at && (!ultima || new Date(c.paid_at).getTime() > new Date(ultima).getTime())) { ultima = c.paid_at; planoPago = String(c.plano || '') }
    }

    const linkVer = zap
      ? 'Entre na plataforma (' + LINK_PLATAFORMA + ') e atualize a página (ou saia e entre de novo).'
      : 'Atualize a página (ou saia e entre de novo).'

    // 3) Sem conta na plataforma
    if (!perfil) {
      if (validas.length > 0) {
        status = 'sem_conta_com_pagamento'
        return { status, humano: false, texto: 'Achei o seu pagamento da plataforma, mas ainda não achei um cadastro com esse e-mail. Crie a sua conta em ' + LINK_PLATAFORMA + ' (botão "Criar conta") com o MESMO e-mail da compra e me avise aqui que eu libero o seu plano.' }
      }
      if (digitados.length === 0) {
        status = 'sem_email'
        return { status, humano: false, texto: 'Qual e-mail você usa na plataforma?' }
      }
      // O e-mail pode ser de quem comprou a Mentoria/Express e so ainda nao criou a conta: nesse caso nao diga que "nao achou"
      try {
        let comprou = false
        const h = await db.from('hubla_compras').select('id', { head: true, count: 'exact' }).in('email', digitados).eq('reembolsado', false)
        if ((h.count || 0) > 0) comprou = true
        if (!comprou) {
          const x = await db.from('compras_externas').select('email', { head: true, count: 'exact' }).in('email', digitados).eq('reembolsada', false)
          if ((x.count || 0) > 0) comprou = true
        }
        if (comprou) {
          status = 'sem_conta_com_compra'
          return { status, humano: false, texto: 'Achei a sua compra com esse e-mail! Só falta criar a sua conta.\n\n' + 'https://www.mcpia.site/login\n\nEntra aqui e cria sua conta com esse mesmo e-mail e depois faz o login, com isso você já vai acessar o aplicativo.\n\nAssim que você fizer isso me confirma que se deu certinho!' }
        }
      } catch (e) { /* segue para a resposta padrao */ }
      status = 'sem_conta'
      return { status, humano: false, texto: 'Não achei esse e-mail na plataforma. Confere se ele está certinho e me manda de novo? Se você ainda não criou a conta, crie em ' + LINK_PLATAFORMA + ' (botão "Criar conta").' }
    }

    // 4) Ja esta ativo
    if (perfil.is_admin === true || (perfil.subscription_status === 'active' && perfil.plan_id)) {
      let nomePlano = ''
      if (perfil.plan_id) {
        const pl = await db.from('plans').select('name').eq('id', perfil.plan_id).maybeSingle()
        nomePlano = String((pl.data as any)?.name || '')
      }
      status = 'ja_ativo'
      return { status, humano: false, texto: 'Conferi aqui: a sua assinatura já está ativa' + (nomePlano ? ' no plano ' + nomePlano : '') + '. ' + linkVer + ' Se continuar bloqueado, me manda um print da tela.' }
    }

    // 5) Reembolso: nao libera, e quem explica e a equipe
    if (perfil.refunded_at || (validas.length === 0 && reembolsadas.length > 0)) {
      status = 'reembolsada'
      return { status, humano: true, texto: 'Conferi aqui e o pagamento dessa assinatura consta como reembolsado, por isso o plano não está ativo.' }
    }

    // 6) Sem pagamento encontrado
    if (validas.length === 0) {
      if (digitouOutro) {
        status = 'sem_pagamento_equipe'
        return { status, humano: true, texto: 'Conferi com os dois e-mails e com o seu número e não achei o pagamento da plataforma. Me manda o comprovante da compra (um print ou o PDF) para eu deixar o seu caso registrado.' }
      }
      status = 'sem_pagamento'
      const lk = await linkDoPlanoDela(db, perfil)
      return { status, humano: false, texto: 'Conferi aqui e não achei nenhum pagamento da plataforma com esse e-mail nem com o seu número. Se você pagou com outro e-mail, me diga qual foi (ele aparece no comprovante que a Hubla enviou). Se ainda não assinou' + (lk.nome ? ' o plano ' + lk.nome : '') + ', você pode assinar por aqui: ' + lk.link }
    }

    // 7) Pagamento antigo demais (assinatura mensal)
    const idadeDias = ultima ? (Date.now() - new Date(ultima).getTime()) / 86400000 : 9999
    if (idadeDias > DIAS_VALIDADE) {
      status = 'vencida'
      const lk = await linkDoPlanoDela(db, perfil)
      return { status, humano: false, texto: 'Conferi aqui: o último pagamento que consta é de ' + dataBR(ultima as string) + ', e a assinatura é mensal. Não consta o pagamento do mês seguinte. Para voltar a usar as ferramentas' + (lk.nome ? ' do plano ' + lk.nome : '') + ', renove por aqui: ' + lk.link + ' . Se você já pagou depois dessa data, me manda o e-mail usado na compra que eu confiro de novo.' }
    }

    // 8) Atraso ou cancelamento depois do ultimo pagamento: nao reativa sozinho
    const mudouEm = perfil.updated_at ? new Date(perfil.updated_at).getTime() : 0
    const pagouDepois = ultima ? new Date(ultima).getTime() > mudouEm : false
    if (perfil.subscription_status === 'past_due' && !pagouDepois) {
      status = 'em_atraso'
      return { status, humano: false, texto: 'Conferi aqui: a renovação da sua assinatura não foi aprovada, então o acesso fica bloqueado até regularizar. Na tela de aviso da plataforma, toque em "Regularizar pagamento". Assim que o pagamento for aprovado, o acesso volta sozinho em alguns minutos. Se você já regularizou e continua bloqueado, me avise.' }
    }
    if (perfil.subscription_status === 'canceled' && !pagouDepois) {
      status = 'cancelada'
      const lk = await linkDoPlanoDela(db, perfil)
      return { status, humano: false, texto: 'Conferi aqui: a sua assinatura' + (lk.nome ? ' do plano ' + lk.nome : '') + ' foi cancelada, por isso o plano não está ativo. Se quiser voltar, é só assinar de novo por aqui: ' + lk.link + ' . Depois que pagar, me avisa aqui que eu libero na hora.' }
    }

    // 9) Pagamento confirmado e conta existe: libera
    // Libera o plano que consta na compra (Starter, Pro ou Premium). Compra antiga sem plano registrado: Starter, o menor.
    let nomePlano = ['Starter', 'Pro', 'Premium'].indexOf(planoPago) >= 0 ? planoPago : ''
    if (!nomePlano && perfil.plan_id) {
      // Compra sem plano registrado: mantem o plano que ela ja tem (para nao rebaixar quem e Pro/Premium)
      const atual = await db.from('plans').select('name').eq('id', perfil.plan_id).maybeSingle()
      const n = String((atual.data as any)?.name || '')
      if (['Starter', 'Pro', 'Premium'].indexOf(n) >= 0) nomePlano = n
    }
    if (!nomePlano) nomePlano = 'Starter'
    const pl = await db.from('plans').select('id, name').eq('name', nomePlano).maybeSingle()
    const planoId = (pl.data as any)?.id
    if (!planoId) { status = 'erro'; return { status, humano: true, texto: 'Não consegui liberar agora, mas deixei o seu caso registrado aqui.' } }
    const up = await db.from('profiles').update({
      subscription_status: 'active',
      plan_id: planoId,
      payment_provider: 'hubla',
      credits_videos_used: 0,
      credits_ebooks_used: 0,
      credits_sites_used: 0,
      refunded_at: null,
      updated_at: new Date().toISOString(),
    }).eq('id', perfil.id)
    if (up.error) {
      console.error('[junior-assinatura] update:', up.error.message)
      status = 'erro'
      return { status, humano: true, texto: 'Não consegui liberar agora, mas deixei o seu caso registrado aqui.' }
    }
    try {
      await db.from('hubla_events').insert({ provider: 'junior', event_type: 'junior.assinatura_liberada', email: conta, user_id: perfil.id, action: 'liberado', note: ('Junior liberou o plano ' + nomePlano + ' (pagamento de ' + dataBR(ultima as string) + ', origem ' + p.origem + ')').slice(0, 300) })
    } catch (e) { /* historico e so conforto */ }
    status = 'liberado'
    return { status, humano: false, texto: 'Pronto! Conferi aqui e o seu pagamento da plataforma está confirmado. 🙏 Liberei o seu plano ' + nomePlano + '. ' + linkVer + ' Depois é só abrir o Gerador de Criativos.' + (planoPago ? '' : ' Se você assinou outro plano (Pro ou Premium), me avise aqui.') }
  } catch (e) {
    console.error('[junior-assinatura] erro:', e)
    return { status: 'erro', humano: true, texto: 'Não consegui conferir agora, mas deixei o seu caso registrado aqui. Pode me mandar uma mensagem daqui a pouco?' }
  }
}

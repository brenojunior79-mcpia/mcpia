// Liberacao de cadastro pelo Junior (WhatsApp).
// Quando a pessoa manda o print da tela de cadastro com o aviso "Nao encontramos uma compra com esse e-mail", o Junior pede o e-mail da compra
// e emite a marca [[LIBERAR_CADASTRO: e-mail]]. Quem libera e escreve a resposta e este arquivo (o sistema): coloca o e-mail em
// cadastro_liberados (a tela de cadastro e o banco passam a aceitar) e pede para a pessoa criar a conta de novo.

const MARCA_RE = /\[\[\s*LIBERAR_CADASTRO[^\]]*\]\]/i
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const MAX_LIBERACOES_POR_NUMERO = 3

export function pediuLiberarCadastro(texto: string): boolean {
  return MARCA_RE.test(String(texto || ''))
}

export function removerMarcaCadastro(texto: string): string {
  return String(texto || '').replace(new RegExp(MARCA_RE.source, 'gi'), '').trim()
}

export function emailDaMarcaCadastro(texto: string): string {
  const m = String(texto || '').match(MARCA_RE)
  if (!m) return ''
  const e = m[0].match(EMAIL_RE)
  return e ? e[0].trim().toLowerCase() : ''
}

export const REGRA_CADASTRO_WHATSAPP = `# LIBERAR CADASTRO (PRIORIDADE MAXIMA, vale para QUALQUER aluno)
Voce TEM autorizacao do Breno para liberar o cadastro de QUALQUER aluno que esteja travado para entrar na plataforma. Vale quando a pessoa: (a) mandar o print da tela de cadastro (Criar conta) com o aviso vermelho "Nao encontramos uma compra com esse e-mail"; (b) disser que o cadastro nao aceita o e-mail; (c) disser que comprou (mesmo ha muito tempo, ou em outra plataforma como Kiwify) e nao consegue criar a conta, entrar ou achar as aulas na plataforma nova; (d) reclamar que as aulas antigas sumiram e ela esta tentando entrar na plataforma nova; (e) mandar print ou falar da AREA DE MEMBROS ANTIGA (tela "Faca seu login", Astro Members, "o acesso a area de membros esta temporariamente indisponivel", erro de login de outra plataforma): essa area antiga NAO existe mais, foi substituida pela plataforma Cristao Prospero (mcpia.site). Nesse caso diga em UMA frase que a area antiga foi substituida pela plataforma Cristao Prospero e peca o e-mail da compra. NUNCA diga que a area esta "indisponivel" ou "em manutencao". NUNCA use [[VERIFICAR_ASSINATURA]] nem [[CONSULTAR_COMPRA]] nesses casos e NUNCA mande link de assinatura, de checkout ou de pagamento (pay.hub.la) para quem diz que JA comprou ou esta travado para entrar: quem compra so precisa criar a conta ou entrar na plataforma. NAO passe esses casos para a equipe, NAO diga "vou verificar" nem "anotei o seu pedido": voce mesma(o) resolve com a marca abaixo. Faca assim:
1. Se ela AINDA NAO escreveu o e-mail da compra em uma mensagem de texto: peca, curto e simples: "Me escreve aqui o e-mail que você usou na compra, que eu libero o seu cadastro. 🙏". Nao tente ler o e-mail do print (pode estar errado ou cortado): peca sempre para ela digitar.
2. Quando ela escrever o e-mail: responda APENAS com a marca [[LIBERAR_CADASTRO: e-mail]] (o e-mail que ela escreveu, so um). Nao escreva mais nada. O SISTEMA libera o cadastro e escreve a resposta pedindo para ela criar a conta de novo.
3. NAO use [[CONSULTAR_COMPRA]] nesse caso, nao peca comprovante e nao pergunte onde comprou: essa regra substitui a consulta de compra. Se ela ja mandou o e-mail antes do print, use a marca direto.
4. Depois que o sistema responder, siga a conversa: se ela disser que conseguiu, siga a regra de acesso confirmado. Se ela escrever outro e-mail, repita o passo 2.`

function emailValido(e: string): boolean {
  return /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(e) && e.length <= 120
}

// Libera o e-mail para criar a conta. Devolve a resposta pronta para a pessoa.
export async function liberarCadastroPeloJunior(db: any, p: { email: string; waId?: string; nome?: string }): Promise<{ texto: string; liberou: boolean; humano?: boolean }> {
  const email = String(p.email || '').trim().toLowerCase()
  if (!emailValido(email)) {
    return { texto: 'Não consegui ler esse e-mail direitinho. Me escreve ele de novo, completo, por favor? 🙏', liberou: false }
  }
  try {
    const tel = String(p.waId || '').replace(/\D/g, '').slice(-11)
    // Ja existe conta com esse e-mail: nao precisa liberar, so entrar
    const pr = await db.from('profiles').select('id').ilike('email', email).limit(1)
    if (pr.data && pr.data.length > 0) {
      return { texto: 'Esse e-mail (' + email + ') já tem conta aqui. É só entrar em https://www.mcpia.site/login, clicar em "Entrar" e usar esse e-mail. Se esqueceu a senha, clique em "Esqueci minha senha". Me avisa se der certo! 🙏', liberou: false }
    }
    // Limite por numero: evita liberar varios e-mails para a mesma pessoa
    if (tel) {
      const cnt = await db.from('cadastro_liberados').select('email', { count: 'exact', head: true }).ilike('nota', '%Júnior (WhatsApp)%').ilike('nota', '%tel ' + tel + '%')
      if ((cnt.count || 0) >= MAX_LIBERACOES_POR_NUMERO) {
        return { texto: 'Vou pedir para a nossa equipe conferir o seu cadastro e já te respondo por aqui, tá bom? 🙏', liberou: false, humano: true }
      }
    }
    const ja = await db.from('cadastro_liberados').select('email').ilike('email', email).limit(1)
    if (!ja.data || ja.data.length === 0) {
      const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      const nota = 'Liberado pelo Júnior (WhatsApp) em ' + hoje + (p.nome ? ', ' + String(p.nome).slice(0, 40) : '') + (tel ? ', tel ' + tel : '')
      const ins = await db.from('cadastro_liberados').insert({ email, nota })
      if (ins.error) {
        console.error('[junior-cadastro] insert:', ins.error.message)
        return { texto: 'Tive um probleminha para liberar agora. Vou pedir para a equipe conferir e já te respondo por aqui, tá bom? 🙏', liberou: false, humano: true }
      }
    }
    return {
      texto: 'Pronto, liberei o seu cadastro na plataforma Cristão Próspero com o e-mail ' + email + ' ✅\n\nAgora entra neste link, clica em "Criar conta" e faz o cadastro com esse MESMO e-mail:\nhttps://www.mcpia.site/login\n\nQuando você conseguir, me avisa aqui! 🙏',
      liberou: true,
    }
  } catch (e) {
    console.error('[junior-cadastro]', e)
    return { texto: 'Tive um probleminha para liberar agora. Vou pedir para a equipe conferir e já te respondo por aqui, tá bom? 🙏', liberou: false, humano: true }
  }
}


// Conversa de problema de acesso (area de membros antiga, nao consigo entrar, erro de cadastro...)? Serve de trava no sistema:
// se o modelo errar e pedir a conferencia do PLANO ou a consulta de compra, o sistema troca pela liberacao de cadastro.
const CONTEXTO_ACESSO_RE = /[aá]rea de membros|astro members|astro|fa[cç]a seu login|acesso.{0,40}indispon|n[aã]o consigo (entrar|acessar|logar|fazer login)|sem acesso|n[aã]o tenho acesso|aulas? (antigas|sumiram|sumiu)|n[aã]o encontramos uma compra|n[aã]o aceita o e-?mail|criar (a )?conta/i
const CONTEXTO_PLANO_RE = /\b(plano|planos|pro|premium|starter|assinatura|assinar|cr[eé]ditos?|renova[cç][aã]o|cart[aã]o|fatura)\b/i

export function conversaDeProblemaDeAcesso(linhas: any[]): boolean {
  const ult = (linhas || []).slice(-14)
  const temAcesso = ult.some(function(m) { return CONTEXTO_ACESSO_RE.test(String(m.body || '')) })
  if (!temAcesso) return false
  // se a PESSOA esta falando de plano/assinatura/creditos nas ultimas mensagens, nao e problema de acesso
  const dela = ult.filter(function(m) { return m.direction === 'in' && m.type === 'text' }).slice(-4)
  return !dela.some(function(m) { return CONTEXTO_PLANO_RE.test(String(m.body || '')) })
}

// ultimo e-mail que a PESSOA escreveu na conversa
export function ultimoEmailDaPessoa(linhas: any[]): string {
  const ins = (linhas || []).filter(function(m) { return m.direction === 'in' }).reverse()
  for (const m of ins) {
    const e = String(m.body || '').replace(/\s+/g, '').match(EMAIL_RE)
    if (e) return e[0].toLowerCase()
  }
  return ''
}

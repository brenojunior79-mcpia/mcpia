// Liberacao da Estrutura Express pelo Junior.
// O Junior so PEDE o e-mail e emite a marca [[LIBERAR_EXPRESS:...]]. Quem confere a compra e libera e o banco
// (funcao express_liberar_junior), e o texto que o aluno le vem daqui, nunca da IA (a IA nao pode "inventar" que liberou).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MARCA_RE = /\[\[\s*LIBERAR_EXPRESS\s*:\s*([^\]|]*?)\s*(?:\|\s*([^\]]*?)\s*)?\]\]/i

export const LINK_PLATAFORMA = 'https://www.mcpia.site/'

export function extrairPedidoExpress(texto: string): { compra: string; conta: string } | null {
  const m = MARCA_RE.exec(String(texto || ''))
  if (!m) return null
  return { compra: String(m[1] || '').trim().toLowerCase(), conta: String(m[2] || '').trim().toLowerCase() }
}

// Tira qualquer marca que sobrar no texto (o aluno nunca ve a marca)
export function removerMarcaExpress(texto: string): string {
  return String(texto || '').replace(new RegExp(MARCA_RE.source, 'gi'), '').trim()
}

export const REGRA_EXPRESS_CHAT = `# LIBERACAO DA ESTRUTURA EXPRESS (PRIORIDADE MAXIMA - SOBREPOE A BASE ACIMA)
Voce consegue conferir a compra e liberar o menu da Estrutura Express para este aluno. Quando ele disser que comprou e esta sem acesso (menu bloqueado, conteudo nao abre, nao aparece):
1. Se ele ainda nao escreveu o e-mail usado na COMPRA, peca so isso, curto: "Me passa o e-mail que voce usou na compra da Estrutura Express, que eu confiro e libero pra voce."
2. Assim que ele escrever um e-mail, responda APENAS com a marca [[LIBERAR_EXPRESS:email]], trocando "email" pelo e-mail que ele escreveu (minusculas, sem espacos). Nao escreva mais nada junto: o sistema confere a compra e responde ao aluno.
3. NUNCA diga que liberou, que a compra foi confirmada ou que nao foi encontrada: quem confere e o sistema. NUNCA emita a marca sem um e-mail que o aluno tenha escrito nesta conversa, nem para quem nao diz que comprou.
4. Situacao do acesso deste aluno agora: {{status}}
5. Quem ainda nao comprou e quer comprar: siga a base (preco e link oficial).
Esta regra vale no lugar da frase "avise que a equipe vai liberar" da base.`

export function regraExpressChat(jaTem: boolean): string {
  const status = jaTem
    ? 'ele JA TEM acesso liberado. Nao emita a marca; diga que o menu "Estrutura Express" ja esta liberado nesta conta e oriente atualizar a pagina ou sair e entrar de novo.'
    : 'ele ainda NAO tem acesso.'
  return REGRA_EXPRESS_CHAT.split('{{status}}').join(status)
}

export const REGRA_EXPRESS_WHATSAPP = `# LIBERACAO DA ESTRUTURA EXPRESS NO WHATSAPP (PRIORIDADE MAXIMA - SOBREPOE A BASE E AS REGRAS ACIMA)
Voce consegue conferir a compra e liberar o menu da Estrutura Express. Quando a pessoa disser que comprou e esta sem acesso:
1. Peca os dois e-mails, um de cada vez se preciso: o e-mail usado na COMPRA e o e-mail com que ela criou a conta na plataforma (se for o mesmo, ela diz). Se ela ainda nao tem conta, oriente a criar em ${LINK_PLATAFORMA} (botao "Criar conta") e depois voltar aqui.
2. Quando tiver os dois e-mails, responda APENAS com a marca [[LIBERAR_EXPRESS:email_da_compra|email_da_conta]] (minusculas, sem espacos; se os dois forem iguais, repita o e-mail). Nao escreva mais nada junto: o sistema confere a compra e responde.
3. NUNCA diga que liberou, que a compra foi confirmada ou que nao foi encontrada: quem confere e o sistema. NUNCA emita a marca sem e-mails que a pessoa tenha escrito nesta conversa.
4. Esta regra vale no lugar de "acesso que depende de acao administrativa" para a Estrutura Express. Nao use ${'[[HUMANO]]'} junto com a marca.`

type Resultado = { texto: string; humano: boolean; status: string }

function limpaEmail(s: string): string {
  const e = String(s || '').trim().toLowerCase()
  return EMAIL_RE.test(e) && e.length <= 200 ? e : ''
}

// db = cliente Supabase com a chave de servico. origem: 'chat' (aluno logado) | 'whatsapp'
export async function liberarExpressPeloJunior(db: any, p: { compra: string; conta: string; waId?: string | null; origem: 'chat' | 'whatsapp' }): Promise<Resultado> {
  const zap = p.origem === 'whatsapp'
  const compra = limpaEmail(p.compra)
  const conta = limpaEmail(p.conta || p.compra)
  if (!compra || !conta) {
    return { status: 'email_invalido', humano: false, texto: 'Não consegui ler o e-mail direitinho. Pode escrever de novo, só o e-mail? 🙏' }
  }

  let status = 'erro'
  try {
    const r = await db.rpc('express_liberar_junior', { p_conta: conta, p_compra: compra, p_wa: zap ? (p.waId || '') : '', p_origem: p.origem })
    if (!r.error && typeof r.data === 'string') status = r.data
    else console.error('[junior-express] rpc:', r.error?.message)
  } catch (e) {
    console.error('[junior-express] erro:', e)
  }

  const verMenu = zap
    ? 'Entre na plataforma (' + LINK_PLATAFORMA + '), abra o menu "Estrutura Express" e, se não aparecer, saia e entre de novo.'
    : 'Atualize a página (ou saia e entre de novo) e abra o menu "Estrutura Express" na barra lateral.'
  const equipe = zap
    ? 'Um atendente da equipe vai conferir o seu caso e te responder em breve.'
    : 'Chame o WhatsApp de Suporte da plataforma, informando o e-mail da compra, que a equipe confere o seu caso.'

  switch (status) {
    case 'liberado':
      return { status, humano: false, texto: 'Conferi aqui e a sua compra da Estrutura Express está confirmada. 🙏 Já liberei o seu acesso! ' + verMenu }
    case 'ja_tinha':
      return { status, humano: false, texto: 'O seu acesso à Estrutura Express já está liberado nesta conta. ' + verMenu }
    case 'sem_conta':
      return { status, humano: false, texto: 'Não achei cadastro na plataforma com o e-mail ' + conta + '. Crie a sua conta em ' + LINK_PLATAFORMA + ' (botão "Criar conta") e depois me avise aqui que eu libero. 🙏' }
    case 'sem_compra':
      return zap
        ? { status, humano: true, texto: 'Não achei uma compra da Estrutura Express com esses dados. ' + equipe }
        : { status, humano: false, texto: 'Não encontrei uma compra da Estrutura Express com o e-mail ' + compra + '. Confira se digitou certinho e me mande de novo, ou me diga se comprou com outro e-mail. Se preferir, chame o WhatsApp de Suporte da plataforma.' }
    case 'reembolsada':
      return { status, humano: true, texto: 'Essa compra consta como reembolsada, então não consigo liberar por aqui. ' + equipe }
    case 'compra_de_outra_conta':
    case 'compra_em_uso':
    case 'muitas_tentativas':
      return { status, humano: true, texto: 'Para a segurança da sua compra, esse caso precisa ser conferido por um atendente. ' + equipe }
    default:
      return { status: 'erro', humano: true, texto: 'Tive um problema para conferir agora. ' + equipe }
  }
}

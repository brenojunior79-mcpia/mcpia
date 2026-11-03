// Liberacao da Estrutura Express pelo Junior.
// Quando o aluno diz que e da Estrutura Express e esta sem acesso, o Junior emite a marca [[LIBERAR_EXPRESS]].
// Quem libera de verdade e o banco (funcao express_liberar_direto, que fica registrada em junior_express_log e na lista de liberados),
// e o texto que o aluno le vem daqui, nunca da IA (a IA nao pode "inventar" que liberou).

export const LINK_PLATAFORMA = 'https://www.mcpia.site/'

const MARCA_RE = /\[\[\s*LIBERAR_EXPRESS[^\]]*\]\]/i

export function pediuLiberarExpress(texto: string): boolean {
  return MARCA_RE.test(String(texto || ''))
}

// E-mail que o aluno informou, vindo na marca: [[LIBERAR_EXPRESS: email@exemplo.com]]
export function emailDaMarca(texto: string): string {
  const m = String(texto || '').match(/\[\[\s*LIBERAR_EXPRESS\s*:?\s*([^\]\s]*)\s*\]\]/i)
  const e = String((m && m[1]) || '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : ''
}

// Tira qualquer marca que sobrar no texto (o aluno nunca ve a marca)
export function removerMarcaExpress(texto: string): string {
  return String(texto || '').replace(new RegExp(MARCA_RE.source, 'gi'), '').trim()
}

export const REGRA_EXPRESS_CHAT = `# LIBERACAO DA ESTRUTURA EXPRESS (PRIORIDADE MAXIMA - SOBREPOE A BASE ACIMA)
Voce consegue liberar o menu da Estrutura Express para este aluno, sem pedir e-mail nem comprovante, mas SO quando ele disser CLARAMENTE as duas coisas: (1) que COMPROU a Estrutura Express e (2) que NAO consegue acessar (menu bloqueado, conteudo nao abre, nao aparece). So nesse caso responda APENAS com a marca [[LIBERAR_EXPRESS]]. Nao escreva mais nada junto: o sistema libera e responde ao aluno.
- NAO emita a marca quando o aluno so PERGUNTAR se tem a Estrutura Express, so tiver curiosidade, duvida ("nao sei se tenho", "tem como verificar?"), pedir explicacao do produto, ou so disser que tem a plataforma/assinatura. Isso NAO e dizer que comprou a Express.
- Se o aluno perguntar se tem a Express: use a situacao do acesso abaixo. Se NAO tem acesso, diga que nao achou a compra da Estrutura Express nesta conta e pergunte, em uma frase curta, se ele comprou a Estrutura Express. Se ele responder que comprou e nao consegue acessar, emita a marca. Se nao comprou e quer saber mais, siga a base (preco e link oficial).
- NUNCA diga que liberou: quem libera e o sistema. Nao peca e-mail, print nem comprovante para a Estrutura Express.
- Situacao do acesso deste aluno agora: {{status}}
- Quem ainda nao comprou e quer comprar: siga a base (preco e link oficial) e nao emita a marca.
Esta regra vale no lugar da frase "avise que a equipe vai liberar" da base.`

export function regraExpressChat(jaTem: boolean): string {
  const status = jaTem
    ? 'ele JA TEM acesso liberado. Nao emita a marca; diga que o menu "Estrutura Express" ja esta liberado nesta conta e oriente atualizar a pagina ou sair e entrar de novo.'
    : 'ele ainda NAO tem acesso.'
  return REGRA_EXPRESS_CHAT.split('{{status}}').join(status)
}

export const REGRA_EXPRESS_WHATSAPP = `# LIBERACAO DA ESTRUTURA EXPRESS NO WHATSAPP (PRIORIDADE MAXIMA - SOBREPOE A BASE E AS REGRAS ACIMA)
Voce consegue liberar o menu da Estrutura Express, mas SO quando a pessoa disser CLARAMENTE as duas coisas: (1) que COMPROU a Estrutura Express e (2) que NAO consegue acessar (menu bloqueado, conteudo nao abre, nao aparece, "meu acesso nao esta ativo").
- NAO libere nem emita a marca quando a pessoa so PERGUNTAR se tem a Estrutura Express, tiver duvida ("nao sei se tenho", "tem como verificar?"), pedir explicacao do produto, ou so disser que tem plataforma/assinatura. Isso NAO e dizer que comprou a Express. Nesse caso use a linha "Estrutura Express desta pessoa" no fim das instrucoes: se o sistema nao achou compra, diga curto que nao achou a compra da Estrutura Express e pergunte se ela comprou a Estrutura Express (se nao comprou e quer saber mais, siga a base com preco e link oficial); se ela ja tem acesso, diga que o menu esta liberado; se o sistema nao sabe, use [[HUMANO]] para a equipe conferir.
- Quando ela disser claramente que comprou e nao consegue acessar:
- Se o e-mail dela AINDA NAO esta identificado (veja a linha "Conta identificada" no fim das instrucoes) e ela ainda nao disse o e-mail na conversa: pergunte so isto, curto: "Qual e-mail voce usa na plataforma?" Nao emita a marca ainda. Nao peca comprovante nem print.
- Assim que ela disser o e-mail (ou se a conta ja esta identificada), responda APENAS com a marca [[LIBERAR_EXPRESS: e-mail-dela]] (se a conta ja esta identificada, [[LIBERAR_EXPRESS]]). Nao escreva mais nada junto: o sistema libera e responde a pessoa.
- NUNCA diga que liberou: quem libera e o sistema. Nao use [[HUMANO]] junto com a marca.
- Quem ainda nao comprou e quer comprar: siga a base (preco e link oficial) e nao emita a marca.`

type Resultado = { texto: string; humano: boolean; status: string }

// db = cliente Supabase com a chave de servico.
// origem 'chat': conta = e-mail do aluno logado. origem 'whatsapp': conta = e-mail do cadastro ligado a conversa (se houver); senao acha pelo numero do WhatsApp.
export async function liberarExpressPeloJunior(db: any, p: { conta?: string | null; waId?: string | null; origem: 'chat' | 'whatsapp'; emailInformado?: string | null }): Promise<Resultado> {
  const zap = p.origem === 'whatsapp'
  // e-mail que a pessoa digitou na conversa vale quando o sistema nao conhece a conta
  const contaUsada = String(p.conta || '').trim() || String(p.emailInformado || '').trim()
  const digitou = !String(p.conta || '').trim() && !!String(p.emailInformado || '').trim()
  let status = 'erro'
  try {
    const r = await db.rpc('express_liberar_direto', { p_conta: contaUsada.toLowerCase(), p_wa: zap ? (p.waId || '') : '', p_origem: p.origem })
    if (!r.error && typeof r.data === 'string') status = r.data
    else console.error('[junior-express] rpc:', r.error?.message)
  } catch (e) {
    console.error('[junior-express] erro:', e)
  }

  const verMenu = zap
    ? 'Entre na plataforma (' + LINK_PLATAFORMA + '), abra o menu "Estrutura Express" e, se não aparecer, saia e entre de novo.'
    : 'Atualize a página (ou saia e entre de novo) e abra o menu "Estrutura Express" na barra lateral.'
  const equipe = zap
    ? 'Um atendente da equipe vai continuar com você em breve.'
    : 'Chame o WhatsApp de Suporte da plataforma que a equipe te ajuda.'

  switch (status) {
    case 'liberado':
      return { status, humano: false, texto: 'Pronto! Liberei o seu acesso à Estrutura Express. 🙏 ' + verMenu }
    case 'ja_tinha':
      return { status, humano: false, texto: 'O seu acesso à Estrutura Express já está liberado. ' + verMenu }
    case 'sem_conta':
      if (zap && !contaUsada) return { status, humano: false, texto: 'Qual e-mail você usa na plataforma?' }
      return { status, humano: false, texto: (digitou ? 'Não achei esse e-mail na plataforma. Confere se ele está certinho e me manda de novo? ' : 'Ainda não achei o seu cadastro na plataforma. ') + 'Se ainda não criou a sua conta, crie em ' + LINK_PLATAFORMA + ' (botão "Criar conta", com o e-mail da compra) e me avise aqui que eu libero na hora. 🙏' }
    default:
      return { status: status === 'varias_contas' ? status : 'erro', humano: true, texto: 'Não consegui liberar agora. ' + equipe }
  }
}

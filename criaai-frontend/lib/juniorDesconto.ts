// Trava do desconto da mentoria (ordem do Breno): o link de R$ 197 so sai depois de DUAS confirmacoes da pessoa
// (1: "o desconto ajudaria?" -> sim; 2: "fica R$ 197, posso mandar o link?" -> sim).
// Esta funcao so DECIDE o texto final quando o modelo escreveu o link cedo demais. Ela olha a conversa inteira (inclusive a mensagem
// atual da pessoa, que e a resposta a ultima pergunta) e nunca repete uma pergunta que ja foi feita.

export const LINK_DESCONTO_ID = 'icnB8VD8AfKqIV1SHX3h'
export const PERGUNTA_DESCONTO = 'Se eu conseguir um desconto para você, isso te ajudaria a entrar agora? 🙏'
export const CONFIRMA_DESCONTO = 'Então a mentoria fica por R$ 197. Posso te mandar o link para você garantir a sua vaga? 🙏'

const SIM = /(^|[^a-zà-ÿ])(sim|quero|pode|podem|manda|mande|mandar|claro|aceito|bora|vamos|com certeza|ajuda|ajudaria|interess\w*|topo|fechado|combinado|beleza|isso|ok|okay|por favor|gostaria)([^a-zà-ÿ]|$)/i
const NAO = /(^|[^a-zà-ÿ])(n[aã]o|nao|nunca|nada)([^a-zà-ÿ]|$)/i
const PERGUNTOU_DESCONTO = /promo|desconto|quanto|valor|como seria|qual o pre|que pre/i

function corpo(m: any): string { return String(m?.body || '').trim() }

function aceitou(txt: string): boolean {
  return !!txt && SIM.test(txt) && !NAO.test(txt)
}

function limpar(texto: string): string {
  return texto
    .split(/\n{2,}/)
    .filter(function(x) { return x.trim() && x.indexOf(LINK_DESCONTO_ID) < 0 && !/desconto|R\$\s?197|assim que (finalizar|concluir)/i.test(x) })
    .join('\n\n')
    .trim()
}

// linhasAsc: mensagens da conversa em ordem cronologica, JA incluindo a mensagem atual da pessoa (a ultima 'in').
export function decidirDesconto(textoModelo: string, linhasAsc: any[], primeiro: string): string {
  if (textoModelo.indexOf(LINK_DESCONTO_ID) < 0) return textoModelo
  const l = linhasAsc.filter(function(m) { return m.type !== 'system' })
  let iUltIn = -1
  for (let k = l.length - 1; k >= 0; k--) { if (l[k].direction === 'in') { iUltIn = k; break } }
  const atual = iUltIn >= 0 ? corpo(l[iUltIn]).replace(/^\[audio transcrito\]\s*/i, '') : ''

  // ultima pergunta "o desconto ajudaria?" e ultima confirmacao do valor "fica R$ 197, posso mandar o link?"
  let iPerg = -1
  for (let k = l.length - 1; k >= 0; k--) { if (l[k].direction === 'out' && /desconto/i.test(corpo(l[k])) && /(ajudaria|ajudar[aá]|ajuda).{0,40}entrar|entrar agora/i.test(corpo(l[k]))) { iPerg = k; break } }
  let iVal = -1
  if (iPerg >= 0) { for (let k = l.length - 1; k > iPerg; k--) { if (l[k].direction === 'out' && /197/.test(corpo(l[k])) && /link/i.test(corpo(l[k]))) { iVal = k; break } } }
  const respondeuDepois = function(i: number) { return i >= 0 && iUltIn > i }

  // 1) Ainda nao perguntou se o desconto ajudaria: faz a pergunta (so a pergunta, sem link)
  if (iPerg < 0) return PERGUNTA_DESCONTO
  // 2) Ja perguntou, mas ainda nao confirmou o valor
  if (iVal < 0) {
    if (respondeuDepois(iPerg) && (aceitou(atual) || PERGUNTOU_DESCONTO.test(atual))) return CONFIRMA_DESCONTO
    return semLinkNemRepeticao(textoModelo, primeiro)
  }
  // 3) Ja confirmou o valor: o link so sai se a pessoa aceitou agora
  if (respondeuDepois(iVal) && aceitou(atual)) return textoModelo
  return semLinkNemRepeticao(textoModelo, primeiro)
}

function semLinkNemRepeticao(texto: string, primeiro: string): string {
  const sobra = limpar(texto)
  return sobra || ('Entendo' + (primeiro && primeiro !== 'voce' ? ', ' + primeiro : '') + '. Quando fizer sentido pra você, é só me chamar aqui 🙏')
}

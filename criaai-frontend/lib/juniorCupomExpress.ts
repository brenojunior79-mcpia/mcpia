import { aceitou, recusou } from '@/lib/juniorDesconto'

// Roteiro do Breno para quem aceita o cupom da Estrutura Express (R$ 197): a pessoa aceita -> "vou te mandar o link, me aguarde um minuto"
// -> 1 minuto depois, o link sozinho -> e a mensagem de que o link e promocional e de que o Breno libera assim que ela pagar.
// O sistema decide isso pelo historico da conversa (nao depende do modelo lembrar) e nunca manda o link duas vezes.

export const LINK_CUPOM_EXPRESS_ID = 'McleyfEuNHKETxMm0SR1'
export const LINK_CUPOM_EXPRESS = 'https://pay.hub.la/' + LINK_CUPOM_EXPRESS_ID
export const MSG_ESPERA_CUPOM = 'Imagina! Vou te mandar agora um link promocional com a Estrutura Express completa. Me aguarde um minuto 🙏'
export const MSG_AVISO_CUPOM = 'Esse link é promocional e a qualquer momento pode ser desativado. Assim que você fizer o pagamento, me avisa aqui, porque eu vou liberar a Estrutura Express para você agora 🙏'
const SEP = '[[PARTE]]'
export const MSG_LINK_CUPOM = LINK_CUPOM_EXPRESS + '\n' + SEP + '\n' + MSG_AVISO_CUPOM

function corpo(m: any): string { return String(m?.body || '').trim() }

export function decidirCupomExpress(textoModelo: string, linhasAsc: any[], primeiro: string): { texto: string; depois: string | null } {
  const l = linhasAsc.filter(function(m) { return m.type !== 'system' })
  const jaMandouLink = l.some(function(m) { return m.direction === 'out' && corpo(m).indexOf(LINK_CUPOM_EXPRESS_ID) >= 0 })
  const temLink = textoModelo.indexOf(LINK_CUPOM_EXPRESS_ID) >= 0
  if (jaMandouLink) {
    // O link ja foi: nunca manda de novo
    if (!temLink) return { texto: textoModelo, depois: null }
    return { texto: tirarLink(textoModelo) || 'Fico no aguardo, tá? 🙏', depois: null }
  }
  let iUltIn = -1
  for (let k = l.length - 1; k >= 0; k--) { if (l[k].direction === 'in') { iUltIn = k; break } }
  const atual = iUltIn >= 0 ? corpo(l[iUltIn]).replace(/^\[audio transcrito\]\s*/i, '') : ''
  // pergunta do cupom (passo 3) e mensagem de espera (passo 4)
  let iCupom = -1
  for (let k = l.length - 1; k >= 0; k--) { if (l[k].direction === 'out' && /Estrutura Express/i.test(corpo(l[k])) && /cupom.{0,60}197|197,00/i.test(corpo(l[k]))) { iCupom = k; break } }
  let iEspera = -1
  for (let k = l.length - 1; k >= 0; k--) { if (l[k].direction === 'out' && /me aguarde um minuto/i.test(corpo(l[k]))) { iEspera = k; break } }

  if (iEspera >= 0) {
    // Ja avisou que ia mandar o link e ele ainda nao saiu (a pessoa escreveu no meio do minuto): manda agora, a menos que ela tenha recusado
    if (iUltIn > iEspera && recusou(atual) && !aceitou(atual)) return { texto: tirarLink(textoModelo) || 'Tudo bem 🙏', depois: null }
    return { texto: MSG_LINK_CUPOM, depois: null }
  }
  if (iCupom >= 0 && iUltIn > iCupom && aceitou(atual)) {
    // Aceitou o cupom: avisa que vai mandar e o sistema manda o link 1 minuto depois
    return { texto: MSG_ESPERA_CUPOM, depois: MSG_LINK_CUPOM }
  }
  // Ainda nao e hora do link: se o modelo adiantou, tira
  if (temLink) {
    const sobra = tirarLink(textoModelo)
    return { texto: sobra || ('Entendo' + (primeiro && primeiro !== 'voce' ? ', ' + primeiro : '') + '. Se quiser, é só me falar 🙏'), depois: null }
  }
  return { texto: textoModelo, depois: null }
}

function tirarLink(t: string): string {
  return t.split(/\n{2,}/).filter(function(x) { return x.trim() && x.indexOf(LINK_CUPOM_EXPRESS_ID) < 0 && !/link (do )?cupom|assim que (finalizar|concluir|fizer o pagamento)/i.test(x) }).join('\n\n').trim()
}

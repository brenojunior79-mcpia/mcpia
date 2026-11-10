// Despedida do assistente: usada para encerrar (marcar como lida e finalizar) a conversa.
// A resposta do assistente foi uma despedida (encerrou a conversa)? Curta, sem pergunta e com "Deus abencoe", "ate mais", "e so chamar"...
const DESPEDIDA_FIM_RE = /(aben[cç]oe|at[eé] mais|qualquer (coisa|d[uú]vida)|[eé] s[oó] (me )?chamar|bons estudos|boa sorte|tamo junto|por nada|de nada|fique com deus|bora prosperar|fico [àa] disposi[cç][aã]o|estou aqui para ajudar|quando voc[eê] (voltar|chegar))/i
export function ehDespedida(texto: string): boolean {
  const t = String(texto || '').replace(/\[\[PARTE\]\]/g, ' ').trim()
  return t.length > 0 && t.length <= 220 && t.indexOf('?') < 0 && DESPEDIDA_FIM_RE.test(t)
}


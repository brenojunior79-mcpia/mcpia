// Tira das respostas do Junior o jeito de "robo/IA" (ordem do Breno): frases de enfeite, abertura de "Perfeito!", "Fico feliz em saber...",
// "Estou aqui para ajudar", "Qualquer duvida...", "Parece que voce esta compartilhando...", despedidas repetidas e emojis demais.
// Funciona frase por frase; se sobrar nada, devolve o texto original (nunca deixa a resposta vazia).

const AVISOS = [
  'Me avisa quando fizer.',
  'Fez? Me conta.',
  'Quando fizer, me fala.',
  'Consegue fazer? Me avisa.',
  'Me conta quando terminar.',
]

function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }

// Pedido para a pessoa avisar que fez o passo (varia as palavras em vez de repetir sempre a mesma frase)
export function pedidoDeAviso(seed: string): string { return AVISOS[hash(String(seed || '')) % AVISOS.length] }

const REMOVER_SEMPRE: RegExp[] = [
  /^(fico|ficamos)\s+(muito\s+|t[aã]o\s+)?feliz/i,
  /^que\s+bom(\s+que|\s+saber)?\b/i,
  /^(estou|estarei|continuo|ficarei|sigo)\s+(aqui|por\s+aqui|[àa]\s+disposi[cç][aã]o|pronto|pronta|dispon[ií]vel)/i,
  /^(qualquer\s+d[uú]vida|se\s+(precisar|tiver|surgir|quiser|ficar)|caso\s+(precise|tenha|surja))\b/i,
  /^(espero\s+(ter\s+)?ajudado|conte\s+comigo|pode\s+(contar\s+comigo|me\s+chamar\s+quando\s+quiser)|fico\s+[àa]\s+disposi)/i,
  /^parece\s+que\s+(voc[eê]|vc)\s+est[aá]\s+(compartilhando|me\s+(enviando|mandando|passando))/i,
  /^(como|em\s+que)\s+posso\s+(te\s+)?ajudar/i,
  /^posso\s+ajudar\s+(com|em)\s+algo/i,
  /^vamos\s+(juntos|resolver\s+isso|tentar\s+(outra\s+abordagem|resolver\s+isso)|lá|la)\b/i,
  /^(sem\s+problemas?|um\s+momento,?\s+por\s+favor|por\s+nada|de\s+nada)\b/i,
  /^(compreendo|entendo\s+(que|sua|perfeitamente|sim)|entendi,?\s+obrigad[oa]\s+por\s+me\s+contar)/i,
  /^(claro,?\s+vou\s+te\s+ajudar|ótima\s+pergunta|otima\s+pergunta|boa\s+pergunta|com\s+certeza!?$)/i,
  /^(at[eé]\s+(mais|logo)|tenha\s+um\s+(ótimo|bom|otimo)|um\s+abra[cç]o)/i,
  /^aqui\s+est[aã]o\s+algumas\s+sugest/i,
  /^agora\s+siga\s+(este|esse|estes|esses)\s+passos?/i,
  /\b(estarei|estou)\s+(aqui|por\s+aqui)\s+(para|pra|se|quando)\b/i,
  /^am(a|ã)nh(a|ã)\s+estarei/i,
]

// So depois da primeira mensagem da conversa
const REMOVER_SE_JA_FALOU: RegExp[] = [
  /^deus\s+aben[cç]oe/i,
  /^a\s+paz\s+do\s+senhor/i,
]

// Abertura de interjecao no comeco da resposta ("Perfeito, ...", "Otimo! ...", "Entendi, Elza. ...")
const ABERTURA = /^(?:[Pp]erfeito|[ÓóOo]timo|[Ee]xcelente|[Mm]aravilha|[Cc]erto|[Cc]ombinado|[Ee]ntendi|[Ee]ntendido|[Bb]eleza|[Ss]how)\s*(?:[,.!:]\s*|\s+-\s+)(?:[A-ZÀ-Ú][a-zà-ú]+\s*[,.!]\s*)?/

const EMOJIS_ENFEITE = /\u2728|\uD83C\uDF89|\uD83C\uDF8A|\uD83C\uDF1F|\uD83D\uDCAB|\uD83E\uDD73|\uD83D\uDE80|\uD83D\uDCAA|\uD83C\uDF08|\uD83D\uDD25|\uD83D\uDC4F/g
const EMOJI_QUALQUER = /[☀-➿]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g

function frases(linha: string): string[] {
  return linha.split(/(?<=[.!?…])\s+/).filter(function(f) { return f.trim() })
}

export function humanizarResposta(texto: string, opts?: { jaFalou?: boolean; jaPerguntouDasAulas?: boolean; primeiroNome?: string }): string {
  const original = String(texto || '')
  try {
    const jaFalou = !!(opts && opts.jaFalou)
    const jaPerg = !!(opts && opts.jaPerguntouDasAulas)
    let t = original
    // 1) "Quando fizer isso, me avise aqui que eu te mando o proximo passo": varia as palavras
    t = t.replace(/(?:Quando|Assim que)\s+(?:voc[eê]\s+)?fizer\s+isso,?\s+me\s+avis[ae]\s+(?:aqui\s+)?que\s+eu\s+te\s+mando\s+o\s+pr[oó]ximo\s+passo\.?/gi, pedidoDeAviso(t))
    // 2) frase por frase
    const linhas = t.split('\n')
    let primeira = true
    const saida: string[] = []
    for (const linha of linhas) {
      if (!linha.trim() || /\[\[[A-Z_]+/.test(linha) || /https?:\/\//i.test(linha) && frases(linha).length === 1) { saida.push(linha); if (linha.trim()) primeira = false; continue }
      const mantidas: string[] = []
      let tirou = false
      for (let f of frases(linha)) {
        const x = f.trim()
        const solto = x.replace(EMOJI_QUALQUER, '').trim()
        if (!solto) { if (!tirou) mantidas.push(x); continue }
        if (REMOVER_SEMPRE.some(function(r) { return r.test(solto) })) { tirou = true; continue }
        if (jaFalou && REMOVER_SE_JA_FALOU.some(function(r) { return r.test(solto) })) { tirou = true; continue }
        if (jaPerg && /(como\s+(est[aã]o|est[aá])\s+(indo\s+)?(as\s+aulas|a\s+plataforma)|(como\s+)?voc[eê]\s+est[aá]\s+indo\s+(l[aá]\s+)?na\s+plataforma|j[aá]\s+conseguiu\s+acessar)/i.test(solto)) continue
        if (/^no\s+entanto,?\s+posso\s+ajudar\s+apenas/i.test(solto)) { mantidas.push('Isso foge do que eu consigo te ajudar por aqui. Se for sobre a mentoria, pode falar.'); continue }
        if (primeira && mantidas.length === 0) {
          const semAbertura = x.replace(ABERTURA, '')
          if (semAbertura !== x) { if (!semAbertura.replace(EMOJI_QUALQUER, '').trim()) { tirou = true; continue }; f = semAbertura.charAt(0).toUpperCase() + semAbertura.slice(1) }
        }
        mantidas.push(f.trim())
      }
      if (mantidas.length) { saida.push(mantidas.join(' ')); primeira = false }
    }
    t = saida.join('\n').replace(/\n{3,}/g, '\n\n').trim()
    // 3) emojis: sem os de enfeite e no maximo 2 por mensagem
    t = t.replace(EMOJIS_ENFEITE, '')
    let n = 0
    t = t.replace(EMOJI_QUALQUER, function(m) { n++; return n > 2 ? '' : m })
    t = t.replace(/[ \t]{2,}/g, ' ').replace(/ +([.,;:!?])/g, '$1').replace(/ +\n/g, '\n').replace(/^\s*[,.;:!]\s*/, '').trim()
    // Sobrou so enfeite / nada: mantem o original para nao mandar mensagem vazia
    if (t.replace(EMOJI_QUALQUER, '').replace(/\s/g, '').length < 3) return /como\s+posso\s+(te\s+)?ajudar|parece\s+que\s+(voc[eê]|vc)/i.test(original) ? 'Me conta melhor o que você precisa?' : /^\s*(de\s+nada|por\s+nada)|fico\s+(muito\s+)?feliz/i.test(original) ? 'Imagina! 🙏' : /^\s*que\s+bom/i.test(original) ? 'Boa! 🙏' : original
    return t
  } catch (e) {
    console.error('[humano]', e)
    return original
  }
}

// Regra de estilo para o prompt do modelo (o filtro acima e a rede de seguranca)
export const REGRA_ESTILO_HUMANO = `JEITO DE PESSOA, NAO DE ROBO (PRIORIDADE MAXIMA): escreva como uma pessoa de verdade no WhatsApp. NUNCA use estas frases de IA nem parecidas: "Fico feliz em saber...", "Que bom que...", "Que bom!", "Estou aqui para ajudar", "Estarei aqui para te ajudar", "Qualquer duvida, estou a disposicao", "Pode me chamar quando quiser", "Espero ter ajudado", "Conte comigo", "Vamos juntos", "Vamos resolver isso", "Vamos la", "Sem problemas", "Claro, vou te ajudar", "Com certeza!", "Otima pergunta", "Compreendo", "Entendi, obrigado por me contar", "Parece que voce esta compartilhando...", "Como posso te ajudar com...", "Um momento, por favor", "Ate mais", "Aqui estao algumas sugestoes". Nao abra a resposta com "Perfeito!", "Otimo!", "Entendi!", "Certo!" nem com o nome da pessoa. Va direto ao assunto (responda o que ela disse e mande o proximo passo ou a pergunta). Nao se despeca em toda mensagem e nao repita "Deus abencoe" nem "A paz do Senhor" depois da primeira mensagem. Nao repita uma pergunta que ja fez (ex.: "como estao indo as aulas?"). No maximo 1 emoji por mensagem e nunca emoji de festa (✨🎉🚀💪). Para pedir que a pessoa avise que fez o passo, use poucas palavras e varie ("Me avisa quando fizer.", "Fez? Me conta.", "Consegue fazer? Me fala."), nunca sempre a mesma frase.`

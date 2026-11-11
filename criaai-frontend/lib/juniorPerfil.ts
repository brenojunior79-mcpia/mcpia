// Espelhamento (ordem do Breno): o Junior le como a pessoa escreve (tom, palavras, tamanho, emojis, jeito de tratar)
// e responde parecido com ela, como alguem do mesmo "jeito". Aqui o sistema mede os sinais; o modelo aplica.
// As regras de seguranca e de conteudo do Junior continuam valendo (nada de inventar, copiar erro, xingamento etc.).

const TRATAMENTOS = ['irmão', 'irmã', 'irmao', 'irma', 'amiga', 'amigo', 'querida', 'querido', 'meu bem', 'minha filha', 'meu filho', 'mano', 'parceiro', 'moça', 'moço', 'jovem', 'doutor', 'doutora', 'dona', 'seu']
const RELIGIOSO = /(deus|amém|amem|paz do senhor|gra[cç]as a deus|jesus|aben[cç]oe|gl[oó]ria|aleluia)/i
const ABREV = /\b(vc|vcs|tb|tbm|blz|pq|obg|vlw|msm|cmg|td|tds|pfv|pf|msg|q|n)\b/i
const RISO = /(k{3,}|\brs+\b|haha|hehe|rsrs)/i
const EMOJI = /[\u2600-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g

function pct(a: number, b: number): number { return b > 0 ? Math.round((a / b) * 100) : 0 }

export function blocoPerfilPessoa(linhas: any[]): string {
  try {
    const textos: string[] = []
    let audios = 0
    for (let i = linhas.length - 1; i >= 0 && textos.length < 14; i--) {
      const m = linhas[i]
      if (m.direction !== 'in') continue
      if (m.type !== 'text' && m.type !== 'audio') continue
      const t = String(m.body || '').replace(/^\[audio transcrito\]\s*/i, '').trim()
      if (!t) continue
      if (m.type === 'audio') audios++
      textos.push(t)
    }
    if (textos.length === 0) return ''
    const n = textos.length
    const totalPalavras = textos.reduce(function(s, t) { return s + t.split(/\s+/).length }, 0)
    const mediaPalavras = Math.round(totalPalavras / n)
    let comEmoji = 0, comRiso = 0, comAbrev = 0, semMaiuscula = 0, semPontoFinal = 0, comExclama = 0, gritando = 0, comReligioso = 0, comSenhor = 0
    const emojis: Record<string, number> = {}
    const tratos: Record<string, number> = {}
    for (const t of textos) {
      const em = t.match(EMOJI) || []
      if (em.length) comEmoji++
      for (const e of em) emojis[e] = (emojis[e] || 0) + 1
      if (RISO.test(t)) comRiso++
      if (ABREV.test(t)) comAbrev++
      if (/^[a-zà-ú]/.test(t)) semMaiuscula++
      if (!/[.!?…]$/.test(t.replace(/(?:[\u2600-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]|\s)+$/g, ''))) semPontoFinal++
      if (/!/.test(t)) comExclama++
      const letras = t.replace(/[^A-Za-zÀ-ú]/g, '')
      if (letras.length >= 8 && letras === letras.toUpperCase()) gritando++
      if (RELIGIOSO.test(t)) comReligioso++
      if (/\b(o senhor|a senhora|senhor|senhora)\b/i.test(t) && !/paz do senhor|deus|jesus/i.test(t.toLowerCase())) comSenhor++
      const baixo = t.toLowerCase()
      for (const tr of TRATAMENTOS) { if (new RegExp('(^|[^a-zà-ú])' + tr + '([^a-zà-ú]|$)', 'i').test(baixo)) tratos[tr] = (tratos[tr] || 0) + 1 }
    }
    const topEmojis = Object.keys(emojis).sort(function(a, b) { return emojis[b] - emojis[a] }).slice(0, 3)
    const topTratos = Object.keys(tratos).sort(function(a, b) { return tratos[b] - tratos[a] }).slice(0, 2)

    const sinais: string[] = []
    sinais.push('Tamanho: escreve ' + (mediaPalavras <= 4 ? 'MUITO curto (' + mediaPalavras + ' palavras por mensagem em media)' : mediaPalavras <= 12 ? 'curto (cerca de ' + mediaPalavras + ' palavras por mensagem)' : 'mensagens mais longas (cerca de ' + mediaPalavras + ' palavras)') + (audios > 0 ? '; manda audio (fala solta, do jeito que fala)' : ''))
    sinais.push('Emojis: ' + (comEmoji === 0 ? 'NAO usa' : pct(comEmoji, n) >= 50 ? 'usa bastante' + (topEmojis.length ? ' (' + topEmojis.join(' ') + ')' : '') : 'usa de vez em quando' + (topEmojis.length ? ' (' + topEmojis.join(' ') + ')' : '')))
    sinais.push('Risadas (kkk, rs): ' + (comRiso > 0 ? 'usa' : 'nao usa'))
    sinais.push('Abreviacoes (vc, tb, blz...): ' + (comAbrev > 0 ? 'usa' : 'nao usa'))
    sinais.push('Escrita: ' + (pct(semMaiuscula, n) >= 60 ? 'tudo em minuscula, jeito solto' : 'comeca frases com maiuscula') + '; ' + (pct(semPontoFinal, n) >= 60 ? 'quase nunca coloca ponto final' : 'usa pontuacao') + (comExclama > 0 ? '; usa exclamacao' : '') + (gritando > 0 ? '; escreve em CAIXA ALTA (esta animada ou irritada: leia o contexto)' : ''))
    sinais.push('Tratamento: ' + (comSenhor > 0 ? 'trata de "senhor/senhora" (formal e respeitosa)' : topTratos.length ? 'usa "' + topTratos.join('", "') + '"' : 'sem tratamento especial'))
    sinais.push('Religiosa: ' + (comReligioso > 0 ? 'SIM, fala de Deus/Jesus/amem (pode devolver no mesmo tom, como "Amem" ou "Deus abencoe", sem exagero)' : 'nao apareceu'))

    return [
      'COMO FALAR COM ESTA PESSOA (PRIORIDADE ALTA, ESPELHAMENTO): analise as mensagens dela acima e fale do JEITO DELA, como se fosse alguem do mesmo perfil, para ela se sentir em casa. Copie o TOM (animado, calmo, seco, carinhoso, respeitoso, brincalhao), o NIVEL de formalidade, o jeito de tratar (senhor/senhora, irma, amiga...), as palavras e expressoes que ela mesma usa, o uso de emojis e o tamanho das mensagens (ela escreve curto: voce responde curto; ela escreve mais: pode dar um pouco mais, ainda curto e um passo por vez).',
      'Sinais medidos nas ultimas ' + n + ' mensagens dela:',
      '- ' + sinais.join('\n- '),
      'LIMITES DO ESPELHAMENTO: (1) nunca copie erro de escrita, giria pesada, palavrao, grosseria ou agressividade; fale simples e correto no jeito dela; (2) se ela estiver chateada, ansiosa ou perdida, responda com calma e acolhimento, sem imitar o nervosismo; (3) se ela for formal ou idosa, seja respeitoso e claro; se for solta e jovem, seja leve e informal; (4) com pouca conversa (1 ou 2 mensagens), apenas acompanhe o tom dela sem exagerar; (5) mantenha TODAS as outras regras (curto e direto, um passo por vez, nao inventar, regras de plano e pagamento) e nunca diga que esta imitando ela.',
    ].join('\n')
  } catch (e) {
    return ''
  }
}

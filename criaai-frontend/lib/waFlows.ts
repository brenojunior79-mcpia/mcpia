// Fluxos de automacao do WhatsApp (respostas automaticas por gatilho)
export type Gatilho = 'primeira' | 'palavra' | 'qualquer'
export type Fluxo = {
  id?: string
  name: string
  enabled: boolean
  trigger: Gatilho
  keywords: string[]
  match: 'contem' | 'igual'
  when_hours: 'sempre' | 'dentro' | 'fora'
  message: string
  cooldown_hours: number
}

export const GATILHOS: { k: Gatilho; nome: string; desc: string }[] = [
  { k: 'primeira', nome: 'Primeira mensagem de um contato novo', desc: 'Dispara só uma vez, quando alguém escreve pela primeira vez.' },
  { k: 'palavra', nome: 'Mensagem com palavra-chave', desc: 'Dispara quando a pessoa escreve uma das palavras que você definir.' },
  { k: 'qualquer', nome: 'Qualquer mensagem recebida', desc: 'Dispara a cada mensagem, respeitando o intervalo entre avisos.' },
]

export const VAZIO: Fluxo = { name: '', enabled: true, trigger: 'palavra', keywords: [], match: 'contem', when_hours: 'sempre', message: '', cooldown_hours: 12 }

// Tira acentos, deixa minusculo e remove pontuacao para comparar textos
export function limpa(t: any): string {
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function casaPalavra(texto: string, keywords: string[], match: string): boolean {
  const t = limpa(texto)
  if (!t) return false
  for (const k of keywords) {
    const w = limpa(k)
    if (!w) continue
    if (match === 'igual' ? t === w : (' ' + t + ' ').indexOf(' ' + w + ' ') >= 0 || (w.indexOf(' ') < 0 && t.indexOf(w) >= 0 && w.length >= 4)) return true
  }
  return false
}

// Troca {{nome}} pelo primeiro nome; sem nome, tira a variavel sem deixar virgula solta
export function aplicaNome(msg: string, nome: string): string {
  if (nome) return msg.replace(/\{\{\s*nome\s*\}\}/gi, nome)
  return msg.replace(/[ ]?\{\{\s*nome\s*\}\}/gi, '').replace(/ ([!,.?])/g, '$1').replace(/,([!.?])/g, '$1')
}

// Aceita qualquer coisa vinda da tela e devolve um fluxo valido (ou o motivo de recusar)
export function validarFluxo(input: any): { ok: true; fluxo: Fluxo } | { ok: false; erro: string } {
  const name = String(input?.name || '').trim().slice(0, 80)
  if (!name) return { ok: false, erro: 'Dê um nome ao fluxo.' }
  const trigger: Gatilho = input?.trigger === 'primeira' || input?.trigger === 'qualquer' ? input.trigger : 'palavra'
  const keywords: string[] = Array.isArray(input?.keywords) ? input.keywords.map(function(x: any) { return String(x || '').trim().slice(0, 60) }).filter(Boolean).slice(0, 30) : []
  if (trigger === 'palavra' && keywords.length === 0) return { ok: false, erro: 'Escreva pelo menos uma palavra-chave.' }
  const message = String(input?.message || '').trim().slice(0, 1000)
  if (!message) return { ok: false, erro: 'Escreva a mensagem que será enviada.' }
  const c = Number(input?.cooldown_hours)
  return {
    ok: true,
    fluxo: {
      name, enabled: input?.enabled !== false, trigger, keywords: trigger === 'palavra' ? keywords : [],
      match: input?.match === 'igual' ? 'igual' : 'contem',
      when_hours: input?.when_hours === 'dentro' || input?.when_hours === 'fora' ? input.when_hours : 'sempre',
      message, cooldown_hours: c >= 1 && c <= 72 ? Math.round(c) : 12,
    },
  }
}

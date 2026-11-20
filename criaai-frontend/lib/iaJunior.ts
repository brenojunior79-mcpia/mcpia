// "Cerebro" do Junior: gera a resposta com o Claude Haiku (Anthropic).
// Se o Claude falhar (sem chave, sem credito, fora do ar ou recusar), cai na OpenAI (gpt-4o-mini), como era antes.
// Assim o Junior nunca fica sem responder por causa da troca.
import Anthropic from '@anthropic-ai/sdk'

export const MODELO_JUNIOR = 'claude-haiku-5-5'

// Mensagem no formato que o codigo do Junior ja usa (o mesmo da OpenAI):
// content = texto, ou lista com {type:'text', text} e {type:'image_url', image_url:{url:'data:image/png;base64,...'}}
export type MsgJunior = { role: 'user' | 'assistant'; content: any }

export type RespostaJunior = { ok: boolean; texto: string; status: number; motivo: string; via: 'claude' | 'openai' }

let cliente: Anthropic | null = null
// Ordem do Breno: a OpenAI e a principal (18/11/2026) e o Claude fica de RESERVA (20/11/2026): so responde quando a OpenAI falhar
// (sem credito, fora do ar). Para o Claude voltar a ser o principal, mude USAR_CLAUDE para true.
const USAR_CLAUDE = false

function claude(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!cliente) cliente = new Anthropic({ maxRetries: 1 })
  return cliente
}

// Converte uma mensagem do formato da OpenAI para o formato do Claude
function paraClaude(m: MsgJunior): Anthropic.MessageParam {
  if (typeof m.content === 'string') return { role: m.role, content: m.content || '...' }
  const blocos: Anthropic.ContentBlockParam[] = []
  for (const p of (Array.isArray(m.content) ? m.content : [])) {
    if (p?.type === 'text' && String(p.text || '').trim()) blocos.push({ type: 'text', text: String(p.text) })
    else if (p?.type === 'image_url') {
      const url = String(p.image_url?.url || '')
      const mm = url.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/)
      if (mm) blocos.push({ type: 'image', source: { type: 'base64', media_type: (mm[1] === 'image/jpg' ? 'image/jpeg' : mm[1]) as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif', data: mm[2] } })
    }
  }
  if (!blocos.length) blocos.push({ type: 'text', text: '...' })
  return { role: m.role, content: blocos }
}

// O Claude pede conversa alternando pessoa / Junior e comecando pela pessoa
function arrumar(msgs: MsgJunior[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = []
  for (const m of msgs) {
    const c = paraClaude(m)
    const ult = out[out.length - 1]
    if (ult && ult.role === c.role) {
      const a = typeof ult.content === 'string' ? [{ type: 'text', text: ult.content } as Anthropic.ContentBlockParam] : ult.content
      const b = typeof c.content === 'string' ? [{ type: 'text', text: c.content } as Anthropic.ContentBlockParam] : c.content
      ult.content = [...a, ...b]
    } else out.push(c)
  }
  if (out.length && out[0].role !== 'user') out.unshift({ role: 'user', content: '(inicio da conversa)' })
  return out
}

async function viaOpenAI(system: string, msgs: MsgJunior[], maxTokens: number, temperatura: number, timeoutMs: number): Promise<RespostaJunior> {
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: system }, ...msgs], max_tokens: maxTokens, temperature: temperatura }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const j: any = await r.json().catch(function() { return null })
    const texto = String(j?.choices?.[0]?.message?.content || '').trim()
    return { ok: r.ok && !!texto, texto, status: r.status, motivo: r.ok ? '' : JSON.stringify(j?.error || '').slice(0, 300), via: 'openai' }
  } catch (e: any) {
    return { ok: false, texto: '', status: 0, motivo: String(e?.message || e).slice(0, 200), via: 'openai' }
  }
}

async function viaClaude(system: string, msgs: MsgJunior[], maxTokens: number, timeoutMs: number): Promise<RespostaJunior | null> {
  const c = claude()
  if (!c) return null
  try {
    const resp = await c.messages.create({
      model: MODELO_JUNIOR,
      max_tokens: Math.max(maxTokens, 1500), // folga para o raciocinio interno; o tamanho da resposta e controlado pelo prompt
      system,
      messages: arrumar(msgs),
      output_config: { effort: 'low' },
    }, { timeout: timeoutMs })
    if (resp.stop_reason === 'refusal') { console.error('[junior-ia] Claude recusou'); return null }
    const texto = resp.content.map(function(b) { return b.type === 'text' ? b.text : '' }).join('').trim()
    if (texto) { console.log('[junior-ia] respondeu via Claude ' + MODELO_JUNIOR); return { ok: true, texto, status: 200, motivo: '', via: 'claude' } }
    console.error('[junior-ia] Claude sem texto (' + resp.stop_reason + ')')
  } catch (e: any) {
    const st = e instanceof Anthropic.APIError ? e.status : 0
    // So o tipo e a mensagem de erro da Anthropic (nunca o conteudo da conversa)
    const det = e instanceof Anthropic.APIError ? String((e as any).error?.error?.type || '') + ': ' + String((e as any).error?.error?.message || '').slice(0, 160) : ''
    console.error('[junior-ia] Claude falhou (' + st + ') ' + det)
  }
  return null
}

// variar = true quando a primeira resposta saiu repetida e queremos outras palavras
export async function responderJunior(p: { system: string; msgs: MsgJunior[]; maxTokens?: number; variar?: boolean; timeoutMs?: number }): Promise<RespostaJunior> {
  const maxTokens = p.maxTokens || 800
  const timeoutMs = p.timeoutMs || 30000
  const temperatura = p.variar ? 0.7 : 0.2
  if (USAR_CLAUDE) {
    const c = await viaClaude(p.system, p.msgs, maxTokens, timeoutMs)
    if (c) return c
    return viaOpenAI(p.system, p.msgs, maxTokens, temperatura, timeoutMs)
  }
  // OpenAI principal; se falhar (ex.: sem credito), o Claude responde de reserva
  const o = await viaOpenAI(p.system, p.msgs, maxTokens, temperatura, timeoutMs)
  if (o.ok) return o
  console.error('[junior-ia] OpenAI falhou (' + o.status + '); usando o Claude de reserva')
  const c = await viaClaude(p.system, p.msgs, maxTokens, timeoutMs)
  return c || o
}

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { usuarioCriativo } from '@/lib/criativoAuth'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BLOCOS = ['gancho', 'corpo', 'mecanismo', 'cta'] as const
type Bloco = typeof BLOCOS[number]

const TONS: Record<string, string> = {
  direto: 'direto, simples e persuasivo, como quem conversa com um amigo',
  emocional: 'emocional, humano e acolhedor, que toca na dor e na esperanca da pessoa',
  urgente: 'urgente, com senso de escassez e acao imediata, sem exagerar',
  autoridade: 'seguro e com autoridade, de quem entende do assunto',
  humor: 'leve, descontraido e com bom humor',
}

const clean = (v: any, n = 400) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n)

export async function POST(req: NextRequest) {
  const u = await usuarioCriativo()
  if (!u) return NextResponse.json({ error: 'Este recurso esta em atualizacao no momento.' }, { status: 403 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI nao configurada.' }, { status: 500 })

  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const produto = clean(b.produto, 150)
  const oQueFaz = clean(b.oQueFaz, 500)
  const publico = clean(b.publico, 300)
  const dor = clean(b.dor, 400)
  if (!produto || !oQueFaz || !publico || !dor) return NextResponse.json({ error: 'Responda as 4 perguntas para gerar o roteiro.' }, { status: 400 })

  const tom = TONS[String(b.tom)] || TONS.direto
  const segundos = Math.min(90, Math.max(15, parseInt(b.duracao, 10) || 30))
  const palavras = Math.round(segundos * 2.5) // ~150 palavras por minuto falado

  const bloco: Bloco | null = BLOCOS.includes(b.bloco) ? b.bloco : null
  const atual = b.atual && typeof b.atual === 'object' ? b.atual : {}

  const ficha = [
    'Produto: ' + produto, 'O que o produto faz: ' + oQueFaz,
    'Para quem e o produto: ' + publico, 'Maior dor que o produto resolve: ' + dor,
  ].filter(Boolean).join('\n')

  const sistema =
    'Voce e um copywriter brasileiro especialista em criativos de video para anuncios (Meta Ads, TikTok, Reels), estilo UGC. ' +
    'Escreve o roteiro FALADO de um video em portugues do Brasil, em 4 blocos: ' +
    'gancho (primeiros 3 segundos: prende a atencao, fala da dor ou de uma promessa forte), ' +
    'corpo (desenvolve o problema e leva ate a solucao, com historia e identificacao), ' +
    'mecanismo (explica de forma simples COMO o produto resolve e por que e diferente), ' +
    'cta (chamada final clara para a acao). ' +
    'Regras: texto 100% para ser narrado em voz alta, frases curtas, linguagem do dia a dia, sem emojis, sem hashtags, sem markdown, sem indicacoes de cena ou de camera, sem aspas. ' +
    'Deduza o nicho, o resultado esperado e o mecanismo a partir da ficha. Nao invente numeros, depoimentos, premios ou garantias que nao estejam na ficha. Nao prometa cura, ganho de dinheiro garantido ou resultados milagrosos. ' +
    'Tom: ' + tom + '. Tamanho total aproximado: ' + palavras + ' palavras (cerca de ' + segundos + ' segundos falados).'

  const usuario = bloco
    ? 'Ficha:\n' + ficha + '\n\nRoteiro atual:\n' + JSON.stringify({ gancho: clean(atual.gancho, 1500), corpo: clean(atual.corpo, 2500), mecanismo: clean(atual.mecanismo, 1500), cta: clean(atual.cta, 800) }) +
      '\n\nReescreva SOMENTE o bloco "' + bloco + '" com uma versao diferente e melhor, mantendo coerencia com os outros blocos. Responda apenas JSON: {"' + bloco + '": "..."}'
    : 'Ficha:\n' + ficha + '\n\nResponda apenas JSON: {"gancho":"...","corpo":"...","mecanismo":"...","cta":"..."}'

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.85,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: sistema }, { role: 'user', content: usuario }],
    })
    const j = JSON.parse(r.choices[0]?.message?.content || '{}')
    const out: Record<string, string> = {}
    for (const k of (bloco ? [bloco] : BLOCOS)) out[k] = String(j[k] || '').trim()
    if (Object.values(out).some(function(v) { return !v })) return NextResponse.json({ error: 'A IA nao devolveu o roteiro completo. Tente de novo.' }, { status: 502 })
    // Roteiro completo novo: guarda no historico da pessoa (se falhar, o roteiro ainda aparece)
    let id: string | null = null
    if (!bloco) {
      try {
        const ins = await createClient().from('criativo_roteiros').insert({ user_id: u.id, produto, o_que_faz: oQueFaz, publico, dor, gancho: out.gancho, corpo: out.corpo, mecanismo: out.mecanismo, cta: out.cta }).select('id').single()
        if (ins.error) console.error('[criativo/roteiro] historico:', ins.error.message)
        else id = (ins.data as any).id
      } catch (e) { console.error('[criativo/roteiro] historico:', e) }
    }
    return NextResponse.json({ ...out, id })
  } catch (e: any) {
    console.error('[criativo/roteiro]', e?.message || e)
    return NextResponse.json({ error: 'Nao foi possivel gerar o roteiro agora. Tente de novo.' }, { status: 502 })
  }
}

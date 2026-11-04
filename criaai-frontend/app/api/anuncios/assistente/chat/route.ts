import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { ORCAMENTO_MAX, ORCAMENTO_MIN, faltando, graph, limparRascunho, rascunhoVazio, usuarioAssistente } from '@/lib/anunciosAssistente'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 40

function prompt(paginas: any[], pixels: any[], rascunho: any, temMidia: boolean): string {
  return [
    'Voce e a Camila, gestora de anuncios da Plataforma Cristao Prospero. Voce conversa por VOZ com uma pessoa leiga e a ajuda a criar um anuncio de VENDAS no Facebook e Instagram.',
    'Sua fala sera lida em voz alta: use palavras simples, frases curtas (no maximo 3), sem emojis, sem listas, sem simbolos e sem enderecos de internet. Seja simpatica e acolhedora, como uma amiga paciente.',
    'Faca UMA pergunta de cada vez e espere a resposta. Se a pessoa nao souber responder, sugira uma opcao e pergunte "pode ser?". Nunca invente dados da pessoa.',
    'Ordem das perguntas: 1) qual produto vai anunciar; 2) objetivo (por enquanto so existe anuncio de vendas; se pedir outro objetivo, explique com carinho que por enquanto so faz vendas); 3) qual pagina do Facebook aparece no anuncio; 4) qual pixel; 5) qual o link da pagina de vendas (peca para ela colar no campo de texto, porque link nao da para falar); 6) o video ou imagem (peca para tocar no botao "Anexar video ou imagem"); 7) quanto quer gastar por dia; 8) publico (idade e se e para homens, mulheres ou todos; se nao souber, sugira 25 a 55 anos, todos); 9) titulo e legenda (voce escreve uma sugestao baseada no produto e pergunta se ela gostou).',
    'Orcamento: sugira R$ 10 por dia para quem esta comecando. O minimo aceito e R$ ' + ORCAMENTO_MIN + ' e o maximo R$ ' + ORCAMENTO_MAX + ' por dia.',
    'Titulo: ate 40 caracteres. Legenda: o texto principal do anuncio, ate 300 caracteres, convidativa, sem prometer ganhos nem resultados garantidos. Botao: use LEARN_MORE por padrao (SHOP_NOW se for compra direta; SIGN_UP se for cadastro).',
    'PAGINAS disponiveis (use o id no campo paginaId): ' + (paginas.length ? JSON.stringify(paginas) : 'NENHUMA. Explique que ela precisa ter uma pagina no Facebook e conectar de novo.'),
    'PIXELS disponiveis (use o id no campo pixelId): ' + (pixels.length ? JSON.stringify(pixels) : 'NENHUM. Explique que sem o pixel o Facebook nao consegue otimizar para vendas e que ela precisa criar um pixel no Facebook.'),
    'Se houver uma unica pagina ou um unico pixel, sugira esse e pergunte se pode usar. Se houver varios, fale os nomes e pergunte qual.',
    'Estado atual do anuncio (rascunho): ' + JSON.stringify(rascunho) + '. Video ou imagem anexado: ' + (temMidia ? 'SIM' : 'NAO') + '.',
    'Quando tudo estiver preenchido e a midia anexada, diga que o resumo esta na tela, que o anuncio sera criado PAUSADO para ela conferir antes de gastar, e pergunte se pode criar. Nunca diga que ja criou: quem cria e o botao da tela.',
    'Responda SOMENTE um JSON com os campos: "fala" (texto que voce vai falar) e "rascunho" (objeto com TODOS estes campos atualizados, null quando ainda nao souber: produto, paginaId, pixelId, link, orcamentoDiario (numero em reais), idadeMin, idadeMax, genero ("todos", "mulheres" ou "homens"), titulo, legenda, botao).',
  ].join('\n')
}

export async function POST(req: NextRequest) {
  const u = await usuarioAssistente()
  if ('erro' in u) return NextResponse.json({ error: u.erro }, { status: u.status })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI nao configurada.' }, { status: 500 })
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const mensagens: { role: 'user' | 'assistant'; content: string }[] = (Array.isArray(b.mensagens) ? b.mensagens : [])
    .filter(function(m: any) { return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim() })
    .slice(-24)
    .map(function(m: any) { return { role: m.role, content: String(m.content).slice(0, 1500) } })
  if (!mensagens.length || mensagens[mensagens.length - 1].role !== 'user') return NextResponse.json({ error: 'Sem mensagem.' }, { status: 400 })
  const temMidia = !!b.temMidia

  const [pg, px] = await Promise.all([
    graph('me/accounts', u.token, { query: { fields: 'id,name', limit: '50' } }),
    graph(u.conta + '/adspixels', u.token, { query: { fields: 'id,name', limit: '50' } }),
  ])
  const paginas = pg.ok ? ((pg.data.data || []) as any[]).map(function(p) { return { id: String(p.id), nome: String(p.name || p.id) } }) : []
  const pixels = px.ok ? ((px.data.data || []) as any[]).map(function(p) { return { id: String(p.id), nome: String(p.name || p.id) } }) : []
  const atual = limparRascunho(b.rascunho, paginas, pixels, rascunhoVazio())

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0.4, max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: prompt(paginas, pixels, atual, temMidia) }].concat(mensagens as any) as any,
    })
    let j: any = {}
    try { j = JSON.parse(r.choices[0].message.content || '{}') } catch (e) {}
    const novo = limparRascunho(j.rascunho, paginas, pixels, atual)
    const falta = faltando(novo, temMidia)
    let fala = String(j.fala || '').replace(/\s+/g, ' ').trim()
    if (!fala) fala = 'Desculpa, nao entendi direito. Pode repetir?'
    return NextResponse.json({ fala, rascunho: novo, falta, pronto: falta.length === 0, paginas, pixels })
  } catch (e: any) {
    console.error('[anuncios/assistente/chat]', e && e.message ? e.message : e)
    return NextResponse.json({ error: 'Nao consegui responder agora. Tente de novo.' }, { status: 500 })
  }
}

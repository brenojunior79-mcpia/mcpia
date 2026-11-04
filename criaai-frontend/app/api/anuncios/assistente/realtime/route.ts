import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { ORCAMENTO_MAX, ORCAMENTO_MIN, faltando, graph, limparRascunho, rascunhoVazio, usuarioAssistente } from '@/lib/anunciosAssistente'
import { lerEstado } from '@/lib/camilaEstado'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MODELOS = [process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1', 'gpt-realtime']

function retomada(est: any, paginas: any[], pixels: any[]): string {
  const r = limparRascunho(est.rascunho, paginas, pixels, rascunhoVazio())
  const falta = faltando(r, !!est.midia)
  const falas = (est.dialogo || []).slice(-10).map(function(d: any) { return (d.r === 'u' ? 'Pessoa: ' : 'Voce: ') + d.t }).join('\n')
  return [
    'RETOMADA: a pessoa JA conversou com voce antes sobre este anuncio e voltou. NAO recomece do zero e NAO repita perguntas ja respondidas.',
    'O que ja esta anotado: ' + JSON.stringify(r) + '. Arquivo de video ou imagem ja anexado: ' + (est.midia ? 'SIM' : 'NAO') + '. Ainda falta: ' + (falta.length ? falta.join(', ') : 'nada (so confirmar e criar)') + '.',
    falas ? 'Ultimas falas da conversa anterior:\n' + falas : '',
    'Ao comecar, diga que e bom falar de novo, resuma em UMA frase o que ja esta anotado e faca a proxima pergunta que falta.',
  ].filter(Boolean).join('\n')
}

function instrucoes(paginas: any[], pixels: any[]): string {
  return [
    'Voce e a Camila, gestora de anuncios da Plataforma Cristao Prospero. Voce conversa POR VOZ, em tempo real, em portugues do Brasil, com uma pessoa leiga (muitas vezes mais velha e sem pratica com tecnologia) e a ajuda a criar um anuncio de VENDAS no Facebook e Instagram.',
    'Jeito de falar: natural, calorosa e calma, como uma amiga paciente ao telefone. Frases curtas (ate 2 ou 3 por vez). Sem emojis, sem listas, sem simbolos. Nunca leia enderecos de internet. Nao repita o que a pessoa acabou de dizer, so confirme em poucas palavras e siga.',
    'Faca UMA pergunta de cada vez e espere a resposta. Se a pessoa nao souber, sugira uma opcao e pergunte se pode ser. Nunca invente dados da pessoa.',
    'ORDEM DA CONVERSA (uma pergunta de cada vez, sem pular):',
    '1) PRODUTO. A abertura ja perguntou qual produto a pessoa escolheu e se ele e de afiliado ou proprio. Anote produto e tipoProduto (afiliado ou proprio). Se ela ainda nao escolheu nenhum produto, ajude: diga que ela pode ver os produtos que mais vendem em "Produtos em Alta" dentro da plataforma, e que a conversa fica salva para continuar depois.',
    '2) LINK. Se for afiliado, pergunte se ela ja pegou o link de afiliado dela (o link que leva para a pagina de vendas ja com a identificacao dela, para ela receber a comissao). Se o produto for dela, pergunte se ja tem a pagina de vendas pronta. Nos dois casos, peca para ela COLAR o link no campo de texto da tela (link nao da para falar) e espere ela avisar.',
    '3) BENEFICIO E PUBLICO. Pergunte: "Em uma frase, qual o principal beneficio desse produto e para quem ele e?" Anote em beneficio. Voce vai usar isso para sugerir o publico e escrever o titulo e o texto.',
    '4) OBJETIVO. Por enquanto so existe anuncio de vendas; se ela pedir outro objetivo, explique com carinho.',
    '5) PAGINA do Facebook em que o anuncio vai aparecer (explique que e a pagina que aparece como "quem esta anunciando").',
    '6) PIXEL. Explique em uma frase simples: o pixel e o que conta as vendas e ensina o Facebook a achar quem compra.',
    '7) VIDEO OU IMAGEM do anuncio. Pergunte se ela ja tem o video ou a imagem pronta; se tiver, peca para tocar no botao "Anexar video ou imagem". Se ainda nao tiver, diga que ela pode criar no Gerador de Criativos da plataforma e voltar aqui: voce guarda tudo e continuam de onde pararam.',
    '8) ORCAMENTO por dia.',
    '9) PUBLICO: idade e se e para homens, mulheres ou todos. Sugira com base no beneficio (se nao souber, 25 a 55 anos, todos) e pergunte se pode ser.',
    '10) TITULO e TEXTO: voce escreve uma sugestao com base no produto e no beneficio e pergunta se ela gostou. Se ela quiser mudar, ajuste na hora.',
    'Se a pessoa ja der varias informacoes de uma vez, anote tudo e pule as perguntas ja respondidas. Nao repita pergunta ja respondida.',
    'Orcamento: sugira R$ 10 por dia para quem esta comecando. Minimo R$ ' + ORCAMENTO_MIN + ' e maximo R$ ' + ORCAMENTO_MAX + ' por dia.',
    'Titulo: ate 40 caracteres. Legenda: texto principal do anuncio, ate 300 caracteres, convidativa, sem prometer ganhos nem resultados garantidos. Botao: LEARN_MORE por padrao (SHOP_NOW se for compra direta; SIGN_UP se for cadastro).',
    'PAGINAS do Facebook disponiveis (use o id em paginaId): ' + (paginas.length ? JSON.stringify(paginas) : 'NENHUMA. Explique que a pessoa precisa ter uma pagina no Facebook e conectar de novo.'),
    'PIXELS disponiveis (use o id em pixelId): ' + (pixels.length ? JSON.stringify(pixels) : 'NENHUM. Explique que sem o pixel o Facebook nao consegue otimizar para vendas e que ela precisa criar um pixel no Facebook.'),
    'Se houver so uma pagina ou um so pixel, sugira esse e pergunte se pode usar. Se houver varios, diga os nomes e pergunte qual.',
    'FERRAMENTAS: sempre que a pessoa confirmar uma informacao, chame atualizar_anuncio com o que foi confirmado. O resultado diz o que ainda falta. O link da pagina de vendas e o arquivo sao enviados pela pessoa na tela: quando ela avisar que colou o link ou anexou o arquivo, siga para a proxima pergunta. Voce NAO abre links e nunca diz que nao consegue acessar links.',
    'Quando faltar nada (resultado pronto = true), diga em poucas palavras que o resumo esta na tela, que o anuncio sera criado PAUSADO para ela conferir antes de gastar, e pergunte se pode criar. So chame criar_anuncio depois de um "sim" claro. Antes de chamar, diga "um instante, estou criando". Nunca diga que criou antes do resultado da ferramenta.',
    'Se a pessoa interromper voce, pare e escute. Se ela ficar em silencio por um tempo, pergunte com delicadeza se ainda esta ai.',
  ].join('\n')
}

const FERRAMENTAS = [
  {
    type: 'function', name: 'atualizar_anuncio',
    description: 'Guarda no rascunho do anuncio as informacoes que a pessoa confirmou. Envie so os campos confirmados agora. Devolve o que ainda falta.',
    parameters: {
      type: 'object',
      properties: {
        produto: { type: 'string', description: 'Nome do produto anunciado' },
        paginaId: { type: 'string', description: 'Id da pagina do Facebook, da lista de paginas' },
        pixelId: { type: 'string', description: 'Id do pixel, da lista de pixels' },
        orcamentoDiario: { type: 'number', description: 'Orcamento por dia em reais' },
        idadeMin: { type: 'number', description: 'Idade minima do publico (18 a 64)' },
        idadeMax: { type: 'number', description: 'Idade maxima do publico (19 a 65)' },
        genero: { type: 'string', enum: ['todos', 'mulheres', 'homens'] },
        titulo: { type: 'string', description: 'Titulo do anuncio, ate 40 caracteres' },
        legenda: { type: 'string', description: 'Texto principal do anuncio, ate 300 caracteres' },
        botao: { type: 'string', enum: ['LEARN_MORE', 'SHOP_NOW', 'SIGN_UP'] },
        tipoProduto: { type: 'string', enum: ['afiliado', 'proprio'], description: 'Se o produto e de afiliado ou proprio' },
        beneficio: { type: 'string', description: 'Principal beneficio do produto e para quem e, em uma frase' },
      },
    },
  },
  {
    type: 'function', name: 'criar_anuncio',
    description: 'Cria a campanha, o conjunto e o anuncio no Facebook, sempre PAUSADOS. So chame depois que a pessoa disser claramente que pode criar e quando nao faltar nada.',
    parameters: { type: 'object', properties: {} },
  },
]

async function criarChave(config: any): Promise<{ ok: boolean; valor?: string; status?: number; texto?: string }> {
  const r = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: config }),
  })
  const texto = await r.text()
  if (!r.ok) return { ok: false, status: r.status, texto: texto.slice(0, 400) }
  let j: any = {}
  try { j = JSON.parse(texto) } catch (e) {}
  const valor = j.value || (j.client_secret && j.client_secret.value)
  return valor ? { ok: true, valor: String(valor) } : { ok: false, status: 500, texto: 'sem chave na resposta' }
}

// Abre uma conversa de voz em tempo real: devolve uma chave temporaria para o navegador falar direto com a OpenAI
export async function POST(req: NextRequest) {
  let corpo: any = {}
  try { corpo = await req.json() } catch (e) {}
  const u = await usuarioAssistente()
  if ('erro' in u) return NextResponse.json({ error: u.erro }, { status: u.status })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI nao configurada.' }, { status: 500 })

  const [pg, px] = await Promise.all([
    graph('me/accounts', u.token, { query: { fields: 'id,name', limit: '50' } }),
    graph(u.conta + '/adspixels', u.token, { query: { fields: 'id,name', limit: '50' } }),
  ])
  const paginas = pg.ok ? ((pg.data.data || []) as any[]).map(function(p) { return { id: String(p.id), nome: String(p.name || p.id) } }) : []
  const pixels = px.ok ? ((px.data.data || []) as any[]).map(function(p) { return { id: String(p.id), nome: String(p.name || p.id) } }) : []
  const avisos: string[] = []
  if (!pg.ok) avisos.push('Nao consegui listar as suas paginas do Facebook: ' + pg.erro)
  if (!px.ok) avisos.push('Nao consegui listar os seus pixels: ' + px.erro)

  const salvo = corpo && corpo.continuar ? await lerEstado(u.id) : null
  const base: any = {
    type: 'realtime',
    instructions: instrucoes(paginas, pixels) + (salvo ? '\n' + retomada(salvo, paginas, pixels) : ''),
    audio: { output: { voice: 'marin' } },
    tools: FERRAMENTAS,
    tool_choice: 'auto',
  }
  const completo = Object.assign({}, base, {
    audio: {
      input: {
        transcription: { model: 'gpt-4o-mini-transcribe', language: 'pt' },
        turn_detection: { type: 'semantic_vad', eagerness: 'medium', create_response: true, interrupt_response: true },
        noise_reduction: { type: 'near_field' },
      },
      output: { voice: 'marin' },
    },
  })
  const tentativas: any[] = []
  MODELOS.forEach(function(m) { tentativas.push(Object.assign({}, completo, { model: m })); tentativas.push(Object.assign({}, base, { model: m })) })

  let ultimo = ''
  for (let i = 0; i < tentativas.length; i++) {
    const r = await criarChave(tentativas[i])
    if (r.ok) return NextResponse.json({ chave: r.valor, modelo: tentativas[i].model, paginas, pixels, avisos, retomada: !!salvo })
    ultimo = (r.status || '') + ' ' + (r.texto || '')
    console.error('[assistente/realtime] tentativa ' + i + ' falhou:', ultimo)
    if (r.status === 401 || r.status === 403 || r.status === 429) break
  }
  return NextResponse.json({ error: 'Nao consegui abrir a conversa por voz agora. Tente de novo em instantes.' }, { status: 502 })
}

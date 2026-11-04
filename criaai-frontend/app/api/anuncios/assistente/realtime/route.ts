import { NextResponse } from 'next/server'
import { ORCAMENTO_MAX, ORCAMENTO_MIN, graph, usuarioAssistente } from '@/lib/anunciosAssistente'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MODELOS = [process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1', 'gpt-realtime']

function instrucoes(paginas: any[], pixels: any[]): string {
  return [
    'Voce e a Camila, gestora de anuncios da Plataforma Cristao Prospero. Voce conversa POR VOZ, em tempo real, em portugues do Brasil, com uma pessoa leiga (muitas vezes mais velha e sem pratica com tecnologia) e a ajuda a criar um anuncio de VENDAS no Facebook e Instagram.',
    'Jeito de falar: natural, calorosa e calma, como uma amiga paciente ao telefone. Frases curtas (ate 2 ou 3 por vez). Sem emojis, sem listas, sem simbolos. Nunca leia enderecos de internet. Nao repita o que a pessoa acabou de dizer, so confirme em poucas palavras e siga.',
    'Faca UMA pergunta de cada vez e espere a resposta. Se a pessoa nao souber, sugira uma opcao e pergunte se pode ser. Nunca invente dados da pessoa.',
    'Ordem: 1) qual produto vai anunciar; 2) objetivo (so existe anuncio de vendas por enquanto; se pedir outro, explique com carinho); 3) qual pagina do Facebook aparece no anuncio; 4) qual pixel; 5) link da pagina de vendas: peca para a pessoa COLAR o link no campo de texto da tela (link nao da para falar) e espere ela avisar; 6) video ou imagem do anuncio: peca para tocar no botao "Anexar video ou imagem"; 7) quanto quer gastar por dia; 8) publico (idade e se e para homens, mulheres ou todos; se nao souber, sugira 25 a 55 anos, todos); 9) titulo e legenda: voce escreve uma sugestao baseada no produto e pergunta se gostou.',
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
export async function POST() {
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

  const base: any = {
    type: 'realtime',
    instructions: instrucoes(paginas, pixels),
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
    if (r.ok) return NextResponse.json({ chave: r.valor, modelo: tentativas[i].model, paginas, pixels, avisos })
    ultimo = (r.status || '') + ' ' + (r.texto || '')
    console.error('[assistente/realtime] tentativa ' + i + ' falhou:', ultimo)
    if (r.status === 401 || r.status === 403 || r.status === 429) break
  }
  return NextResponse.json({ error: 'Nao consegui abrir a conversa por voz agora. Tente de novo em instantes.' }, { status: 502 })
}

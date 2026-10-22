// Regras do Gerenciador de Anuncios: calcula as metricas, diz se estao boas ou ruins e acha a falha do funil.
// Os limites abaixo sao uma referencia geral para infoprodutos no Brasil. Ajuste aqui se quiser mudar o criterio.

export type Nivel = 'bom' | 'atencao' | 'ruim' | 'sem'

export type Insights = {
  spend?: number; impressions?: number; reach?: number; frequency?: number
  inlineLinkClicks?: number; clicks?: number
  landingPageViews?: number; initiateCheckout?: number; purchaseCount?: number; purchaseValue?: number
}

export const LIMITES = {
  minImpressoes: 1000,   // antes disso, ainda e cedo para julgar
  minCliques: 50,
  minPagina: 50,
  minCheckout: 15,
  cpm: { bom: 30, atencao: 50 },          // R$ por mil exibicoes (menor e melhor)
  ctr: { bom: 1.5, atencao: 1 },          // % (maior e melhor)
  cpc: { bom: 1.5, atencao: 3 },          // R$ (menor e melhor)
  connect: { bom: 80, atencao: 65 },      // % (maior e melhor)
  checkout: { bom: 10, atencao: 5 },      // % (maior e melhor)
  compra: { bom: 25, atencao: 12 },       // % (maior e melhor)
  roas: { bom: 2, atencao: 1 },           // x (maior e melhor)
  freq: { bom: 2, atencao: 3.5 },         // vezes (menor e melhor)
}

export type Metricas = {
  gasto: number; alcance: number; impressoes: number; cliquesLink: number; paginas: number; checkouts: number; compras: number; valor: number
  cpm: number | null; ctr: number | null; cpc: number | null; connect: number | null
  taxaCheckout: number | null; taxaCompra: number | null; cpa: number | null; roas: number | null; freq: number | null
}

const n = (v: any) => Number(v || 0)
const razao = (a: number, b: number) => (b > 0 ? a / b : null)

export function calcular(i: Insights | undefined | null): Metricas {
  const gasto = n(i?.spend)
  const impressoes = n(i?.impressions)
  const cliquesLink = n(i?.inlineLinkClicks)
  const paginas = n(i?.landingPageViews)
  const checkouts = n(i?.initiateCheckout)
  const compras = n(i?.purchaseCount)
  const valor = n(i?.purchaseValue)
  const alcance = n(i?.reach) || impressoes
  const cpm = razao(gasto * 1000, impressoes)
  const ctr = razao(cliquesLink * 100, impressoes)
  const cpc = razao(gasto, cliquesLink)
  const connect = razao(paginas * 100, cliquesLink)
  const taxaCheckout = razao(checkouts * 100, paginas)
  const taxaCompra = razao(compras * 100, checkouts)
  const cpa = razao(gasto, compras)
  const roas = razao(valor, gasto)
  const freq = n(i?.frequency) || razao(impressoes, alcance)
  return { gasto, alcance, impressoes, cliquesLink, paginas, checkouts, compras, valor, cpm, ctr, cpc, connect, taxaCheckout, taxaCompra, cpa, roas, freq }
}

export type Avaliacao = { nivel: Nivel; dica: string }

function menorMelhor(v: number, lim: { bom: number; atencao: number }): Nivel { return v <= lim.bom ? 'bom' : v <= lim.atencao ? 'atencao' : 'ruim' }
function maiorMelhor(v: number, lim: { bom: number; atencao: number }): Nivel { return v >= lim.bom ? 'bom' : v >= lim.atencao ? 'atencao' : 'ruim' }

export type MetricaId = 'cpm' | 'ctr' | 'cpc' | 'connect' | 'checkout' | 'compra' | 'cpa' | 'roas' | 'freq'

export const EXPLICA: Record<MetricaId, { nome: string; oQue: string }> = {
  cpm: { nome: 'CPM', oQue: 'Quanto você paga para o anúncio aparecer 1.000 vezes. Quanto menor, melhor: é o preço da “vitrine”.' },
  ctr: { nome: 'CTR do link', oQue: 'De cada 100 vezes que o anúncio aparece, quantas pessoas clicam no link. Mostra se o anúncio chama atenção.' },
  cpc: { nome: 'CPC do link', oQue: 'Quanto você paga por cada clique no link. Quanto menor, melhor.' },
  connect: { nome: 'Chegada na página', oQue: 'De quem clicou no anúncio, quantos realmente esperaram a página abrir. O ideal é acima de 80%.' },
  checkout: { nome: 'Foi para o checkout', oQue: 'De quem viu a página, quantos clicaram em comprar e foram para o checkout. Mostra se a página convence.' },
  compra: { nome: 'Finalizou a compra', oQue: 'De quem chegou no checkout, quantos pagaram. Mostra se o checkout e o preço não assustam.' },
  cpa: { nome: 'Custo por venda', oQue: 'Quanto você gastou em anúncio para conseguir cada venda. Compare com o valor do produto.' },
  roas: { nome: 'ROAS', oQue: 'Quantos reais voltam para cada R$ 1 investido. ROAS 2 = você gastou R$ 100 e vendeu R$ 200.' },
  freq: { nome: 'Frequência', oQue: 'Quantas vezes, em média, a mesma pessoa viu seu anúncio. Se passar de 3, ela enjoa do anúncio.' },
}

export function avaliar(id: MetricaId, m: Metricas): Avaliacao {
  const cedo: Avaliacao = { nivel: 'sem', dica: 'Ainda poucos dados para avaliar. Espere mais um pouco.' }
  switch (id) {
    case 'cpm': {
      if (m.cpm === null || m.impressoes < LIMITES.minImpressoes) return cedo
      const nv = menorMelhor(m.cpm, LIMITES.cpm)
      return { nivel: nv, dica: nv === 'bom' ? 'Você paga barato para aparecer. Mantenha.' : nv === 'atencao' ? 'Um pouco caro. Teste um criativo novo ou outro público.' : 'Caro. O público pode estar saturado: troque o criativo e teste um público mais aberto.' }
    }
    case 'ctr': {
      if (m.ctr === null || m.impressoes < LIMITES.minImpressoes) return cedo
      const nv = maiorMelhor(m.ctr, LIMITES.ctr)
      return { nivel: nv, dica: nv === 'bom' ? 'As pessoas estão clicando. O anúncio chama atenção.' : nv === 'atencao' ? 'Dá para melhorar. Teste outro gancho nos primeiros 3 segundos do vídeo.' : 'Poucos clicam. O gancho do criativo está fraco: teste outro vídeo ou imagem.' }
    }
    case 'cpc': {
      if (m.cpc === null || m.cliquesLink < 30) return cedo
      const nv = menorMelhor(m.cpc, LIMITES.cpc)
      return { nivel: nv, dica: nv === 'bom' ? 'Clique barato. Muito bom.' : nv === 'atencao' ? 'Clique um pouco caro. Melhore o criativo para aumentar o CTR.' : 'Clique caro. Troque o criativo e revise o público.' }
    }
    case 'connect': {
      if (m.connect === null || m.cliquesLink < LIMITES.minCliques) return cedo
      const nv = maiorMelhor(m.connect, LIMITES.connect)
      return { nivel: nv, dica: nv === 'bom' ? 'A página está abrindo para quase todo mundo que clica.' : nv === 'atencao' ? 'Parte das pessoas desiste antes da página abrir. Veja se ela está rápida no celular.' : 'Muita gente clica e não vê a página. Teste a velocidade do site e confira se o pixel está instalado.' }
    }
    case 'checkout': {
      if (m.taxaCheckout === null || m.paginas < LIMITES.minPagina) return cedo
      const nv = maiorMelhor(m.taxaCheckout, LIMITES.checkout)
      return { nivel: nv, dica: nv === 'bom' ? 'A página convence: muita gente vai para o checkout.' : nv === 'atencao' ? 'A página pode convencer mais. Reforce a promessa e o botão de compra.' : 'A página recebe gente, mas poucos clicam em comprar. Melhore a oferta, a promessa e o botão.' }
    }
    case 'compra': {
      if (m.taxaCompra === null || m.checkouts < LIMITES.minCheckout) return cedo
      const nv = maiorMelhor(m.taxaCompra, LIMITES.compra)
      return { nivel: nv, dica: nv === 'bom' ? 'Quem chega no checkout está comprando. Ótimo.' : nv === 'atencao' ? 'Alguns desistem no checkout. Ofereça Pix e confira se ele abre rápido.' : 'Chegam no checkout e desistem. Confira preço, formas de pagamento (Pix) e a velocidade do checkout.' }
    }
    case 'cpa': {
      if (m.cpa === null || m.compras < 1) return m.gasto > 0 && m.impressoes >= LIMITES.minImpressoes ? { nivel: 'sem', dica: 'Ainda sem vendas para calcular.' } : cedo
      const ticket = m.valor / m.compras
      const nv: Nivel = m.cpa <= ticket * 0.5 ? 'bom' : m.cpa <= ticket ? 'atencao' : 'ruim'
      return { nivel: nv, dica: nv === 'bom' ? 'Cada venda custa bem menos que o valor do produto.' : nv === 'atencao' ? 'Você ainda lucra pouco por venda. Tente baixar o custo.' : 'Cada venda custa mais do que o produto vale. Pause ou troque o criativo.' }
    }
    case 'roas': {
      if (m.gasto < 20 || m.impressoes < LIMITES.minImpressoes) return cedo
      if (m.compras === 0) return { nivel: 'ruim', dica: 'Já gastou e ainda não vendeu. Veja onde o funil está falhando.' }
      const nv = maiorMelhor(m.roas || 0, LIMITES.roas)
      return { nivel: nv, dica: nv === 'bom' ? 'Está dando lucro. Pode aumentar o orçamento aos poucos (+20%).' : nv === 'atencao' ? 'Está perto de empatar. Otimize antes de aumentar o orçamento.' : 'Está gastando mais do que vende. Não aumente o orçamento: otimize ou pause.' }
    }
    case 'freq': {
      if (m.freq === null || m.impressoes < LIMITES.minImpressoes) return cedo
      const nv = menorMelhor(m.freq, LIMITES.freq)
      return { nivel: nv, dica: nv === 'bom' ? 'As pessoas ainda não enjoaram do anúncio.' : nv === 'atencao' ? 'Já estão vendo bastante. Prepare um criativo novo.' : 'As pessoas estão enjoando. Troque o criativo agora.' }
    }
  }
}

export const ORDEM_METRICAS: MetricaId[] = ['cpm', 'ctr', 'cpc', 'connect', 'checkout', 'compra', 'cpa', 'roas', 'freq']

export function valorMetrica(id: MetricaId, m: Metricas): string {
  const moeda = (v: number | null) => (v === null ? '—' : 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  const pct = (v: number | null) => (v === null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%')
  switch (id) {
    case 'cpm': return moeda(m.cpm)
    case 'ctr': return pct(m.ctr)
    case 'cpc': return moeda(m.cpc)
    case 'connect': return pct(m.connect)
    case 'checkout': return pct(m.taxaCheckout)
    case 'compra': return pct(m.taxaCompra)
    case 'cpa': return moeda(m.cpa)
    case 'roas': return m.roas === null ? '—' : m.roas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'x'
    case 'freq': return m.freq === null ? '—' : m.freq.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'x'
  }
}

// ---------- Funil ----------

export type EtapaFunil = { id: 'viram' | 'cliques' | 'pagina' | 'checkout' | 'compras'; nome: string; valor: number; icone: string }

export function etapasDoFunil(m: Metricas): EtapaFunil[] {
  return [
    { id: 'viram', nome: 'Viram o anúncio', valor: m.alcance, icone: '👀' },
    { id: 'cliques', nome: 'Clicaram no link', valor: m.cliquesLink, icone: '🖱️' },
    { id: 'pagina', nome: 'Chegaram na página', valor: m.paginas, icone: '📄' },
    { id: 'checkout', nome: 'Clicaram no checkout', valor: m.checkouts, icone: '🛒' },
    { id: 'compras', nome: 'Compraram', valor: m.compras, icone: '✅' },
  ]
}

// Passagens entre as etapas (a metrica que mede cada uma)
export const PASSAGENS: { de: EtapaFunil['id']; para: EtapaFunil['id']; metrica: MetricaId; nome: string }[] = [
  { de: 'viram', para: 'cliques', metrica: 'ctr', nome: 'Do anúncio ao clique' },
  { de: 'cliques', para: 'pagina', metrica: 'connect', nome: 'Do clique à página' },
  { de: 'pagina', para: 'checkout', metrica: 'checkout', nome: 'Da página ao checkout' },
  { de: 'checkout', para: 'compras', metrica: 'compra', nome: 'Do checkout à compra' },
]

export type Relatorio = {
  situacao: 'poucos-dados' | 'sem-gasto' | 'falha' | 'atencao' | 'saudavel'
  titulo: string
  resumo: string
  falhaEm: EtapaFunil['id'] | null // etapa de DESTINO da passagem que falhou
  itens: { nivel: Nivel; titulo: string; texto: string }[]
}

export function relatorioDoFunil(m: Metricas): Relatorio {
  if (m.gasto <= 0 && m.impressoes <= 0) {
    return { situacao: 'sem-gasto', titulo: 'Sem dados neste período', resumo: 'Nenhum anúncio rodou neste período. Quando houver gasto, o relatório aparece aqui.', falhaEm: null, itens: [] }
  }
  if (m.impressoes < LIMITES.minImpressoes) {
    return { situacao: 'poucos-dados', titulo: 'Ainda é cedo para julgar', resumo: 'O anúncio apareceu poucas vezes (menos de ' + LIMITES.minImpressoes.toLocaleString('pt-BR') + '). Espere juntar mais dados antes de mexer na campanha.', falhaEm: null, itens: [] }
  }

  const itens: Relatorio['itens'] = []
  type Pass = { de: EtapaFunil['id']; para: EtapaFunil['id']; nome: string; nivel: Nivel; metrica: MetricaId }
  const avaliadas: Pass[] = []

  // Eventos que o Facebook nao esta registrando (pixel): avisa em vez de culpar o funil
  const semPixelPagina = m.cliquesLink >= LIMITES.minCliques && m.paginas === 0
  const semPixelCheckout = m.paginas >= LIMITES.minPagina && m.checkouts === 0 && m.compras === 0

  PASSAGENS.forEach(function(p) {
    const a = avaliar(p.metrica, m)
    if (a.nivel === 'sem') return
    if (p.metrica === 'connect' && semPixelPagina) return
    if (p.metrica === 'checkout' && semPixelCheckout) return
    itens.push({ nivel: a.nivel, titulo: p.nome + ' (' + EXPLICA[p.metrica].nome + ': ' + valorMetrica(p.metrica, m) + ')', texto: a.dica })
    avaliadas.push({ ...p, nivel: a.nivel })
  })

  if (semPixelPagina) itens.unshift({ nivel: 'atencao', titulo: 'O Facebook não registrou visitas na página', texto: 'Há cliques, mas nenhuma visita contada. Verifique se o pixel está instalado na página e se o evento de visualização está funcionando.' })
  if (semPixelCheckout) itens.push({ nivel: 'atencao', titulo: 'Nenhum “checkout iniciado” registrado', texto: 'Há visitas na página, mas o Facebook não contou nenhum início de checkout. Confira se o evento está configurado no botão de compra ou no checkout.' })

  const cpm = avaliar('cpm', m)
  if (cpm.nivel === 'ruim' || cpm.nivel === 'atencao') itens.push({ nivel: cpm.nivel, titulo: 'Preço para aparecer (CPM: ' + valorMetrica('cpm', m) + ')', texto: cpm.dica })
  const fr = avaliar('freq', m)
  if (fr.nivel === 'ruim' || fr.nivel === 'atencao') itens.push({ nivel: fr.nivel, titulo: 'Repetição do anúncio (Frequência: ' + valorMetrica('freq', m) + ')', texto: fr.dica })
  const ro = avaliar('roas', m)
  if (ro.nivel !== 'sem') itens.push({ nivel: ro.nivel, titulo: 'Retorno (ROAS: ' + valorMetrica('roas', m) + ')', texto: ro.dica })

  // A falha e a primeira etapa ruim do funil; se nenhuma esta ruim, a primeira em atencao
  const f = avaliadas.find(function(x) { return x.nivel === 'ruim' }) || avaliadas.find(function(x) { return x.nivel === 'atencao' }) || null
  if (f) {
    const a = avaliar(f.metrica, m)
    return {
      situacao: f.nivel === 'ruim' ? 'falha' : 'atencao',
      titulo: (f.nivel === 'ruim' ? 'A falha está aqui: ' : 'Ponto de atenção: ') + f.nome.toLowerCase(),
      resumo: a.dica,
      falhaEm: f.para,
      itens,
    }
  }
  const algumRuim = itens.some(function(i) { return i.nivel === 'ruim' })
  const algumAtencao = itens.some(function(i) { return i.nivel === 'atencao' })
  if (algumRuim || algumAtencao) {
    return { situacao: algumRuim ? 'falha' : 'atencao', titulo: algumRuim ? 'O funil está bem, mas há um problema' : 'O funil está bem, com pontos de atenção', resumo: 'As etapas medidas do funil estão dentro do esperado. Veja abaixo o que ajustar.', falhaEm: null, itens }
  }
  return { situacao: 'saudavel', titulo: 'Funil saudável', resumo: 'Todas as etapas estão dentro do esperado. Se o ROAS estiver bom, você pode aumentar o orçamento aos poucos (+20%).', falhaEm: null, itens }
}

// ---------- Guia do funil (texto para o aluno) ----------

export const GUIA_FUNIL: { icone: string; nome: string; oQue: string; mede: string; melhorar: string }[] = [
  { icone: '👀', nome: '1. Viram o anúncio', oQue: 'É a quantidade de pessoas diferentes para quem o Facebook mostrou seu anúncio.', mede: 'Alcance e CPM (o preço para aparecer).', melhorar: 'Se o CPM está alto, troque o criativo e teste um público mais aberto. Se o alcance é baixo, o orçamento pode estar pequeno.' },
  { icone: '🖱️', nome: '2. Clicaram no link', oQue: 'Das pessoas que viram, quantas se interessaram e clicaram para saber mais.', mede: 'CTR do link (meta: acima de 1,5%) e CPC (quanto custa cada clique).', melhorar: 'Aqui quem manda é o criativo. Mude o gancho (os 3 primeiros segundos), a imagem ou a promessa.' },
  { icone: '📄', nome: '3. Chegaram na página', oQue: 'Dos que clicaram, quantos esperaram a página abrir de verdade.', mede: 'Chegada na página (meta: acima de 80%).', melhorar: 'Se está baixo, sua página está lenta ou o pixel não está registrando. Teste no celular com 4G e deixe o site mais leve.' },
  { icone: '🛒', nome: '4. Clicaram no checkout', oQue: 'Das pessoas que viram a página, quantas clicaram no botão de comprar.', mede: 'Taxa de checkout (meta: acima de 10%).', melhorar: 'Aqui quem manda é a página. Deixe a promessa mais clara, mostre prova (depoimentos), e ponha o botão de comprar bem visível.' },
  { icone: '✅', nome: '5. Compraram', oQue: 'Das pessoas que chegaram no checkout, quantas pagaram.', mede: 'Taxa de compra (meta: acima de 25%), custo por venda e ROAS.', melhorar: 'Confira o preço, ofereça Pix, e teste o checkout no celular. Se o ROAS está bom, aumente o orçamento em até 20% por vez.' },
]

// ---------- Veredito da campanha (selo da tabela) ----------

export type Veredito = { rotulo: 'Escalar' | 'Observar' | 'Ajustar' | 'Sem dados'; nivel: Nivel; motivo: string }

export function veredito(m: Metricas): Veredito {
  if (m.gasto < 20 || m.impressoes < LIMITES.minImpressoes) return { rotulo: 'Sem dados', nivel: 'sem', motivo: 'Ainda poucos dados para decidir.' }
  const roas = m.roas || 0
  if (m.compras === 0) {
    return m.gasto >= 100
      ? { rotulo: 'Ajustar', nivel: 'ruim', motivo: 'Já gastou ' + valorMoeda(m.gasto) + ' e ainda não vendeu. Veja onde o funil falha.' }
      : { rotulo: 'Observar', nivel: 'atencao', motivo: 'Ainda sem vendas, mas o gasto é pequeno. Acompanhe.' }
  }
  if (roas >= LIMITES.roas.bom) return { rotulo: 'Escalar', nivel: 'bom', motivo: 'ROAS ' + roas.toFixed(2).replace('.', ',') + 'x: dá lucro. Pode aumentar o orçamento aos poucos (+20%).' }
  if (roas >= LIMITES.roas.atencao) return { rotulo: 'Observar', nivel: 'atencao', motivo: 'Perto de empatar. Otimize antes de aumentar o orçamento.' }
  return m.gasto >= 50
    ? { rotulo: 'Ajustar', nivel: 'ruim', motivo: 'Gasta mais do que vende (ROAS ' + roas.toFixed(2).replace('.', ',') + 'x). Otimize ou pause.' }
    : { rotulo: 'Observar', nivel: 'atencao', motivo: 'ROAS baixo, mas ainda com pouco gasto. Acompanhe.' }
}

function valorMoeda(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

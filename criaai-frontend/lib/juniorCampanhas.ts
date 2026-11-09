// Junior + campanhas do aluno: pergunta da integracao com o Facebook e, quando o aluno tem plano Pro/Premium e ja integrou,
// le as campanhas dele direto no Facebook (so leitura) para analisar de forma individual. Usado no chat do app e no WhatsApp.
import { statusAnuncios } from '@/lib/acessoAnuncios'

const GRAPH = 'https://graph.facebook.com/v26.0/'
const LINK_GERENCIADOR = 'https://www.mcpia.site/dashboard/anuncios'

export type StatusFacebook = 'conectado' | 'nao' | 'expirado'

// Assunto de anuncio nas ultimas falas da pessoa (so ai o Junior le as campanhas; evita chamar o Facebook sem necessidade)
export function falouDeAnuncio(textos: string[]): boolean {
  const t = textos.join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return /anunci|campanha|trafego|metrica|roas|\bcpc\b|\bctr\b|\bcpm\b|criativo|facebook|\bmeta\b|gerenciador|gerenciando|pixel|conjunto|orcamento|escalar|pausar|gastei|gasto|impress|cliques?\b/.test(t)
}

function regraAnuncios(acesso: string, status: StatusFacebook, temDados: boolean): string {
  if (acesso === 'plano') {
    return 'ANALISE DAS CAMPANHAS PELO JUNIOR (REGRA DO BRENO): esta pessoa AINDA NAO tem o plano que libera o menu Gerenciando seus anuncios (planos Pro e Premium). Toda vez que ela vier falar de ANUNCIO, CAMPANHA, TRAFEGO PAGO ou METRICAS, depois de responder a duvida dela, explique com carinho: "Se você tiver um plano Pro ou Premium e fizer a integração com o Facebook no menu Gerenciando seus anúncios, eu consigo ir lá nas suas campanhas e analisar para você 🙏" e pergunte se ela quer saber como fazer. Se ela quiser, siga as regras de ASSINATURA que ja existem (link do plano so como la esta escrito). Nao insista se ela disser que nao. Fale disso uma vez por conversa.'
  }
  if (acesso !== 'liberado') return ''
  if (status === 'conectado') {
    return 'ANALISE DAS CAMPANHAS PELO JUNIOR: esta pessoa tem o plano e JA fez a integracao com o Facebook. NAO pergunte se ela integrou. Quando ela falar de anuncio, campanha ou resultado, diga que voce foi ate as campanhas dela e use os numeros reais da secao CAMPANHAS DESTA PESSOA abaixo' + (temDados ? '' : ' (se a secao nao existir ou estiver vazia, diga com carinho que nao conseguiu ler as campanhas agora e peca para ela abrir o menu Gerenciando seus anuncios e te mandar um print)') + '. Analise campanha por campanha com o GUIA DE TRAFEGO PAGO, de forma individual, um passo por vez. Nunca invente numero que nao esteja la.'
  }
  const situ = status === 'expirado' ? 'a integracao dela EXPIROU (precisa reconectar).' : 'o sistema ve que ela AINDA NAO fez a integracao.'
  return 'INTEGRACAO COM O FACEBOOK (REGRA DO BRENO, TODA VEZ): ela tem o plano, mas ' + situ + '\n'
    + 'Toda vez que a pessoa vier falar de ANUNCIO, CAMPANHA, TRAFEGO PAGO, METRICAS, RESULTADO DE ANUNCIO, Facebook/Meta, Gerenciador ou pedir ajuda para otimizar/escalar/pausar, a PRIMEIRA coisa da sua resposta e perguntar com carinho: "Você já tem a integração com o Facebook lá no menu Gerenciando seus anúncios? Se tiver, eu consigo ir lá nas suas campanhas e analisar para você 🙏". Faca SO essa pergunta.\n'
    + '- Se ela disser que NAO tem, nao sabe ou nao entendeu: responda "Vamos fazer então?" e mande o link ' + LINK_GERENCIADOR + ' (so o link, sozinho, em texto puro). Depois oriente UM passo por mensagem: (1) abrir esse link ou o menu "Gerenciando seus anúncios"; (2) tocar em "Conectar com Facebook"; (3) entrar na conta do Facebook e aceitar as permissoes; (4) escolher a conta de anuncio. Pergunte se deu certo antes do proximo passo; se der erro, peca o print.\n'
    + '- Se ela disser que JA tem: agradeca em uma frase e diga que vai olhar (se os numeros nao estiverem na secao CAMPANHAS DESTA PESSOA, peca para ela abrir o menu e te mandar um print).\n'
    + '- Depois da integracao, CONTINUE a conversa e tire as duvidas dela normalmente. A integracao nunca e condicao para ajudar.\n'
    + '- Se o historico mostra que voce JA perguntou isso nesta conversa e ela respondeu, nao pergunte de novo; so retome se ela disser que ainda nao conseguiu.\n'
    + '- So fale da integracao quando o assunto for anuncio/trafego. Para outros assuntos (acesso, pagamento, aulas, ebook, site) NAO fale dela.'
}

async function graph(url: string): Promise<any> {
  const ctl = new AbortController()
  const t = setTimeout(function() { ctl.abort() }, 8000)
  try { const r = await fetch(url, { signal: ctl.signal }); return await r.json() } finally { clearTimeout(t) }
}

function acao(arr: any[] | undefined, tipos: string[]): number {
  if (!arr) return 0
  for (const tp of tipos) { const f = arr.find(function(a) { return a.action_type === tp }); if (f) return Number(f.value) }
  return 0
}

function m(v: number, casas = 2): string { return (Math.round(v * Math.pow(10, casas)) / Math.pow(10, casas)).toString().replace('.', ',') }

function linhaPeriodo(r: any | undefined): string {
  if (!r) return 'sem veiculacao'
  const gasto = Number(r.spend || 0)
  const imp = Number(r.impressions || 0)
  const cliquesLink = Number(r.inline_link_clicks || 0)
  const compras = acao(r.actions, ['omni_purchase', 'purchase'])
  const valor = acao(r.action_values, ['omni_purchase', 'purchase'])
  const visitas = acao(r.actions, ['landing_page_view'])
  const checkouts = acao(r.actions, ['omni_initiated_checkout', 'initiate_checkout'])
  const ctr = imp > 0 ? (cliquesLink / imp) * 100 : 0
  const cpc = cliquesLink > 0 ? gasto / cliquesLink : 0
  const cpm = imp > 0 ? (gasto / imp) * 1000 : 0
  return 'gasto R$' + m(gasto) + ', impressoes ' + imp + ', CTR do link ' + m(ctr) + '%, CPC do link R$' + m(cpc) + ', CPM R$' + m(cpm) + ', frequencia ' + m(Number(r.frequency || 0)) + ', visitas na pagina ' + visitas + ', checkouts iniciados ' + checkouts + ', vendas ' + compras + ' (R$' + m(valor) + '), ROAS ' + m(gasto > 0 ? valor / gasto : 0)
}

// Le as campanhas do aluno no Facebook (so leitura). Devolve null se nao conseguir.
async function lerCampanhas(token: string, conta: string): Promise<string | null> {
  const G = GRAPH + conta
  const campos = 'campaign_id,campaign_name,spend,impressions,reach,frequency,inline_link_clicks,actions,action_values'
  const filtroAtivas = '&filtering=' + encodeURIComponent(JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]))
  const [ativas, i7, i30] = await Promise.all([
    graph(G + '/campaigns?fields=id,name,objective,daily_budget,lifetime_budget,created_time&limit=50' + filtroAtivas + '&access_token=' + token),
    graph(G + '/insights?level=campaign&fields=' + campos + '&date_preset=last_7d&limit=100&access_token=' + token),
    graph(G + '/insights?level=campaign&fields=' + campos + '&date_preset=last_30d&limit=100&access_token=' + token),
  ])
  if (ativas.error || i30.error) return null
  const por7 = new Map<string, any>(); (i7.data || []).forEach(function(r: any) { por7.set(r.campaign_id, r) })
  const por30 = new Map<string, any>(); (i30.data || []).forEach(function(r: any) { por30.set(r.campaign_id, r) })
  const lista: { id: string; nome: string; ativa: boolean; extra: string }[] = []
  ;(ativas.data || []).forEach(function(c: any) {
    const orc = c.daily_budget ? 'orcamento diario R$' + m(Number(c.daily_budget) / 100) : c.lifetime_budget ? 'orcamento total R$' + m(Number(c.lifetime_budget) / 100) : 'orcamento definido nos conjuntos'
    const dias = c.created_time ? Math.max(0, Math.floor((Date.now() - new Date(c.created_time).getTime()) / 86400000)) : null
    lista.push({ id: c.id, nome: c.name, ativa: true, extra: orc + (dias !== null ? ', criada ha ' + dias + ' dias' : '') + (c.objective ? ', objetivo ' + c.objective : '') })
  })
  const jaTem = new Set(lista.map(function(l) { return l.id }))
  ;(i30.data || []).forEach(function(r: any) { if (!jaTem.has(r.campaign_id)) lista.push({ id: r.campaign_id, nome: r.campaign_name, ativa: false, extra: '' }) })
  if (!lista.length) return 'A conta de anuncios dela esta conectada, mas NAO tem nenhuma campanha ativa nem com movimento nos ultimos 30 dias.'
  lista.sort(function(a, b) { return (a.ativa === b.ativa ? 0 : a.ativa ? -1 : 1) || Number((por30.get(b.id) || {}).spend || 0) - Number((por30.get(a.id) || {}).spend || 0) })
  const linhas = lista.slice(0, 8).map(function(c) {
    return '- ' + c.nome + ' [' + (c.ativa ? 'ATIVA' : 'nao esta ativa agora') + ']' + (c.extra ? ' (' + c.extra + ')' : '') + '\n    Ultimos 7 dias: ' + linhaPeriodo(por7.get(c.id)) + '\n    Ultimos 30 dias: ' + linhaPeriodo(por30.get(c.id))
  })
  return linhas.join('\n') + (lista.length > 8 ? '\n(+' + (lista.length - 8) + ' campanhas com menos movimento nao listadas)' : '')
}

// Monta o bloco do Junior (regra + campanhas reais). textosRecentes = ultimas falas da pessoa. Nunca lanca erro.
export async function blocoAnunciosDoAluno(admin: any, userId: string | null | undefined, emailFallback: string | null, textosRecentes: string[], forcarAssunto = false): Promise<string> {
  try {
    if (!userId) return ''
    const pr = await admin.from('profiles').select('is_admin, email, created_at, subscription_status, plans(name)').eq('id', userId).maybeSingle()
    const d: any = pr.data || {}
    const plano = Array.isArray(d.plans) ? (d.plans[0] && d.plans[0].name) : (d.plans && d.plans.name)
    const acesso = statusAnuncios(!!d.is_admin, d.email || emailFallback, d.created_at, d.subscription_status, plano)
    if (acesso === 'oculto') return ''
    const falou = forcarAssunto || falouDeAnuncio(textosRecentes)
    if (!falou && acesso !== 'liberado') return ''
    let status: StatusFacebook = 'nao'
    let token = ''
    let conta = ''
    if (acesso === 'liberado') {
      const fb = await admin.from('facebook_connections').select('access_token, token_expires_at, ad_account_id').eq('user_id', userId).maybeSingle()
      const f: any = fb.data
      if (f && f.access_token) {
        status = f.token_expires_at && new Date(f.token_expires_at).getTime() < Date.now() ? 'expirado' : 'conectado'
        token = f.access_token; conta = f.ad_account_id || ''
      }
    }
    let dados: string | null = null
    if (acesso === 'liberado' && status === 'conectado' && conta && falou) {
      dados = await lerCampanhas(token, conta)
    }
    let bloco = regraAnuncios(acesso, status, !!dados)
    if (!bloco) return ''
    if (dados) bloco += '\n\nCAMPANHAS DESTA PESSOA (dados reais lidos agora do Facebook dela, so leitura; use SO estes numeros):\n' + dados
    return bloco
  } catch (e) { return '' }
}

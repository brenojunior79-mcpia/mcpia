import { createClient } from '@/lib/supabase-server'
import { statusAnuncios } from '@/lib/acessoAnuncios'

export const GRAPH_VERSION = 'v26.0'

// Assistente de criacao de anuncios por conversa (voz ou texto).
// HOJE SO O ADMIN USA: o app do Facebook ainda nao foi aprovado para as contas dos alunos.
// Quando o Facebook aprovar (acesso avancado a ads_management), mude para true: ai vale a mesma regra do menu de anuncios.
export const ASSISTENTE_PARA_ALUNOS = false

// Teto de seguranca do orcamento diario que o assistente aceita criar (em reais)
export const ORCAMENTO_MIN = 5
export const ORCAMENTO_MAX = 200

export type UsuarioAssistente = { id: string; token: string; conta: string; contaNome: string; admin: boolean }

// Confere login, permissao e a conta do Facebook conectada. Se algo falhar, devolve a mensagem e o status.
export async function usuarioAssistente(): Promise<UsuarioAssistente | { erro: string; status: number }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta.', status: 401 }
  const p = await supabase.from('profiles').select('is_admin, email, created_at, subscription_status, plans(name)').eq('id', user.id).maybeSingle()
  const d: any = p.data || {}
  const admin = !!d.is_admin
  const liberado = admin || (ASSISTENTE_PARA_ALUNOS && statusAnuncios(admin, d.email || user.email, d.created_at, d.subscription_status, Array.isArray(d.plans) ? (d.plans[0] && d.plans[0].name) : (d.plans && d.plans.name)) === 'liberado')
  if (!liberado) return { erro: 'Este recurso ainda nao esta liberado para a sua conta.', status: 403 }
  const c = await supabase.from('facebook_connections').select('access_token, ad_account_id, ad_account_name, token_expires_at').eq('user_id', user.id).maybeSingle()
  const cd: any = c.data
  if (!cd || !cd.access_token) return { erro: 'Conecte o seu Facebook primeiro.', status: 400 }
  if (!cd.ad_account_id) return { erro: 'Escolha a conta de anuncios primeiro.', status: 400 }
  if (cd.token_expires_at && new Date(cd.token_expires_at).getTime() < Date.now()) return { erro: 'A conexao com o Facebook venceu. Conecte de novo.', status: 400 }
  const conta = String(cd.ad_account_id).indexOf('act_') === 0 ? String(cd.ad_account_id) : 'act_' + String(cd.ad_account_id)
  return { id: user.id, token: cd.access_token, conta, contaNome: cd.ad_account_name || conta, admin }
}

export type RespostaGraph = { ok: boolean; data: any; erro?: string }

function mensagemErro(data: any): string {
  const e = data && data.error
  if (!e) return 'Erro desconhecido no Facebook.'
  return String(e.error_user_msg || e.error_user_title || e.message || 'Erro no Facebook.')
}

// Chamada simples para a API do Facebook (GET com query; POST/DELETE com JSON)
export async function graph(caminho: string, token: string, opcoes?: { metodo?: 'GET' | 'POST' | 'DELETE'; corpo?: any; query?: Record<string, string> }): Promise<RespostaGraph> {
  const metodo = (opcoes && opcoes.metodo) || 'GET'
  let url = 'https://graph.facebook.com/' + GRAPH_VERSION + '/' + caminho.replace(/^\//, '')
  try {
    let res: Response
    if (metodo === 'GET') {
      const q = new URLSearchParams(Object.assign({}, (opcoes && opcoes.query) || {}, { access_token: token }))
      res = await fetch(url + '?' + q.toString(), { cache: 'no-store' })
    } else {
      const corpo = Object.assign({}, (opcoes && opcoes.corpo) || {}, { access_token: token })
      res = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
    }
    const data = await res.json().catch(function() { return null })
    if (!res.ok || (data && data.error)) return { ok: false, data, erro: mensagemErro(data) }
    return { ok: true, data }
  } catch (e: any) {
    return { ok: false, data: null, erro: 'Nao consegui falar com o Facebook agora. Tente de novo.' }
  }
}

// ---------- Rascunho do anuncio ----------
export type Rascunho = {
  produto: string | null
  paginaId: string | null
  pixelId: string | null
  link: string | null
  orcamentoDiario: number | null
  idadeMin: number
  idadeMax: number
  genero: 'todos' | 'mulheres' | 'homens'
  titulo: string | null
  legenda: string | null
  botao: 'SHOP_NOW' | 'LEARN_MORE' | 'SIGN_UP'
  tipoProduto: 'afiliado' | 'proprio' | null
  beneficio: string | null
}

export function rascunhoVazio(): Rascunho {
  return { produto: null, paginaId: null, pixelId: null, link: null, orcamentoDiario: null, idadeMin: 25, idadeMax: 55, genero: 'todos', titulo: null, legenda: null, botao: 'LEARN_MORE', tipoProduto: null, beneficio: null }
}

function texto(v: any, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, max) : null
}

// Limpa o que a IA devolveu: so aceita paginas e pixels que existem na conta, link https e numeros dentro do limite
export function limparRascunho(bruto: any, paginas: { id: string }[], pixels: { id: string }[], anterior?: Rascunho): Rascunho {
  const r: Rascunho = Object.assign(rascunhoVazio(), anterior || {})
  const b = bruto && typeof bruto === 'object' ? bruto : {}
  if ('produto' in b) r.produto = texto(b.produto, 120)
  if ('paginaId' in b) { const id = String(b.paginaId || ''); r.paginaId = paginas.some(function(p) { return p.id === id }) ? id : null }
  if ('pixelId' in b) { const id = String(b.pixelId || ''); r.pixelId = pixels.some(function(p) { return p.id === id }) ? id : null }
  if ('link' in b) { const l = texto(b.link, 500); r.link = l && /^https:\/\/[^\s]+\.[^\s]+$/i.test(l) ? l : null }
  if ('orcamentoDiario' in b) {
    const n = Number(String(b.orcamentoDiario === null || b.orcamentoDiario === undefined ? '' : b.orcamentoDiario).replace(',', '.'))
    r.orcamentoDiario = isFinite(n) && n >= ORCAMENTO_MIN && n <= ORCAMENTO_MAX ? Math.round(n * 100) / 100 : null
  }
  if ('idadeMin' in b) { const n = Math.round(Number(b.idadeMin)); if (n >= 18 && n <= 64) r.idadeMin = n }
  if ('idadeMax' in b) { const n = Math.round(Number(b.idadeMax)); if (n >= 19 && n <= 65) r.idadeMax = n }
  if (r.idadeMax <= r.idadeMin) { r.idadeMin = 25; r.idadeMax = 55 }
  if (b.genero === 'todos' || b.genero === 'mulheres' || b.genero === 'homens') r.genero = b.genero
  if ('titulo' in b) r.titulo = texto(b.titulo, 40)
  if ('legenda' in b) r.legenda = texto(b.legenda, 500)
  if (b.tipoProduto === 'afiliado' || b.tipoProduto === 'proprio') r.tipoProduto = b.tipoProduto
  if ('beneficio' in b) r.beneficio = texto(b.beneficio, 200)
  if (b.botao === 'SHOP_NOW' || b.botao === 'LEARN_MORE' || b.botao === 'SIGN_UP') r.botao = b.botao
  return r
}

// O que ainda falta para poder criar (a tela e o servidor usam a mesma lista)
export function faltando(r: Rascunho, temMidia: boolean): string[] {
  const f: string[] = []
  if (!r.produto) f.push('produto')
  if (!r.paginaId) f.push('pagina do Facebook')
  if (!r.pixelId) f.push('pixel')
  if (!r.link) f.push('link da pagina de vendas')
  if (!r.orcamentoDiario) f.push('orcamento diario')
  if (!r.titulo) f.push('titulo')
  if (!r.legenda) f.push('legenda')
  if (!temMidia) f.push('video ou imagem')
  return f
}

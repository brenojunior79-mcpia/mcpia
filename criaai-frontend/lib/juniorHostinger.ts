// Hostinger: link de AFILIADO do Breno (o mesmo da aula 2 do menu Estrutura Express) e precos atuais do plano indicado (Unlimited).
// O Junior so pode mandar ESSE link (assim o Breno recebe a comissao) e responde precos com os valores daqui.
// Os dados ficam em wa_settings (chave "hostinger_info") e o link vem da propria aula 2 (estrutura_aulas), para nunca sair do ar.
// Todo dia o sistema confere o preco normal na pagina publica da Hostinger e atualiza; o preco promocional com o codigo de indicacao e informado pelo Breno.

export const LINK_HOSTINGER_AFILIADO = 'https://hostinger.com/br/refer?REFERRALCODE=BU2BJPRODCLX'
const CHAVE = 'hostinger_info'

export type InfoHostinger = {
  link: string
  plano: string
  normal: number // R$/mes, plano de 48 meses, sem desconto de indicacao
  promo: number | null // R$/mes com o codigo de indicacao (promocao do momento)
  promoNome: string | null
  periodo: string
  checadoEm: string | null
}

const PADRAO: InfoHostinger = { link: LINK_HOSTINGER_AFILIADO, plano: 'Unlimited', normal: 12.99, promo: 10.39, promoNome: 'Black Friday', periodo: '48 meses', checadoEm: null }

let cache: { em: number; v: InfoHostinger } | null = null

function brl(n: number): string { return 'R$ ' + n.toFixed(2).replace('.', ',') }

export async function carregarHostinger(admin: any): Promise<InfoHostinger> {
  if (cache && Date.now() - cache.em < 10 * 60 * 1000) return cache.v
  let v: InfoHostinger = { ...PADRAO }
  try {
    const s = await admin.from('wa_settings').select('value').eq('key', CHAVE).maybeSingle()
    const val: any = (s.data as any)?.value
    if (val && typeof val === 'object') v = { ...v, ...val }
    const a = await admin.from('estrutura_aulas').select('material_url').eq('ordem', 2).maybeSingle()
    const url = String((a.data as any)?.material_url || '')
    if (/^https:\/\/(www\.)?hostinger\.com\/.+REFERRALCODE=/i.test(url)) v.link = url
  } catch (e) { /* usa o padrao */ }
  cache = { em: Date.now(), v }
  return v
}

export function blocoHostinger(v: InfoHostinger): string {
  const promo = v.promo ? ' Hoje, pelo nosso link de indicacao, esta ' + brl(v.promo) + ' por mes' + (v.promoNome ? ' (promocao de ' + v.promoNome + ')' : '') + ', e essa promocao pode acabar.' : ''
  return '# HOSTINGER: DADOS ATUAIS (valem mais que qualquer outro valor)\n' +
    '- Plano que indicamos: ' + v.plano + ' (o cartao com "Oferta especial", sites ilimitados), no plano de ' + v.periodo + '.\n' +
    '- Preco normal: ' + brl(v.normal) + ' por mes.' + promo + ' Sempre diga que o valor final aparece na tela de pagamento da Hostinger e que pode variar.\n' +
    '- Nosso link de indicacao (UNICO link da Hostinger que voce pode mandar, exatamente como esta): ' + v.link + '\n' +
    '- Mande esse link so quando o aluno precisar criar a conta ou contratar a hospedagem. Nunca escreva outro endereco da Hostinger nem diga para ele pesquisar no Google (a indicacao precisa ser pelo nosso link). Se ele ja abriu a Hostinger por outro caminho, peca para abrir pelo nosso link.'
}

// Troca qualquer link da Hostinger que nao seja o de afiliado pelo de afiliado
export function sohLinkAfiliadoHostinger(texto: string, link: string): string {
  return String(texto || '').replace(/https?:\/\/(?:[a-z0-9-]+\.)*hostinger\.[a-z.]+[^\s)\]]*/gi, function(u) { return u.indexOf('REFERRALCODE=') >= 0 && link.indexOf(u.split('REFERRALCODE=')[1].slice(0, 8)) >= 0 ? u : link })
}

// Confere o preco normal na pagina publica da Hostinger (1x por dia). Falhando, mantem o que ja esta guardado.
export async function atualizarPrecosHostinger(admin: any): Promise<string> {
  try {
    const atual = await carregarHostinger(admin)
    if (atual.checadoEm && Date.now() - new Date(atual.checadoEm).getTime() < 20 * 3600 * 1000) return 'recente'
    const r = await fetch('https://www.hostinger.com/br/hospedagem-de-site-barata', { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CristaoProsperoBot/1.0)', 'Accept-Language': 'pt-BR' }, signal: AbortSignal.timeout(12000) })
    if (!r.ok) return 'http-' + r.status
    const html = (await r.text()).replace(/\s+/g, ' ')
    const i = html.search(/Unlimited/i)
    let novo: number | null = null
    if (i >= 0) {
      const m = html.slice(i, i + 1500).match(/R\$\s?(\d{1,2}[.,]\d{2})/)
      if (m) novo = parseFloat(m[1].replace(',', '.'))
    }
    const v: InfoHostinger = { ...atual, checadoEm: new Date().toISOString() }
    // So aceita valor plausivel e maior que o promocional (o valor da pagina publica e o "normal" que o Breno informou)
    if (novo !== null && novo >= 5 && novo <= 40 && (v.promo === null || novo >= v.promo)) v.normal = novo
    await admin.from('wa_settings').upsert({ key: CHAVE, value: v, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    cache = null
    return novo === null ? 'sem-preco' : 'ok'
  } catch (e) { return 'erro' }
}

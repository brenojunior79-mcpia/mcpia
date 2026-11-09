// Pagamento do plano por Pix (ordem do Breno): o plano da plataforma e so no cartao (Hubla), mas quem quiser pode pagar no Pix do Breno.
// O Junior manda a chave SOZINHA numa mensagem (para a pessoa copiar), pede o comprovante e o SISTEMA confere e libera o plano.
// Quem libera e este arquivo (nunca a IA): le o comprovante, confere valor/destinatario/data, bloqueia comprovante repetido e guarda tudo em pix_comprovantes.

import { createHash } from 'crypto'
import { LINK_PLATAFORMA } from '@/lib/juniorAssinatura'

export const CHAVE_PIX = '37999521440'
export const MARCA_PIX = '[[CHAVE_PIX]]'
export const SEPARADOR_PARTE = '[[PARTE]]'
const DIAS_VALIDADE_PIX = 31
const HORAS_FLUXO = 72 // a chave foi enviada ha menos de 72h
const HORAS_COMPROVANTE = 48 // o Pix precisa ter sido feito nas ultimas 48h

const PRECOS: { nome: string; valor: number }[] = [
  { nome: 'Starter', valor: 39.9 },
  { nome: 'Pro', valor: 49.9 },
  { nome: 'Premium', valor: 79.9 },
]

export const REGRA_PIX = `# PAGAMENTO DO PLANO NO PIX (ORDEM DO BRENO - PRIORIDADE MAXIMA, sobrepoe a base)
- O plano da plataforma (Starter R$ 39,90, Pro R$ 49,90, Premium R$ 79,90) e pago no CARTAO DE CREDITO pelo link do plano. Esse e o jeito normal.
- So fale de Pix se a PESSOA pedir para pagar no Pix (ou disser que nao tem cartao / o cartao nao passa). Nunca ofereca o Pix antes.
- Se ela quiser pagar no Pix e ainda nao disse qual plano: pergunte so qual plano (Starter, Pro ou Premium) com os valores.
- Quando ela escolher o plano, responda com um texto curto dizendo: o valor do plano; que o Pix e para Breno Junio de Souza, Banco Inter, chave celular; que a chave vai na proxima mensagem para ela copiar; e que depois de pagar ela manda o comprovante (print ou PDF) aqui na conversa que voce libera o plano. No FIM desse texto escreva a marca ${MARCA_PIX}. O sistema coloca a chave sozinha em outra mensagem.
- NUNCA escreva o numero da chave Pix voce mesmo: so a marca ${MARCA_PIX}. Nunca mande a chave junto com outro texto.
- Quando ela mandar o comprovante, o SISTEMA confere e libera na mesma hora: nao diga que liberou nem que o pagamento foi confirmado antes disso, e nao use marcas de atendente por causa do comprovante.
- Se ela disser que ja pagou no Pix e ainda nao mandou o comprovante: peca o comprovante (print ou PDF do Pix feito).
- Pix nao renova sozinho: o plano pago no Pix vale 31 dias. Para renovar, ela paga de novo e manda o comprovante.`

// Troca a marca pela chave sozinha numa mensagem propria (e tira a chave de dentro do texto do modelo)
export function prepararRespostaPix(texto: string, pode: boolean): string {
  const t0 = String(texto || '')
  const reChave = /\(?\s*37\s*\)?[\s.\-]*9[\s.\-]*9952[\s.\-]*1440/g
  const temMarca = t0.indexOf(MARCA_PIX) >= 0
  const temChave = reChave.test(t0)
  if (!temMarca && !temChave) return t0
  reChave.lastIndex = 0
  const limpo = t0.split(MARCA_PIX).join('').replace(reChave, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!pode) return limpo
  return (limpo ? limpo + SEPARADOR_PARTE : '') + CHAVE_PIX
}

function chaveEnviadaRecentemente(linhas: any[]): boolean {
  const limite = Date.now() - HORAS_FLUXO * 3600 * 1000
  return (linhas || []).some(function(m) {
    return m.direction === 'out' && String(m.body || '').replace(/\D/g, '') === CHAVE_PIX && new Date(m.created_at).getTime() >= limite
  })
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

export function fluxoPixAtivo(linhas: any[]): boolean {
  return chaveEnviadaRecentemente(linhas)
}

function brl(v: number): string {
  return 'R$ ' + v.toFixed(2).replace('.', ',')
}

function semAcento(s: any): string {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

type Leitura = {
  eh_comprovante: boolean
  valor: number | null
  data_hora: string | null
  concluido: boolean
  destinatario_nome: string
  destinatario_chave: string
  id_transacao: string
  pagador_nome: string
  suspeita_edicao: boolean
}

const PROMPT_LEITURA = `Voce le comprovantes de Pix brasileiros (print ou PDF do app do banco). Responda SOMENTE um JSON com estes campos:
{"eh_comprovante": true/false (e mesmo um comprovante de Pix/transferencia?),
 "valor": numero em reais (ex: 49.9) ou null,
 "data_hora": "AAAA-MM-DDTHH:MM:SS" no horario de Brasilia, ou null se nao aparecer,
 "concluido": true se o comprovante mostra Pix efetuado/concluido/realizado; false se agendado, pendente, falhou ou nao da para saber,
 "destinatario_nome": nome de quem RECEBEU,
 "destinatario_chave": chave Pix de quem recebeu como aparece (pode estar parcialmente oculta), ou "",
 "id_transacao": ID da transacao / codigo de autenticacao / E2E como aparece, ou "",
 "pagador_nome": nome de quem pagou, ou "",
 "suspeita_edicao": true se a imagem parece editada/montada (fontes diferentes, valores desalinhados, recorte estranho)}
Nao invente: se um campo nao aparece, use null ou "".`

async function lerComprovante(partes: any[]): Promise<Leitura | null> {
  for (const modelo of ['gpt-4o', 'gpt-4o-mini']) {
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelo,
          response_format: { type: 'json_object' },
          temperature: 0,
          max_tokens: 500,
          messages: [{ role: 'system', content: PROMPT_LEITURA }, { role: 'user', content: [{ type: 'text', text: 'Leia este comprovante.' }, ...partes] }],
        }),
        signal: AbortSignal.timeout(25000),
      })
      const j: any = await resp.json().catch(function() { return null })
      if (!resp.ok) continue
      const txt = String(j?.choices?.[0]?.message?.content || '')
      const o: any = JSON.parse(txt)
      const valor = typeof o.valor === 'number' ? o.valor : parseFloat(String(o.valor || '').replace(/[^\d,.]/g, '').replace(',', '.'))
      return {
        eh_comprovante: o.eh_comprovante === true,
        valor: isFinite(valor) ? Math.round(valor * 100) / 100 : null,
        data_hora: o.data_hora ? String(o.data_hora) : null,
        concluido: o.concluido === true,
        destinatario_nome: String(o.destinatario_nome || ''),
        destinatario_chave: String(o.destinatario_chave || ''),
        id_transacao: String(o.id_transacao || '').trim(),
        pagador_nome: String(o.pagador_nome || ''),
        suspeita_edicao: o.suspeita_edicao === true,
      }
    } catch (e) { /* tenta o proximo modelo */ }
  }
  return null
}

function hashDasPartes(partes: any[]): string {
  const h = createHash('sha256')
  for (const p of partes) {
    const s = p?.image_url?.url || p?.file?.file_data || ''
    h.update(String(s))
  }
  return h.digest('hex')
}

type Saida = { texto: string; humano: boolean } | null

async function registrar(db: any, linha: any): Promise<{ ok: boolean; duplicado: boolean }> {
  const r = await db.from('pix_comprovantes').insert(linha)
  if (r.error) {
    if (String(r.error.code) === '23505') return { ok: false, duplicado: true }
    console.error('[pix] registrar:', r.error.message)
    return { ok: false, duplicado: false }
  }
  return { ok: true, duplicado: false }
}

// Libera o plano (depois de tudo conferido). Insere o registro ANTES de liberar: os indices unicos impedem usar o mesmo comprovante duas vezes, mesmo em duas mensagens ao mesmo tempo.
async function liberar(db: any, p: { perfilId: string; email: string; convId: string; waId: string; plano: string; valor: number; leitura: Leitura; hash: string; quando: string | null }): Promise<Saida> {
  const pl = await db.from('plans').select('id').eq('name', p.plano).maybeSingle()
  const planoId = (pl.data as any)?.id
  if (!planoId) return { humano: true, texto: 'Recebi o seu comprovante, mas não consegui liberar agora. Deixei tudo registrado aqui para conferir o seu pagamento.' }
  const base = { profile_id: p.perfilId, conversation_id: p.convId, wa_id: p.waId, valor: p.valor, plano: p.plano, id_transacao: p.leitura.id_transacao || null, hash_arquivo: p.hash, data_pagamento: p.quando, dados: p.leitura as any }
  const reg = await registrar(db, { ...base, resultado: 'liberado', motivo: null })
  if (reg.duplicado) {
    await registrar(db, { ...base, id_transacao: null, hash_arquivo: null, resultado: 'recusado', motivo: 'comprovante ja usado' })
    return { humano: true, texto: 'Esse comprovante já foi usado para liberar um plano antes. Se for outro pagamento, me manda o comprovante do Pix novo.' }
  }
  if (!reg.ok) return { humano: true, texto: 'Recebi o seu comprovante, mas não consegui liberar agora. Deixei tudo registrado aqui para conferir o seu pagamento.' }

  const perfil = await db.from('profiles').select('pix_valido_ate, payment_provider, subscription_status').eq('id', p.perfilId).maybeSingle()
  const atual = (perfil.data as any) || {}
  // Renovacao no Pix: soma a partir do fim do periodo atual (se ainda vale)
  const fimAtual = atual.payment_provider === 'pix_manual' && atual.pix_valido_ate ? new Date(atual.pix_valido_ate).getTime() : 0
  const inicio = Math.max(Date.now(), fimAtual)
  const validoAte = new Date(inicio + DIAS_VALIDADE_PIX * 86400000)
  const up = await db.from('profiles').update({
    subscription_status: 'active',
    plan_id: planoId,
    payment_provider: 'pix_manual',
    pix_valido_ate: validoAte.toISOString(),
    credits_videos_used: 0,
    credits_ebooks_used: 0,
    credits_sites_used: 0,
    refunded_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', p.perfilId)
  if (up.error) {
    console.error('[pix] update perfil:', up.error.message)
    await db.from('pix_comprovantes').update({ resultado: 'erro', motivo: 'falha ao liberar: ' + up.error.message.slice(0, 120) }).eq('hash_arquivo', p.hash).eq('resultado', 'liberado')
    return { humano: true, texto: 'Recebi o seu comprovante, mas não consegui liberar agora. Deixei tudo registrado aqui para conferir o seu pagamento.' }
  }
  try {
    await db.from('hubla_events').insert({ provider: 'junior', event_type: 'junior.pix_liberado', email: p.email, user_id: p.perfilId, action: 'liberado', note: ('Junior liberou o plano ' + p.plano + ' por Pix manual (' + brl(p.valor) + ', valido ate ' + validoAte.toISOString().slice(0, 10) + ')').slice(0, 300) })
  } catch (e) { /* historico e so conforto */ }
  const ate = validoAte.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return {
    humano: false,
    texto: 'Pronto! Recebi o seu Pix de ' + brl(p.valor) + ' e liberei o seu plano ' + p.plano + ' ✅\n\nEntre na plataforma (' + LINK_PLATAFORMA + ') e atualize a página (ou saia e entre de novo). O plano vale até ' + ate + '. Para renovar, é só pagar o Pix de novo e me mandar o comprovante aqui. 🙏',
  }
}

function negar(motivoInterno: string, texto: string, humano: boolean): { motivo: string; saida: Saida } {
  return { motivo: motivoInterno, saida: { texto, humano } }
}

// Confere a leitura do comprovante. Devolve null se esta tudo certo, ou a recusa.
function conferir(l: Leitura, hashJaVisto: boolean): { motivo: string; saida: Saida } | null {
  const falha = 'Recebi o seu comprovante, mas não consegui confirmar o pagamento sozinho. Deixei tudo registrado aqui para conferir o seu Pix.'
  if (!l.eh_comprovante) return negar('nao parece comprovante', 'Não consegui ler isso como um comprovante de Pix. Pode me mandar o print (ou o PDF) do comprovante do pagamento, mostrando o valor, a data e para quem foi?', false)
  if (!l.concluido) return negar('pix nao concluido', 'Esse comprovante não mostra o Pix como concluído. Quando o pagamento for efetuado, me manda o comprovante final aqui.', false)
  if (l.suspeita_edicao) return negar('suspeita de edicao', falha, true)
  const nome = semAcento(l.destinatario_nome)
  const chave = String(l.destinatario_chave || '').replace(/\D/g, '')
  const nomeOk = nome.indexOf('breno') >= 0 && (nome.indexOf('junio') >= 0 || nome.indexOf('junior') >= 0 || nome.indexOf('souza') >= 0)
  const chaveOk = chave.length >= 4 && (CHAVE_PIX.indexOf(chave) >= 0 || chave.indexOf(CHAVE_PIX.slice(-8)) >= 0)
  if (!nomeOk && !chaveOk) return negar('destinatario diferente', 'Esse Pix não parece ter sido feito para a chave que eu te passei (Breno Junio de Souza). Confere o comprovante e me manda o certo?', false)
  if (l.valor == null) return negar('valor nao lido', falha, true)
  const plano = PRECOS.find(function(x) { return Math.abs(x.valor - (l.valor as number)) < 0.005 })
  if (!plano) return negar('valor nao bate com plano: ' + l.valor, 'O valor desse Pix (' + brl(l.valor) + ') não bate com nenhum plano (Starter ' + brl(39.9) + ', Pro ' + brl(49.9) + ' ou Premium ' + brl(79.9) + '). Deixei registrado aqui para conferir.', true)
  const t = l.data_hora ? new Date(l.data_hora + (/[zZ]|[+-]\d\d:?\d\d$/.test(l.data_hora) ? '' : '-03:00')).getTime() : NaN
  if (!isFinite(t)) return negar('data nao lida', falha, true)
  if (t > Date.now() + 3600000) return negar('data no futuro', falha, true)
  if (Date.now() - t > HORAS_COMPROVANTE * 3600000) return negar('comprovante antigo', 'Esse comprovante é de mais de 2 dias atrás. Se esse Pix é para o plano agora, deixei registrado aqui para conferir.', true)
  if (hashJaVisto) return negar('arquivo repetido', 'Esse comprovante já foi usado para liberar um plano antes. Se for outro pagamento, me manda o comprovante do Pix novo.', true)
  return null
}

// Chamado quando chega foto/PDF numa conversa em que a chave Pix foi enviada, ou texto com e-mail depois de um comprovante sem conta identificada.
// Devolve null quando nao e um caso de Pix (a conversa segue normal com o modelo).
export async function processarPixDaConversa(db: any, p: {
  convId: string; waId: string; perfilId: string | null; contasAtivas: { id: string; email: string }[]; contasTodas: { id: string; email: string }[]
  linhas: any[]; partes: any[]; ultimaEntrada: any
}): Promise<Saida> {
  if (!chaveEnviadaRecentemente(p.linhas)) return null
  const tipo = String(p.ultimaEntrada?.type || '')
  const corpo = String(p.ultimaEntrada?.body || '')

  // Caso 2: ja recebi um comprovante valido e estava esperando o e-mail da conta
  if (tipo === 'text' && EMAIL_RE.test(corpo)) {
    const pend = await db.from('pix_comprovantes').select('*').eq('conversation_id', p.convId).eq('resultado', 'aguardando_conta').order('created_at', { ascending: false }).limit(1).maybeSingle()
    const linha: any = pend.data
    if (!linha || Date.now() - new Date(linha.created_at).getTime() > 24 * 3600000) return null
    const email = (corpo.match(EMAIL_RE) as RegExpMatchArray)[0].toLowerCase()
    const pr = await db.from('profiles').select('id, email, is_admin').eq('email', email).maybeSingle()
    const perfil: any = pr.data
    if (!perfil) return { humano: false, texto: 'Não achei esse e-mail na plataforma. Confere se ele está certinho e me manda de novo?' }
    await db.from('pix_comprovantes').update({ resultado: 'concluido_conta' }).eq('id', linha.id)
    return await liberar(db, { perfilId: perfil.id, email, convId: p.convId, waId: p.waId, plano: linha.plano, valor: Number(linha.valor), leitura: linha.dados as Leitura, hash: linha.hash_arquivo, quando: linha.data_pagamento })
  }

  if (!(tipo === 'image' || tipo === 'document') || p.partes.length === 0) return null

  const hash = hashDasPartes(p.partes)
  const leitura = await lerComprovante(p.partes)
  if (!leitura) {
    await registrar(db, { conversation_id: p.convId, wa_id: p.waId, profile_id: p.perfilId, resultado: 'erro', motivo: 'leitura falhou', hash_arquivo: null })
    return { humano: true, texto: 'Recebi o seu comprovante, mas não consegui ler agora. Deixei tudo registrado aqui para conferir o seu Pix.' }
  }

  // Ja usado antes (mesmo arquivo ou mesmo ID de transacao)?
  let jaVisto = false
  const q1 = await db.from('pix_comprovantes').select('id', { head: true, count: 'exact' }).eq('resultado', 'liberado').eq('hash_arquivo', hash)
  if ((q1.count || 0) > 0) jaVisto = true
  if (!jaVisto && leitura.id_transacao) {
    const q2 = await db.from('pix_comprovantes').select('id', { head: true, count: 'exact' }).eq('resultado', 'liberado').ilike('id_transacao', leitura.id_transacao)
    if ((q2.count || 0) > 0) jaVisto = true
  }

  const rec = conferir(leitura, jaVisto)
  const tsData = leitura.data_hora ? new Date(leitura.data_hora + (/[zZ]|[+-]\d\d:?\d\d$/.test(leitura.data_hora) ? '' : '-03:00')) : null
  const quando = tsData && isFinite(tsData.getTime()) ? tsData.toISOString() : null
  if (rec) {
    await registrar(db, { conversation_id: p.convId, wa_id: p.waId, profile_id: p.perfilId, resultado: 'recusado', motivo: rec.motivo, valor: leitura.valor, id_transacao: null, hash_arquivo: null, data_pagamento: quando, dados: leitura as any })
    return rec.saida
  }

  const plano = (PRECOS.find(function(x) { return Math.abs(x.valor - (leitura.valor as number)) < 0.005 }) as { nome: string; valor: number })

  // Qual conta liberar: a da conversa; senao a unica ativa/unica do numero; senao pede o e-mail
  let alvo: { id: string; email: string } | null = null
  if (p.perfilId) {
    const pr = await db.from('profiles').select('id, email').eq('id', p.perfilId).maybeSingle()
    if (pr.data) alvo = { id: (pr.data as any).id, email: String((pr.data as any).email || '') }
  }
  if (!alvo) alvo = p.contasTodas.length === 1 ? p.contasTodas[0] : null
  if (!alvo) {
    await registrar(db, { conversation_id: p.convId, wa_id: p.waId, profile_id: null, resultado: 'aguardando_conta', motivo: 'comprovante ok, falta o e-mail da conta', valor: leitura.valor, plano: plano.nome, id_transacao: null, hash_arquivo: hash, data_pagamento: quando, dados: leitura as any })
    return { humano: false, texto: 'Recebi o seu comprovante de ' + brl(plano.valor) + ' ✅ Só preciso saber: qual e-mail você usa na plataforma?' }
  }

  // Conta ja tem plano pago por outro meio (cartao): nao mexe, o Breno confere
  const atual = await db.from('profiles').select('subscription_status, payment_provider, is_admin').eq('id', alvo.id).maybeSingle()
  const a: any = atual.data || {}
  if (a.is_admin !== true && a.subscription_status === 'active' && a.payment_provider && a.payment_provider !== 'pix_manual') {
    await registrar(db, { conversation_id: p.convId, wa_id: p.waId, profile_id: alvo.id, resultado: 'recusado', motivo: 'conta ja tem plano ativo por ' + a.payment_provider, valor: leitura.valor, id_transacao: null, hash_arquivo: null, data_pagamento: quando, dados: leitura as any })
    return { humano: true, texto: 'Recebi o seu comprovante, mas a sua conta já aparece com um plano ativo. Deixei registrado aqui para conferir o seu Pix.' }
  }

  return await liberar(db, { perfilId: alvo.id, email: alvo.email, convId: p.convId, waId: p.waId, plano: plano.nome, valor: leitura.valor as number, leitura, hash, quando })
}


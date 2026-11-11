import { tratarIA } from '@/lib/waIA'

// Retomada automatica: quando o assistente falha por motivo passageiro (ex.: acabou o credito da OpenAI), a conversa ficou com o aviso
// "O assistente nao conseguiu responder" e a pessoa sem resposta. Aqui o sistema tenta de novo sozinho, a cada minuto, ate 3 vezes por mensagem.
// So mexe em conversa cuja ULTIMA mensagem e da pessoa e e mais antiga que o aviso de falha (nada foi respondido depois).

const CHAVE = 'retomada_falhas'
const AVISO = '%assistente não conseguiu responder%'
const AVISO_HORARIO = 'Olá! 👋 Nosso atendimento'
const JANELA_FALHA_MS = 8 * 3600 * 1000
const JANELA_WHATSAPP_MS = 23.5 * 3600 * 1000
const MAX_TENTATIVAS = 3
const ESPERA_ENTRE_MS = 90 * 1000
const POR_VEZ = 4

export async function retomarFalhas(admin: any): Promise<number> {
  try {
    const desde = new Date(Date.now() - JANELA_FALHA_MS).toISOString()
    const f = await admin.from('wa_messages').select('conversation_id, created_at').eq('type', 'system').eq('direction', 'out').ilike('body', AVISO).gte('created_at', desde).order('created_at', { ascending: false }).limit(200)
    const ultimaFalha: Record<string, string> = {}
    for (const r of (f.data || []) as any[]) { const c = String(r.conversation_id); if (!ultimaFalha[c]) ultimaFalha[c] = String(r.created_at) }
    const convIds = Object.keys(ultimaFalha)
    if (convIds.length === 0) return 0

    await admin.from('wa_settings').upsert({ key: CHAVE, value: {}, updated_at: new Date().toISOString() }, { onConflict: 'key', ignoreDuplicates: true })
    const st = await admin.from('wa_settings').select('value').eq('key', CHAVE).maybeSingle()
    const estado: Record<string, { n: number; em: string }> = ((st.data as any)?.value) || {}
    let feitas = 0
    let mudou = false

    for (const convId of convIds) {
      const falhouEm = ultimaFalha[convId]
      if (feitas >= POR_VEZ) break
      const cv = await admin.from('wa_conversations').select('id, wa_id, name, ia_humano').eq('id', convId).maybeSingle()
      const conv: any = cv.data
      if (!conv || conv.ia_humano === true) continue
      const ms = await admin.from('wa_messages').select('id, direction, type, body, created_at, sent_by').eq('conversation_id', convId).neq('type', 'system').order('created_at', { ascending: false }).limit(6)
      const linhas: any[] = (ms.data || []).filter(function(m: any) { return !(m.direction === 'out' && String(m.body || '').startsWith(AVISO_HORARIO)) })
      const ultima = linhas[0]
      // Ja foi respondida (pela equipe ou pelo assistente) ou a pessoa nao esta esperando
      if (!ultima || ultima.direction !== 'in') continue
      // A falha tem que ser desta mensagem (o aviso e mais novo que ela)
      if (new Date(String(ultima.created_at)).getTime() > new Date(falhouEm).getTime() + 5000) continue
      if (Date.now() - new Date(String(ultima.created_at)).getTime() > JANELA_WHATSAPP_MS) continue
      const msgId = String(ultima.id)
      const ja = estado[msgId]
      if (ja && (ja.n >= MAX_TENTATIVAS || Date.now() - new Date(ja.em).getTime() < ESPERA_ENTRE_MS)) continue
      // Ja tem resposta na fila para esta conversa
      const fila = await admin.from('wa_ia_fila').select('id').eq('conversation_id', convId).in('estado', ['pendente', 'enviando']).limit(1)
      if ((fila.data || []).length > 0) continue
      // Falha mais nova que a ultima tentativa nao conta como "outra": so tenta se ja passou o intervalo
      estado[msgId] = { n: (ja?.n || 0) + 1, em: new Date().toISOString() }
      mudou = true
      feitas++
      const t0 = Date.now()
      const ret = await tratarIA(admin, convId, String(conv.wa_id), msgId, String(ultima.type), conv.name || null).catch(function(e: any) { console.error('[wa-retomada]', e); return 'erro' })
      console.log('[wa-retomada] conv=' + convId + ' tipo=' + ultima.type + ' retorno=' + String(ret) + ' ms=' + (Date.now() - t0))
    }
    if (mudou) {
      // guarda so as tentativas recentes
      const lim = Date.now() - 24 * 3600 * 1000
      for (const k of Object.keys(estado)) { if (new Date(estado[k].em).getTime() < lim) delete estado[k] }
      await admin.from('wa_settings').update({ value: estado, updated_at: new Date().toISOString() }).eq('key', CHAVE)
    }
    return feitas
  } catch (e) {
    console.error('[wa-retomada] erro:', e)
    return 0
  }
}


// Quem escreveu FORA do horario de atendimento recebe so o aviso de horario. Quando o horario abre, o Junior responde todas essas pessoas
// (ordem do Breno). Roda a cada minuto dentro do horario ate acabar; cada mensagem e tentada uma vez (a falha passageira cai na retomada acima).
const CHAVE_FORA = 'fora_horario'
export async function responderForaDoHorario(admin: any): Promise<number> {
  try {
    const desde = new Date(Date.now() - JANELA_WHATSAPP_MS).toISOString()
    const av = await admin.from('wa_messages').select('conversation_id, created_at').eq('direction', 'out').ilike('body', AVISO_HORARIO + '%').gte('created_at', desde).order('created_at', { ascending: false }).limit(300)
    const convIds: string[] = []
    for (const r of (av.data || []) as any[]) { const c = String(r.conversation_id); if (convIds.indexOf(c) < 0) convIds.push(c) }
    if (convIds.length === 0) return 0
    await admin.from('wa_settings').upsert({ key: CHAVE_FORA, value: {}, updated_at: new Date().toISOString() }, { onConflict: 'key', ignoreDuplicates: true })
    const st = await admin.from('wa_settings').select('value').eq('key', CHAVE_FORA).maybeSingle()
    const estado: Record<string, string> = ((st.data as any)?.value) || {}
    let feitas = 0
    let mudou = false
    for (const convId of convIds) {
      if (feitas >= 5) break
      const ms = await admin.from('wa_messages').select('id, direction, type, body, created_at').eq('conversation_id', convId).neq('type', 'system').order('created_at', { ascending: false }).limit(6)
      const linhas: any[] = (ms.data || []).filter(function(m: any) { return !(m.direction === 'out' && String(m.body || '').startsWith(AVISO_HORARIO)) })
      const ultima = linhas[0]
      if (!ultima || ultima.direction !== 'in') continue
      if (Date.now() - new Date(String(ultima.created_at)).getTime() > JANELA_WHATSAPP_MS) continue
      const msgId = String(ultima.id)
      if (estado[msgId]) continue
      const cv = await admin.from('wa_conversations').select('id, wa_id, name, ia_humano').eq('id', convId).maybeSingle()
      const conv: any = cv.data
      if (!conv || conv.ia_humano === true) continue
      const fila = await admin.from('wa_ia_fila').select('id').eq('conversation_id', convId).in('estado', ['pendente', 'enviando']).limit(1)
      if ((fila.data || []).length > 0) continue
      estado[msgId] = new Date().toISOString()
      mudou = true
      feitas++
      const ret = await tratarIA(admin, convId, String(conv.wa_id), msgId, String(ultima.type), conv.name || null).catch(function(e: any) { console.error('[wa-fora-horario]', e); return 'erro' })
      console.log('[wa-fora-horario] conv=' + convId + ' retorno=' + String(ret))
    }
    if (mudou) {
      const lim = Date.now() - 48 * 3600 * 1000
      for (const k of Object.keys(estado)) { if (new Date(estado[k]).getTime() < lim) delete estado[k] }
      await admin.from('wa_settings').update({ value: estado, updated_at: new Date().toISOString() }).eq('key', CHAVE_FORA)
    }
    return feitas
  } catch (e) {
    console.error('[wa-fora-horario] erro:', e)
    return 0
  }
}

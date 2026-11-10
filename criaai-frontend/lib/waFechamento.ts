import { estadoAgendaIA, tratarIA } from '@/lib/waIA'
import { agoraNoFuso } from '@/lib/waHours'

// Fechamento do dia (ordem do Breno): quando o horario de atendimento termina (ex.: 20:00), o Junior
//  1) da a ULTIMA RESPOSTA para quem ainda esta esperando (mensagem da pessoa sem resposta, dentro das 24h do WhatsApp);
//  2) depois marca TODAS as conversas como lidas e finaliza todas.
// Se a pessoa escrever de novo, a conversa reabre sozinha. Conversas que o Junior passou para a equipe (ou que a equipe
// assumiu e a pessoa esta esperando) ficam ABERTAS e nao lidas, para a equipe ver no dia seguinte.
// Roda uma vez por dia (estado em wa_settings, chave "fechamento_dia"), chamado a cada minuto pelo agendador /api/whatsapp/auto/run.

const CHAVE = 'fechamento_dia'
const TIPOS_RESPONDIVEIS = ['text', 'audio', 'image', 'document']
const JANELA_MS = 23.5 * 3600 * 1000
const LIMITE_TOTAL_MS = 20 * 60 * 1000
const RESPOSTAS_POR_VEZ = 5
const AVISO_HORARIO = 'Olá! 👋 Nosso atendimento'

type Estado = {
  data: string
  fase: 'andamento' | 'concluido'
  inicio: string
  tentativas: Record<string, number>
  tentouEm: Record<string, string>
  deixadas: string[]
  forcadas: string[]
  finalizadas: number
}

function hojeSP(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

async function salvar(admin: any, e: Estado): Promise<void> {
  await admin.from('wa_settings').update({ value: e, updated_at: new Date().toISOString() }).eq('key', CHAVE)
}

export async function fecharDia(admin: any): Promise<string> {
  try {
    const a = await estadoAgendaIA(admin)
    if (!a.agendaAtiva || a.dentro) return 'fora'
    const agora = agoraNoFuso('America/Sao_Paulo')
    // So depois do FIM do horario, no mesmo dia (nao roda de madrugada)
    if (!(a.inicio < a.fim && agora.hm >= a.fim)) return 'fora'
    const hoje = hojeSP()

    await admin.from('wa_settings').upsert({ key: CHAVE, value: { data: '', fase: 'concluido' }, updated_at: new Date().toISOString() }, { onConflict: 'key', ignoreDuplicates: true })
    const st = await admin.from('wa_settings').select('value').eq('key', CHAVE).maybeSingle()
    let e: Estado = (st.data as any)?.value
    if (!e) return 'sem-estado'
    if (e.data === hoje && e.fase === 'concluido') return 'feito'

    if (e.data !== hoje) {
      // Primeira vez hoje: quem pegar o estado primeiro faz (as outras execucoes seguem so acompanhando)
      const novo: Estado = { data: hoje, fase: 'andamento', inicio: new Date().toISOString(), tentativas: {}, tentouEm: {}, deixadas: [], forcadas: [], finalizadas: 0 }
      const claim = await admin.from('wa_settings').update({ value: novo, updated_at: new Date().toISOString() }).eq('key', CHAVE).neq('value->>data', hoje).select('key')
      if (claim.error || !claim.data || claim.data.length === 0) return 'outra-execucao'
      e = novo
    }

    const inicioMs = new Date(e.inicio).getTime()
    const vencido = Date.now() - inicioMs > LIMITE_TOTAL_MS
    const q = await admin.from('wa_conversations').select('id, wa_id, name, ia_ativa, ia_humano, last_inbound_at').or('status.eq.aberta,unread.gt.0').limit(300)
    const convs: any[] = (q.data || []).filter(function(c: any) { return e.deixadas.indexOf(String(c.id)) < 0 })

    const finalizar: string[] = []
    const desligar: string[] = []
    const responder: any[] = []
    let esperando = 0

    for (const c of convs) {
      const id = String(c.id)
      // Chegou mensagem nova depois do inicio do fechamento: e outra conversa, nao mexe (reabre e segue o fluxo normal)
      if (c.last_inbound_at && new Date(c.last_inbound_at).getTime() > inicioMs + 60000) { e.deixadas.push(id); continue }
      const ms = await admin.from('wa_messages').select('id, direction, type, body, created_at').eq('conversation_id', id).neq('type', 'system').order('created_at', { ascending: false }).limit(8)
      // O aviso de horario de atendimento nao conta como resposta
      const linhas: any[] = (ms.data || []).filter(function(m: any) { return !(m.direction === 'out' && String(m.body || '').startsWith(AVISO_HORARIO)) })
      const ultima = linhas[0]
      const aguardando = !!ultima && ultima.direction === 'in'
      const foiPeloFechamento = e.forcadas.indexOf(id) >= 0

      // O Junior passou para a equipe depois da resposta do fechamento: fica aberta e nao lida para a equipe
      if (foiPeloFechamento && c.ia_humano === true) { e.deixadas.push(id); continue }
      // A equipe cuida (assistente desligado) e a pessoa esta esperando: fica aberta para a equipe
      if (c.ia_humano === true && aguardando) { e.deixadas.push(id); continue }

      const dentroDaJanela = aguardando && Date.now() - new Date(ultima.created_at).getTime() <= JANELA_MS
      const podeResponder = aguardando && dentroDaJanela && TIPOS_RESPONDIVEIS.indexOf(String(ultima.type)) >= 0

      if (!podeResponder) { finalizar.push(id); continue }

      const tentou = (e.tentativas[id] || 0) > 0
      if (!tentou) {
        if (vencido) { finalizar.push(id); continue }
        responder.push({ ...c, msgId: String(ultima.id), msgTipo: String(ultima.type) })
        continue
      }
      // Ja pedimos a resposta: espera sair (ou termina se o assistente decidiu nao responder)
      const f = await admin.from('wa_ia_fila').select('estado').eq('conversation_id', id).gte('criado_em', e.tentouEm[id] || e.inicio)
      const estados: string[] = (f.data || []).map(function(x: any) { return String(x.estado) })
      if (estados.some(function(s) { return s === 'pendente' || s === 'enviando' })) {
        if (vencido) finalizar.push(id)
        else esperando++
        continue
      }
      if (estados.some(function(s) { return s === 'falhou' || s === 'cancelado' })) { e.deixadas.push(id); if (foiPeloFechamento && c.ia_humano !== true) desligar.push(id); continue }
      // Nenhuma resposta saiu (ex.: a pessoa so agradeceu): encerra mesmo assim
      finalizar.push(id)
    }

    // 1) Ultima resposta: liga o assistente na conversa (vale a qualquer hora) e responde a mensagem pendente
    const lote = responder.slice(0, RESPOSTAS_POR_VEZ)
    for (const c of lote) {
      const id = String(c.id)
      e.tentativas[id] = 1
      e.tentouEm[id] = new Date().toISOString()
      if (c.ia_ativa !== true && e.forcadas.indexOf(id) < 0) e.forcadas.push(id)
      await admin.from('wa_conversations').update({ ia_ativa: true, ia_ativada_em: new Date().toISOString() }).eq('id', id)
    }
    await salvar(admin, e)
    await Promise.all(lote.map(function(c: any) { return tratarIA(admin, String(c.id), String(c.wa_id), c.msgId, c.msgTipo, c.name || null).catch(function(err: any) { console.error('[wa-fechamento] resposta:', err); return false }) }))
    esperando += lote.length
    const faltaResponder = responder.length - lote.length

    if (desligar.length) await admin.from('wa_conversations').update({ ia_ativa: false, ia_ativada_em: null }).in('id', desligar)

    // 2) Marca como lida e finaliza (as forcadas voltam ao estado de assistente normal)
    if (finalizar.length) {
      for (let i = 0; i < finalizar.length; i += 100) {
        const ids = finalizar.slice(i, i + 100)
        await admin.from('wa_conversations').update({ unread: 0, status: 'resolvida' }).in('id', ids)
        const volta = ids.filter(function(x) { return e.forcadas.indexOf(x) >= 0 })
        if (volta.length) await admin.from('wa_conversations').update({ ia_ativa: false, ia_ativada_em: null }).in('id', volta)
      }
      e.finalizadas += finalizar.length
    }

    if (esperando === 0 && faltaResponder === 0) {
      e.fase = 'concluido'
      console.log('[wa-fechamento] concluido: finalizadas=' + e.finalizadas + ' deixadas_para_equipe=' + e.deixadas.length)
    }
    await salvar(admin, e)
    return e.fase === 'concluido' ? 'concluido' : 'andamento'
  } catch (err) {
    console.error('[wa-fechamento] erro:', err)
    return 'erro'
  }
}

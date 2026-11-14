import { estadoAgendaIA } from '@/lib/waIA'
import { postMessage } from '@/lib/whatsapp'
import { AVISO_ENCERRAR_INICIO, MIN_AVISO_PROATIVO, avisoEncerramento, avisouEncerramentoHoje, inicioDoDiaSP } from '@/lib/waAvisoFim'
import { ehDespedida } from '@/lib/waDespedida'

// Nos ultimos minutos do horario de atendimento do SUPORTE, avisa quem esta em conversa que o suporte vai encerrar.
// Chamado a cada minuto pelo agendador (/api/whatsapp/auto/run). Regras:
//  - so o chat de suporte (conversa sem conexao de recuperacao), so dentro do horario, nos ultimos MIN_AVISO_PROATIVO minutos;
//  - so quem falou nos ultimos 90 minutos E ja foi respondido pelo assistente (se a ultima mensagem e da pessoa, a resposta do Junior ja leva o aviso);
//  - nao avisa conversa com atendente humano, nem quem ja se despediu/agradeceu, nem quem ja foi avisado hoje;
//  - uma vez por conversa por dia.
const CHAVE = 'aviso_encerramento'
const AVISO_HORARIO = 'Olá! 👋 Nosso atendimento'

export async function avisarEncerramentoSuporte(admin: any): Promise<number> {
  try {
    const a = await estadoAgendaIA(admin)
    if (!a.agendaAtiva || !a.dentro || a.minutosParaFechar === null || a.minutosParaFechar > MIN_AVISO_PROATIVO) return 0
    const hojeIni = inicioDoDiaSP()
    const hoje = new Date(hojeIni + 12 * 3600 * 1000).toISOString().slice(0, 10)
    await admin.from('wa_settings').upsert({ key: CHAVE, value: { dia: '', ids: [] }, updated_at: new Date().toISOString() }, { onConflict: 'key', ignoreDuplicates: true })
    const st = await admin.from('wa_settings').select('value').eq('key', CHAVE).maybeSingle()
    const estado: { dia: string; ids: string[] } = (st.data as any)?.value || { dia: '', ids: [] }
    const ids: string[] = estado.dia === hoje ? (estado.ids || []) : []

    const desde = new Date(Date.now() - 90 * 60000).toISOString()
    const q = await admin.from('wa_conversations').select('id, wa_id, ia_humano, connection_id').gte('last_inbound_at', desde).is('connection_id', null).order('last_inbound_at', { ascending: false }).limit(60)
    let enviados = 0
    for (const c of (q.data || []) as any[]) {
      if (enviados >= 10) break
      const id = String(c.id)
      if (c.ia_humano === true || ids.indexOf(id) >= 0 || !c.wa_id) continue
      const ms = await admin.from('wa_messages').select('direction, type, body, sent_by, created_at').eq('conversation_id', id).neq('type', 'system').order('created_at', { ascending: false }).limit(10)
      const linhas: any[] = ((ms.data || []) as any[]).filter(function(m) { return !(m.direction === 'out' && String(m.body || '').startsWith(AVISO_HORARIO)) })
      const ultima = linhas[0]
      if (!ultima || ultima.direction !== 'out') continue                       // ultima e da pessoa: o Junior ainda vai responder (e junta o aviso)
      if (new Date(String(ultima.created_at)).getTime() < Date.now() - 90 * 60000) continue
      if (linhas.some(function(m) { return m.direction === 'out' && m.sent_by && new Date(String(m.created_at)).getTime() >= Date.now() - 90 * 60000 })) continue // atendente humano entrou
      if (avisouEncerramentoHoje(linhas)) continue
      const ultIn = linhas.find(function(m) { return m.direction === 'in' })
      if (ultIn && ehDespedida(String(ultIn.body || '')) ) continue
      if (ehDespedida(String(ultima.body || ''))) continue                      // o assistente ja se despediu: conversa terminada
      // reserva antes de enviar (duas execucoes seguidas nao mandam em dobro)
      ids.push(id)
      await admin.from('wa_settings').update({ value: { dia: hoje, ids }, updated_at: new Date().toISOString() }).eq('key', CHAVE)
      const texto = avisoEncerramento(a.fim, false)
      const r = await postMessage({ messaging_product: 'whatsapp', to: String(c.wa_id), type: 'text', text: { body: texto } })
      if (!r.ok) {
        console.error('[aviso-encerramento] envio:', JSON.stringify(r.data?.error || r.data))
        ids.splice(ids.indexOf(id), 1)
        await admin.from('wa_settings').update({ value: { dia: hoje, ids }, updated_at: new Date().toISOString() }).eq('key', CHAVE)
        continue
      }
      const agora = new Date().toISOString()
      await admin.from('wa_messages').insert({ conversation_id: id, wa_message_id: r.data?.messages?.[0]?.id || null, direction: 'out', type: 'text', body: texto, status: 'sent', sent_by: null, created_at: agora })
      await admin.from('wa_conversations').update({ last_message_at: agora, last_text: '🤖 ' + texto.slice(0, 120) }).eq('id', id)
      enviados++
    }
    return enviados
  } catch (e) {
    console.error('[aviso-encerramento] erro:', e)
    return 0
  }
}

export { AVISO_ENCERRAR_INICIO, inicioDoDiaSP }

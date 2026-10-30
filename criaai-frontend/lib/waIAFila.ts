// Fila de respostas do assistente (Junior) no WhatsApp: ele responde "como uma pessoa".
// A resposta ja vem pronta da IA (lib/waIA.ts), mas so e enviada aqui: a mensagem aparece como lida, o WhatsApp mostra
// "digitando...", para um instante, volta a digitar e so entao a resposta chega (respostas longas saem em 2 ou 3 mensagens).
// O agendador do banco chama /api/whatsapp/ia/fila a cada 15 segundos; cada resposta espera a hora de leitura (ler_em).
import { graphFetch, phoneIdDaConversa, postMessage, waConfig } from '@/lib/whatsapp'
import { modoIA } from '@/lib/waIA'

const LIMITE_MS = 56000 // a funcao da Vercel vive no maximo 60s

function esperar(ms: number): Promise<void> { return new Promise(function(r) { setTimeout(r, Math.max(0, ms)) }) }
function entre(a: number, b: number): number { return a + Math.random() * (b - a) }

// Quebra a resposta em mensagens curtas, como uma pessoa escreve (no maximo 3)
export function dividirEmPartes(texto: string): string[] {
  const limpo = String(texto || '').trim()
  let partes = limpo.split(/\n{2,}/).map(function(s) { return s.trim() }).filter(Boolean)
  if (partes.length === 1 && limpo.length > 150 && limpo.indexOf('\n') < 0) {
    const meio = limpo.length / 2
    const re = /[.!?]["')\]]?\s+/g
    let melhor = -1
    let m: RegExpExecArray | null
    while ((m = re.exec(limpo)) !== null) {
      const fim = m.index + m[0].length
      if (melhor < 0 || Math.abs(fim - meio) < Math.abs(melhor - meio)) melhor = fim
    }
    if (melhor > 40 && melhor < limpo.length - 40) partes = [limpo.slice(0, melhor).trim(), limpo.slice(melhor).trim()]
  }
  if (partes.length > 3) partes = [partes[0], partes[1], partes.slice(2).join('\n\n')]
  return partes.length ? partes : [limpo]
}

// Marca a mensagem da pessoa como lida e mostra "digitando..." (some sozinho em ate 25s ou quando a resposta chega)
async function digitando(phoneId: string, mensagemWaId: string | null) {
  if (!mensagemWaId) return
  try {
    const id = phoneId || waConfig().phoneId
    await graphFetch(id + '/messages', { method: 'POST', json: { messaging_product: 'whatsapp', status: 'read', message_id: mensagemWaId, typing_indicator: { type: 'text' } } })
  } catch (e) { /* so enfeite: se falhar, a resposta sai do mesmo jeito */ }
}

function tempoDigitando(texto: string): number {
  return Math.min(13000, Math.max(3500, texto.length * 55)) + entre(0, 1500)
}

// Ainda faz sentido responder? (assistente ligado, aluno nao escreveu de novo, equipe nao assumiu)
async function aindaPodeResponder(admin: any, it: any): Promise<boolean> {
  const cv = await admin.from('wa_conversations').select('id, ia_ativa, ia_humano').eq('id', it.conversation_id).maybeSingle()
  if (!cv.data || !(await modoIA(admin, cv.data))) return false
  const ult = await admin.from('wa_messages').select('id').eq('conversation_id', it.conversation_id).eq('direction', 'in').order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!ult.data || String((ult.data as any).id) !== String(it.inbound_msg_id)) return false
  const eq = await admin.from('wa_messages').select('id').eq('conversation_id', it.conversation_id).eq('direction', 'out').not('sent_by', 'is', null).gte('created_at', it.criado_em).limit(1)
  return (eq.data || []).length === 0
}

async function enviarParte(admin: any, it: any, phoneId: string, texto: string): Promise<boolean> {
  const r = await postMessage({ messaging_product: 'whatsapp', to: it.wa_id, type: 'text', text: { body: texto } }, phoneId || undefined)
  if (!r.ok) { console.error('[wa-ia-fila] envio:', JSON.stringify(r.data?.error || r.data)); return false }
  const agora = new Date().toISOString()
  await admin.from('wa_messages').insert({ conversation_id: it.conversation_id, wa_message_id: r.data?.messages?.[0]?.id || null, direction: 'out', type: 'text', body: texto, status: 'sent', sent_by: null, created_at: agora })
  await admin.from('wa_conversations').update({ last_message_at: agora, last_text: '🤖 ' + texto.slice(0, 120) }).eq('id', it.conversation_id)
  return true
}

async function executar(admin: any, it: any, inicio: number, escala: number): Promise<string> {
  const claim = await admin.from('wa_ia_fila').update({ estado: 'enviando', iniciado_em: new Date().toISOString() }).eq('id', it.id).eq('estado', 'pendente').select('id')
  if (!claim.data || claim.data.length === 0) return 'ja_pego'
  const fim = async function(estado: string, erro?: string) {
    await admin.from('wa_ia_fila').update({ estado, erro: erro || null, finalizado_em: new Date().toISOString() }).eq('id', it.id)
    return estado
  }
  try {
    const restante = function() { return inicio + LIMITE_MS * escala - Date.now() }
    const phoneId = await phoneIdDaConversa(admin, it.connection_id || null)
    let partes = dividirEmPartes(it.texto)
    let enviadas = 0
    for (let i = 0; i < partes.length; i++) {
      let parte = partes[i]
      // Sem tempo para as proximas: manda o que falta de uma vez
      if (i > 0 && restante() < (tempoDigitando(parte) + 5000) * escala) { parte = partes.slice(i).join('\n\n'); partes = partes.slice(0, i + 1) }
      if (i === 0 && partes.length === 1 && parte.length >= 90) {
        // Resposta longa numa mensagem so: digita, para um instante e volta a digitar
        await digitando(phoneId, it.inbound_wa_id)
        await esperar(25500 * escala)
        await esperar(entre(4000, 8000) * escala)
        await digitando(phoneId, it.inbound_wa_id)
        await esperar(entre(8000, 12000) * escala)
      } else {
        if (i > 0) await esperar(entre(1500, 3500) * escala)
        await digitando(phoneId, it.inbound_wa_id)
        await esperar(tempoDigitando(parte) * escala)
      }
      if (!(await aindaPodeResponder(admin, it))) return await fim('cancelado', enviadas ? 'cancelada no meio (aluno escreveu de novo ou equipe assumiu)' : 'aluno escreveu de novo ou equipe assumiu')
      if (!(await enviarParte(admin, it, phoneId, parte))) return await fim('falhou', 'envio recusado')
      enviadas++
    }
    // Pediu ajuda humana: o assistente se desliga sozinho nessa conversa para a equipe assumir
    // e a conversa vai para o dono (admin), se ainda nao tiver atendente
    if (it.passa_humano) {
      const upd: any = { ia_ativa: false, ia_humano: true }
      try {
        const cv = await admin.from('wa_conversations').select('assigned_to').eq('id', it.conversation_id).maybeSingle()
        if (cv.data && !(cv.data as any).assigned_to) {
          const dono = await admin.from('profiles').select('id').eq('is_admin', true).order('created_at', { ascending: true }).limit(1).maybeSingle()
          if (dono.data?.id) upd.assigned_to = (dono.data as any).id
        }
      } catch (e) { /* sem dono: segue so desligando o assistente */ }
      await admin.from('wa_conversations').update(upd).eq('id', it.conversation_id)
    } else {
      // O assistente respondeu: marca a conversa como lida (se a pessoa nao escreveu de novo nesse meio tempo).
      // Quando passa para a equipe, continua como nao lida para a equipe ver.
      try {
        const ult = await admin.from('wa_messages').select('id').eq('conversation_id', it.conversation_id).eq('direction', 'in').order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (ult.data && String((ult.data as any).id) === String(it.inbound_msg_id)) await admin.from('wa_conversations').update({ unread: 0 }).eq('id', it.conversation_id)
      } catch (e) { /* marcar como lida e so conforto */ }
    }
    return await fim('enviado')
  } catch (e: any) {
    console.error('[wa-ia-fila] erro:', e)
    return await fim('falhou', String(e?.message || e).slice(0, 200))
  }
}

// Chamado a cada 15 segundos. escala so serve para testar (1 = tempos reais)
export async function processarFilaIA(admin: any, escala = 1): Promise<{ itens: number; resultado: Record<string, number> }> {
  const inicio = Date.now()
  const agora = new Date()
  await admin.from('wa_ia_fila').update({ estado: 'falhou', erro: 'travou', finalizado_em: agora.toISOString() }).eq('estado', 'enviando').lt('iniciado_em', new Date(agora.getTime() - 5 * 60000).toISOString())
  await admin.from('wa_ia_fila').update({ estado: 'cancelado', erro: 'vencida', finalizado_em: agora.toISOString() }).eq('estado', 'pendente').lt('criado_em', new Date(agora.getTime() - 15 * 60000).toISOString())
  // So pega o que ja esta na hora de ser lido (ler_em); o agendador passa a cada 15s
  const q = await admin.from('wa_ia_fila').select('*').eq('estado', 'pendente').or('ler_em.is.null,ler_em.lte.' + agora.toISOString()).order('criado_em', { ascending: true }).limit(8)
  const itens: any[] = q.data || []
  const resultado: Record<string, number> = {}
  const fim = await Promise.all(itens.map(function(it) { return executar(admin, it, inicio, escala) }))
  fim.forEach(function(e) { resultado[e] = (resultado[e] || 0) + 1 })
  return { itens: itens.length, resultado }
}

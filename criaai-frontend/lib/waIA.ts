// Assistente de IA (Junior) dentro das conversas do WhatsApp (suporte e recuperacao).
// So responde nas conversas em que o ADMIN ligou o assistente (wa_conversations.ia_ativa) ou quando ele ligou para todas (wa_ia_config.geral).
import { JUNIOR_PROMPT, FINAL_REMINDER, NEW_STUDENT_RULE } from '@/lib/junior'
import { phoneIdDaConversa, postMessage } from '@/lib/whatsapp'

const MARCA_HUMANO = '[[HUMANO]]'

const REGRAS_WHATSAPP = `# REGRAS DESTE ATENDIMENTO NO WHATSAPP (PRIORIDADE MAXIMA)
- Voce esta conversando com uma pessoa pelo WhatsApp. Se perguntarem, diga que e o Junior, assistente virtual da equipe. Nunca diga que e uma pessoa.
- Escreva mensagens curtas (ate umas 4 linhas), simples e acolhedoras, em portugues do Brasil. Sem markdown (nada de **, #, tabelas). No maximo 1 ou 2 emojis.
- Va com calma: um passo por vez, e espere a pessoa responder.
- Use SOMENTE o que esta na base de conhecimento. Nunca invente preco, desconto, prazo, promessa de ganho ou funcionalidade.
- Pagamento, cobranca, reembolso, negociacao, desconto, acesso que depende de acao administrativa, reclamacao seria ou pedido para falar com uma pessoa: avise que um atendente da equipe vai continuar a conversa em breve e termine a resposta com a marca ${MARCA_HUMANO} (a marca e removida antes do envio).
- Se nao souber responder com a base, faca o mesmo: avise que um atendente vai ajudar e termine com ${MARCA_HUMANO}.
- Nao peca para a pessoa chamar o WhatsApp de Suporte: ela ja esta falando com o suporte.`

const REGRAS_CANAL: Record<string, string> = {
  suporte: '# CANAL: SUPORTE\nEsta pessoa fala com o Suporte da plataforma e da mentoria (normalmente aluno). Ajude a resolver a duvida ou dificuldade.',
  recuperacao: '# CANAL: RECUPERACAO\nEsta pessoa foi contatada pela equipe porque iniciou uma compra e nao concluiu (ou acabou de comprar). Responda as duvidas dela com carinho, sem pressionar, e sem inventar condicoes. Questoes de pagamento, desconto ou negociacao vao para um atendente.',
}

function rotuloTipo(t: string): string {
  return t === 'image' ? '[imagem]' : t === 'audio' ? '[audio]' : t === 'video' ? '[video]' : t === 'document' ? '[documento]' : t === 'sticker' ? '[figurinha]' : ''
}

// Quando o assistente deve responder nesta conversa:
//  - 'manual': o admin ligou nesta conversa (ia_ativa)
//  - 'geral': o admin ligou o assistente para TODAS as conversas (wa_ia_config.geral), a conversa nao foi desligada
//    de proposito (ia_humano) e a equipe nao respondeu nas ultimas 12 horas (nesse caso a equipe segue sozinha)
async function modoIA(admin: any, conv: any): Promise<'manual' | 'geral' | null> {
  if (conv.ia_ativa === true) return 'manual'
  if (conv.ia_humano === true) return null
  const c = await admin.from('wa_ia_config').select('geral').eq('id', 1).maybeSingle()
  if ((c.data as any)?.geral !== true) return null
  const desde = new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  const h = await admin.from('wa_messages').select('id').eq('conversation_id', conv.id).eq('direction', 'out').not('sent_by', 'is', null).gte('created_at', desde).limit(1)
  if ((h.data || []).length > 0) return null
  return 'geral'
}

// Chamado pelo webhook a cada mensagem recebida.
// Devolve true quando o assistente esta LIGADO nessa conversa (o webhook entao nao manda o aviso de horario nem os fluxos).
export async function tratarIA(admin: any, convId: string, waId: string, msgId: string, tipo: string, nomeContato: string | null): Promise<boolean> {
  try {
    const cv = await admin.from('wa_conversations').select('id, ia_ativa, ia_humano, connection_id, profile_id, name').eq('id', convId).maybeSingle()
    const conv: any = cv.data
    if (!conv || !(await modoIA(admin, conv))) return false
    // So responde a mensagens de texto; foto, audio etc. ficam para a equipe ver
    if (tipo !== 'text') return true
    if (!process.env.OPENAI_API_KEY) { console.error('[wa-ia] OPENAI_API_KEY ausente'); return true }

    const hist = await admin.from('wa_messages').select('id, direction, type, body, created_at').eq('conversation_id', convId).order('created_at', { ascending: false }).limit(20)
    const linhas: any[] = (hist.data || []).slice().reverse()
    if (linhas.length === 0) return true
    // Se ja chegou mensagem mais nova, ela mesma sera respondida (com a conversa completa)
    const ultimaIn = [...linhas].reverse().find(function(m) { return m.direction === 'in' })
    if (!ultimaIn || String(ultimaIn.id) !== String(msgId)) return true

    const msgs: { role: 'user' | 'assistant'; content: string }[] = []
    for (const m of linhas) {
      const txt = String(m.body || '').trim() || rotuloTipo(String(m.type || ''))
      if (!txt) continue
      const role = m.direction === 'in' ? 'user' : 'assistant'
      const last = msgs[msgs.length - 1]
      if (last && last.role === role) last.content += '\n' + txt
      else msgs.push({ role, content: txt })
    }
    if (msgs.length === 0 || msgs[msgs.length - 1].role !== 'user') return true
    while (msgs.length > 0 && msgs[0].role !== 'user') msgs.shift()

    // Quem e a pessoa: aluno da plataforma (nos 7 primeiros dias sem plano nao se fala de planos) ou contato sem cadastro
    let nome = String(nomeContato || conv.name || '').trim()
    let esconderPlanos = true
    if (conv.profile_id) {
      const pr = await admin.from('profiles').select('full_name, created_at, subscription_status, is_admin').eq('id', conv.profile_id).maybeSingle()
      const p: any = pr.data
      if (p) {
        if (p.full_name) nome = String(p.full_name)
        const ativo = p.subscription_status === 'active' || p.subscription_status === 'trialing'
        const idadeMs = p.created_at ? Date.now() - new Date(p.created_at).getTime() : Infinity
        esconderPlanos = !ativo && p.is_admin !== true && idadeMs < 7 * 24 * 60 * 60 * 1000
        // Sem cadastro conhecido ou aluno novo: esconde planos. Aluno antigo: segue o comportamento normal do Junior.
      }
    }
    const primeiro = nome.split(' ')[0] || 'voce'
    const canal = conv.connection_id ? 'recuperacao' : 'suporte'

    let system = JUNIOR_PROMPT.split('{{firstName}}').join(primeiro) + '\n\n' + FINAL_REMINDER + '\n\n' + REGRAS_CANAL[canal] + '\n\n' + REGRAS_WHATSAPP + '\n\nNome da pessoa: ' + (nome || 'desconhecido')
    if (esconderPlanos) system = NEW_STUDENT_RULE + '\n\n' + system + '\n\n' + NEW_STUDENT_RULE

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: system }, ...msgs], max_tokens: 500, temperature: 0.2 }),
      signal: AbortSignal.timeout(22000),
    })
    const j: any = await resp.json().catch(function() { return null })
    let texto = String(j?.choices?.[0]?.message?.content || '').trim()
    if (!resp.ok || !texto) { console.error('[wa-ia] sem resposta da IA:', resp.status, JSON.stringify(j?.error || '')); return true }

    const passaParaHumano = texto.indexOf(MARCA_HUMANO) >= 0
    texto = texto.split(MARCA_HUMANO).join('').trim()
    if (!texto) return true

    // Depois de pensar: conferir de novo se continua ligado e se nao chegou mensagem mais nova
    const [cv2, ult] = await Promise.all([
      admin.from('wa_conversations').select('id, ia_ativa, ia_humano').eq('id', convId).maybeSingle(),
      admin.from('wa_messages').select('id').eq('conversation_id', convId).eq('direction', 'in').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    if (!cv2.data || !(await modoIA(admin, cv2.data))) return true
    if (!ult.data || String((ult.data as any).id) !== String(msgId)) return true

    const phoneId = await phoneIdDaConversa(admin, conv.connection_id || null)
    const r = await postMessage({ messaging_product: 'whatsapp', to: waId, type: 'text', text: { body: texto } }, phoneId || undefined)
    if (!r.ok) { console.error('[wa-ia] envio:', JSON.stringify(r.data?.error || r.data)); return true }
    const agora = new Date().toISOString()
    await admin.from('wa_messages').insert({ conversation_id: convId, wa_message_id: r.data?.messages?.[0]?.id || null, direction: 'out', type: 'text', body: texto, status: 'sent', sent_by: null, created_at: agora })
    const upd: any = { last_message_at: agora, last_text: '🤖 ' + texto.slice(0, 120) }
    // Pediu ajuda humana: o assistente se desliga sozinho nessa conversa para a equipe assumir
    if (passaParaHumano) { upd.ia_ativa = false; upd.ia_humano = true }
    await admin.from('wa_conversations').update(upd).eq('id', convId)
    return true
  } catch (e) {
    console.error('[wa-ia] erro:', e)
    return true
  }
}

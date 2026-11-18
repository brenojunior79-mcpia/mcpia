import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { regraExpressChat, pediuLiberarExpress, removerMarcaExpress, liberarExpressPeloJunior } from '@/lib/juniorExpress'
import { eventosDaPessoa } from '@/lib/juniorEventos'
import { falouEmReembolso } from '@/lib/juniorReembolso'
import { REGRA_COMPRA_CHAT, pediuConsultarCompra, removerMarcaCompra, dadosDaMarcaCompra, consultarCompraPeloJunior } from '@/lib/juniorCompra'
import { REGRA_ASSINATURA_CHAT, pediuVerificarAssinatura, removerMarcaAssinatura, emailsDaMarcaAssinatura, verificarAssinaturaPeloJunior } from '@/lib/juniorAssinatura'

import { blocoAnunciosDoAluno } from '@/lib/juniorCampanhas'
import { responderJunior } from '@/lib/iaJunior'
import { tirarRepetido } from '@/lib/juniorHumano'
import { JUNIOR_PROMPT, FINAL_REMINDER, NEW_STUDENT_RULE, situacaoPlanoAluno, REGRAS_ESTILO_CHAT, limparRespostaChat, tipoFinalConversa, situacaoFinalConversa } from '@/lib/junior'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const corpo = await req.json()
    const imageBase64 = corpo?.imageBase64
    // Seguranca: do navegador so aceitamos falas de aluno e do Junior (nunca "system"), com tamanho limitado
    const messages: { role: 'user' | 'assistant'; content: string }[] = (Array.isArray(corpo?.messages) ? corpo.messages : [])
      .filter(function(m: any) { return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' })
      .map(function(m: any) { return { role: m.role, content: String(m.content).slice(0, 4000) } })
      .slice(-30)
    // A conversa tem que terminar numa fala do aluno: mensagens do Junior no fim (ex.: aviso de erro do aparelho) saem daqui
    while (messages.length && messages[messages.length - 1].role === 'assistant') messages.pop()
    if (!messages.length) return NextResponse.json({ reply: null })

    const profileResult = await supabase.from('profiles').select('full_name, created_at, subscription_status, is_admin').eq('id', user.id).single()
    const firstName = ((profileResult.data?.full_name || '').split(' ')[0]) || ''
    let systemContent = JUNIOR_PROMPT.split('{{firstName}}').join(firstName || 'você')
    systemContent = systemContent + '\n\n' + FINAL_REMINDER + '\n\n' + REGRAS_ESTILO_CHAT
    // Conversa ja em andamento (o Junior ja respondeu nesta conversa): sem nova saudacao e sem repetir "como posso te ajudar?"
    const jaConversando = messages.slice(0, -1).some(function(m) { return m.role === 'assistant' && String(m.content || '').trim() })
    if (jaConversando) systemContent = systemContent + '\n\n# CONVERSA EM ANDAMENTO (PRIORIDADE MAXIMA)\nVoce JA esta conversando com esta pessoa. NAO cumprimente de novo (nada de "Ola", "Oi", "Opa", "A paz do Senhor", "Bom dia") e NAO pergunte "como posso te ajudar?". Se ela mandou so "oi", "voce esta ai?" ou parecido, responda "Estou aqui sim!" e continue o assunto que estava pendente nas ultimas mensagens.'

    // Estrutura Express: o Junior pode conferir a compra e liberar o menu (quem confere e o sistema, nao a IA)
    let jaTemExpress = false
    try { jaTemExpress = (await supabase.rpc('tem_estrutura_express')).data === true } catch (e) {}
    systemContent = systemContent + '\n\n' + regraExpressChat(jaTemExpress) + '\n\n' + REGRA_ASSINATURA_CHAT + '\n\n' + REGRA_COMPRA_CHAT

    // Nos 7 primeiros dias, aluno sem plano nao pode saber que existem planos
    const subStatus = profileResult.data?.subscription_status
    const hasActivePlan = subStatus === 'active' || subStatus === 'trialing'
    const ageMs = profileResult.data?.created_at ? Date.now() - new Date(profileResult.data.created_at).getTime() : Infinity
    const hidePlans = !hasActivePlan && profileResult.data?.is_admin !== true && ageMs < 7 * 24 * 60 * 60 * 1000
    if (hidePlans) {
      systemContent = NEW_STUDENT_RULE + '\n\n' + systemContent + '\n\n' + NEW_STUDENT_RULE
    }
    const sit = situacaoPlanoAluno(hasActivePlan, hidePlans)
    if (sit) systemContent = systemContent + '\n\n' + sit
    // Final da conversa: so a pergunta da Estrutura Express, so para quem nao tem a Express
    systemContent = systemContent + '\n\n' + situacaoFinalConversa(tipoFinalConversa(jaTemExpress || profileResult.data?.is_admin === true), jaTemExpress || profileResult.data?.is_admin === true)

    // Eventos reais do aluno (Hubla e plataforma): o Junior entende o momento dele antes de responder
    try {
      const dbEv: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
      const blocoEventos = await eventosDaPessoa(dbEv, { emails: [user.email || ''], profileId: user.id })
      if (blocoEventos) systemContent = systemContent + '\n\n' + blocoEventos
    } catch (e) {}

    // Anuncios: pergunta da integracao com o Facebook e, com plano + integracao, le as campanhas reais do aluno
    try {
      const dbAn: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
      const falasAluno = messages.filter(function(m) { return m.role === 'user' }).slice(-3).map(function(m) { return m.content })
      const blocoAn = await blocoAnunciosDoAluno(dbAn, user.id, user.email || null, falasAluno)
      if (blocoAn) systemContent = systemContent + '\n\n' + blocoAn
    } catch (e) {}

    // Salva a mensagem do aluno (e a resposta do Junior, se houver) para o monitoramento
    const saveConversation = async function(replyText: string | null) {
      // Todas as falas do aluno desde a ultima resposta do Junior (ele pode mandar varias enquanto espera)
      let iAssist = -1
      for (let k = messages.length - 1; k >= 0; k--) { if (messages[k].role === 'assistant') { iAssist = k; break } }
      const lastUserMessage = { content: messages.slice(iAssist + 1).filter(function(m) { return m.role === 'user' }).map(function(m) { return m.content }).join('\n') }
      const userContentToSave = (lastUserMessage?.content || '') + (imageBase64 ? ' [imagem anexada]' : '')

      // Guarda o print numa pasta privada (so o admin consegue ver) para poder consultar depois
      let imagePath: string | null = null
      if (imageBase64 && typeof imageBase64 === 'string') {
        try {
          const match = imageBase64.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/)
          if (match) {
            const ext = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1]
            const path = user!.id + '/' + Date.now() + '.' + ext
            const upload = await supabase.storage.from('chat-prints').upload(path, Buffer.from(match[2], 'base64'), { contentType: match[1], upsert: false })
            if (upload.error) console.error('[chat] erro ao salvar print:', upload.error.message)
            else imagePath = path
          }
        } catch (e) {
          console.error('[chat] erro ao salvar print:', e)
        }
      }

      if (userContentToSave.trim()) {
        // A mensagem do aluno ja foi guardada na hora em que ele enviou (api/chat/salvar): aqui so entra a resposta
        const rows: any[] = corpo?.jaSalvo && !imageBase64 ? [] : [{ user_id: user!.id, role: 'user', content: userContentToSave.trim(), image_path: imagePath }]
        // Hora real em que o aluno mandou (o painel mostrava a mesma hora da resposta, parecendo que o Junior respondeu na hora)
        const enviadaEm = Date.parse(String(corpo?.enviadaEm || ''))
        if (enviadaEm && enviadaEm < Date.now() && Date.now() - enviadaEm < 30 * 60 * 1000) rows[0].created_at = new Date(enviadaEm).toISOString()
        if (replyText) rows.push({ user_id: user!.id, role: 'assistant', content: replyText, image_path: null })
        if (rows.length) await supabase.from('chat_messages').insert(rows)
      }
    }

    // Se um atendente humano assumiu a conversa, o Junior nao responde: so guarda a mensagem do aluno
    const takeoverResult = await supabase.from('chat_takeovers').select('active').eq('user_id', user.id).maybeSingle()
    if (takeoverResult.data?.active === true) {
      await saveConversation(null)
      return NextResponse.json({ reply: null, human: true })
    }

    // Reembolso: o Junior nao responde, so guarda a mensagem para o Breno responder
    if (messages.length > 0 && messages[messages.length - 1].role === 'user' && falouEmReembolso(messages[messages.length - 1].content)) {
      await saveConversation(null)
      return NextResponse.json({ reply: null, human: true })
    }

    // Se veio uma imagem (print), monta a ultima mensagem do aluno no formato de visao da OpenAI
    const apiMessages: any[] = [...messages]
    if (imageBase64 && apiMessages.length > 0) {
      const lastIdx = apiMessages.length - 1
      const lastMsg = apiMessages[lastIdx]
      apiMessages[lastIdx] = {
        role: 'user',
        content: [
          { type: 'text', text: lastMsg.content || 'Analise esse print da tela e me ajude.' },
          { type: 'image_url', image_url: { url: imageBase64 } },
        ],
      }
    }

    // Junior responde com o Claude Haiku; se falhar, cai na OpenAI (lib/iaJunior.ts)
    const rj = await responderJunior({ system: systemContent, msgs: apiMessages, maxTokens: 800, timeoutMs: 40000 })
    let reply: string = rj.texto
    // Anti-repeticao (igual ao WhatsApp): nao manda de novo o que o Junior ja disse nesta conversa
    if (reply && rj.ok) {
      const anteriores = messages.filter(function(m) { return m.role === 'assistant' }).map(function(m) { return String(m.content || '') })
      let rep = tirarRepetido(reply, anteriores)
      if (rep.todoRepetido) {
        const extra = systemContent + '\n\nATENCAO (PRIORIDADE MAXIMA): a sua resposta ficou igual a uma mensagem que voce JA mandou nesta conversa. NAO repita. Releia a ULTIMA mensagem da pessoa e responda especificamente a ela, com outras palavras.'
        const r2 = await responderJunior({ system: extra, msgs: apiMessages, maxTokens: 800, variar: true, timeoutMs: 30000 })
        if (r2.ok && r2.texto) { reply = r2.texto; rep = tirarRepetido(reply, anteriores) }
        if (rep.todoRepetido) reply = 'Me conta com as suas palavras o que está acontecendo agora, que eu te ajudo.'
      }
      if (rep.repetiu && rep.texto && !rep.todoRepetido) reply = rep.texto
    }
    if (jaConversando && reply) {
      // Trava: tira a saudacao do comeco e o "como posso te ajudar?" repetido
      let t = reply.replace(/^\s*(?:Opa|Ol[aá]|Oi|A paz do Senhor|Bom dia|Boa tarde|Boa noite)(?:\s*,?\s*[A-Za-zÀ-ÿ]+)?\s*[!,.]+\s*/i, '')
      t = t.replace(/(^|\n|[.!?]\s+)\s*(?:Tudo bem\??\s*)?(?:Me conta\s+)?como\s+(?:eu\s+)?posso\s+(?:te\s+)?ajudar[^.!?\n]*[.!?]?/gi, '$1').trim()
      reply = t || 'Estou aqui sim! Me conta onde você parou que eu continuo te ajudando.'
    }
    if (!rj.ok || !reply) {
      const motivo = rj.via + ' ' + rj.status + ' ' + rj.motivo
      console.error('[chat] IA sem resposta:', motivo)
      reply = 'Não consegui gerar uma resposta. Tente novamente.'
      if (profileResult.data?.is_admin === true) reply += '\n\n[Aviso so para o admin] IA respondeu: ' + motivo
    }

    // O Junior pediu para conferir a assinatura (plano da plataforma): o sistema confere o pagamento, libera se estiver certo e escreve a resposta
    if (pediuConsultarCompra(reply)) {
      // Consulta nos relatorios de vendas (Hubla e Cakto): quem escreve a resposta e o sistema
      const dbC: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
      const dm = dadosDaMarcaCompra(reply)
      const resC = await consultarCompraPeloJunior(dbC, { emails: dm.emails, telefones: dm.telefones })
      reply = resC.texto
    } else if (pediuVerificarAssinatura(reply) && !pediuLiberarExpress(reply)) {
      const db2: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
      const resA = await verificarAssinaturaPeloJunior(db2, { conta: user.email || '', origem: 'chat', emails: emailsDaMarcaAssinatura(reply) })
      reply = resA.texto
    } else if (pediuLiberarExpress(reply)) {
      if (jaTemExpress) {
        reply = 'O seu acesso à Estrutura Express já está liberado nesta conta. Atualize a página (ou saia e entre de novo) e abra o menu "Estrutura Express" na barra lateral.'
      } else {
        const db: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
        const res = await liberarExpressPeloJunior(db, { conta: user.email || '', origem: 'chat' })
        reply = res.texto
      }
    } else {
      reply = removerMarcaCompra(removerMarcaAssinatura(removerMarcaExpress(reply))) || reply
      // Mesma conduta do WhatsApp: sem ** e so um passo por mensagem
      reply = limparRespostaChat(reply) || reply
    }

    await saveConversation(reply)

    return NextResponse.json({ reply })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

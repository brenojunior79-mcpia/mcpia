import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { regraExpressChat, pediuLiberarExpress, removerMarcaExpress, liberarExpressPeloJunior } from '@/lib/juniorExpress'
import { eventosDaPessoa } from '@/lib/juniorEventos'
import { REGRA_COMPRA_CHAT, pediuConsultarCompra, removerMarcaCompra, dadosDaMarcaCompra, consultarCompraPeloJunior } from '@/lib/juniorCompra'
import { REGRA_ASSINATURA_CHAT, pediuVerificarAssinatura, removerMarcaAssinatura, emailsDaMarcaAssinatura, verificarAssinaturaPeloJunior } from '@/lib/juniorAssinatura'

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

    const profileResult = await supabase.from('profiles').select('full_name, created_at, subscription_status, is_admin').eq('id', user.id).single()
    const firstName = ((profileResult.data?.full_name || '').split(' ')[0]) || ''
    let systemContent = JUNIOR_PROMPT.split('{{firstName}}').join(firstName || 'você')
    systemContent = systemContent + '\n\n' + FINAL_REMINDER + '\n\n' + REGRAS_ESTILO_CHAT

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
    // Final da conversa alternado (R$200 no Pix ou Estrutura Express com cupom, so para quem nao tem a Express); muda a cada dia
    systemContent = systemContent + '\n\n' + situacaoFinalConversa(tipoFinalConversa(jaTemExpress || profileResult.data?.is_admin === true, user.id + new Date().toISOString().slice(0, 10)))

    // Eventos reais do aluno (Hubla e plataforma): o Junior entende o momento dele antes de responder
    try {
      const dbEv: any = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
      const blocoEventos = await eventosDaPessoa(dbEv, { emails: [user.email || ''], profileId: user.id })
      if (blocoEventos) systemContent = systemContent + '\n\n' + blocoEventos
    } catch (e) {}

    // Salva a mensagem do aluno (e a resposta do Junior, se houver) para o monitoramento
    const saveConversation = async function(replyText: string | null) {
      const lastUserMessage = messages?.[messages.length - 1]
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
        const rows: any[] = [{ user_id: user!.id, role: 'user', content: userContentToSave.trim(), image_path: imagePath }]
        if (replyText) rows.push({ user_id: user!.id, role: 'assistant', content: replyText, image_path: null })
        await supabase.from('chat_messages').insert(rows)
      }
    }

    // Se um atendente humano assumiu a conversa, o Junior nao responde: so guarda a mensagem do aluno
    const takeoverResult = await supabase.from('chat_takeovers').select('active').eq('user_id', user.id).maybeSingle()
    if (takeoverResult.data?.active === true) {
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

    const chamar = function() {
      return fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemContent },
            ...apiMessages
          ],
          max_tokens: 800,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(40000),
      })
    }
    let response = await chamar()
    // Limite momentaneo ou falha do servidor da OpenAI: tenta mais uma vez
    if (response.status === 429 || response.status >= 500) {
      await new Promise(function(r) { setTimeout(r, 1500) })
      response = await chamar()
    }

    const data = await response.json().catch(function() { return null })
    let reply = data?.choices?.[0]?.message?.content
    if (!reply) {
      // Registra o motivo real (antes ficava escondido atras da mensagem generica)
      const motivo = response.status + ' ' + JSON.stringify(data?.error || data || '').slice(0, 400)
      console.error('[chat] OpenAI sem resposta:', motivo)
      reply = 'Não consegui gerar uma resposta. Tente novamente.'
      // Para o admin, mostra o motivo na propria tela (so ele ve)
      if (profileResult.data?.is_admin === true) reply += '\n\n[Aviso so para o admin] OpenAI respondeu: ' + motivo
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

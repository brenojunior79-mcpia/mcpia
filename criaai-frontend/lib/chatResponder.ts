import { createClient as createAdmin } from '@supabase/supabase-js'
import { regraExpressChat, pediuLiberarExpress, removerMarcaExpress, liberarExpressPeloJunior } from '@/lib/juniorExpress'
import { eventosDaPessoa } from '@/lib/juniorEventos'
import { REGRA_COMPRA_CHAT, pediuConsultarCompra, removerMarcaCompra, dadosDaMarcaCompra, consultarCompraPeloJunior } from '@/lib/juniorCompra'
import { REGRA_ASSINATURA_CHAT, pediuVerificarAssinatura, removerMarcaAssinatura, emailsDaMarcaAssinatura, verificarAssinaturaPeloJunior } from '@/lib/juniorAssinatura'
import { blocoAnunciosDoAluno } from '@/lib/juniorCampanhas'
import { responderJunior } from '@/lib/iaJunior'
import { tirarRepetido } from '@/lib/juniorHumano'
import { regraPrecoBlack, JUNIOR_PROMPT, FINAL_REMINDER, NEW_STUDENT_RULE, situacaoPlanoAluno, REGRAS_ESTILO_CHAT, limparRespostaChat, tipoFinalConversa, situacaoFinalConversa } from '@/lib/junior'

// Gera a resposta do Junior no chat do site. Usada pela tela do aluno (app/api/chat) e pelo robo do servidor (app/api/chat/auto/run),
// que responde sozinho quando o aluno fechou o app antes da resposta chegar.
export type MsgIA = { role: 'user' | 'assistant'; content: string }

// Mesma regra do banco (funcao tem_estrutura_express), mas para qualquer aluno e nao so para quem esta logado
export async function temExpressDoAluno(db: any, userId: string): Promise<boolean> {
  const pf = await db.from('profiles').select('email, whatsapp, is_admin').eq('id', userId).maybeSingle()
  const p: any = pf.data
  if (!p) return false
  if (p.is_admin) return true
  const email = String(p.email || '').trim().toLowerCase()
  const fim8 = function(s: any) { const d = String(s || '').replace(/\D/g, ''); return d.length >= 8 ? d.slice(-8) : '' }
  if (email) {
    const l = await db.from('estrutura_liberados').select('email').ilike('email', email).limit(1)
    if (l.data && l.data.length) return true
  }
  const compras = await db.from('hubla_compras').select('email, wa').eq('cat', 'e').eq('reembolsado', false).limit(5000)
  const meu8 = fim8(p.whatsapp)
  for (const c of (compras.data || []) as any[]) {
    if (email && String(c.email || '').trim().toLowerCase() === email) return true
    if (meu8 && fim8(c.wa) === meu8) return true
  }
  return false
}

export async function responderChatDoAluno(p: { db: any; userId: string; email: string; messages: MsgIA[]; imageBase64?: string | null; jaTemExpress: boolean }): Promise<{ reply: string; ok: boolean }> {
  const supabase = p.db
  const user = { id: p.userId, email: p.email }
  const messages = p.messages
  const imageBase64 = p.imageBase64
  const jaTemExpress = p.jaTemExpress
    const profileResult = await supabase.from('profiles').select('full_name, created_at, subscription_status, is_admin').eq('id', user.id).single()
    const firstName = ((profileResult.data?.full_name || '').split(' ')[0]) || ''
    let systemContent = JUNIOR_PROMPT.split('{{firstName}}').join(firstName || 'você')
    systemContent = systemContent + '\n\n' + FINAL_REMINDER + '\n\n' + REGRAS_ESTILO_CHAT
    systemContent = systemContent + '\n\n' + regraPrecoBlack()
    // Conversa ja em andamento (o Junior ja respondeu nesta conversa): sem nova saudacao e sem repetir "como posso te ajudar?"
    const jaConversando = messages.slice(0, -1).some(function(m) { return m.role === 'assistant' && String(m.content || '').trim() })
    if (jaConversando) systemContent = systemContent + '\n\n# CONVERSA EM ANDAMENTO (PRIORIDADE MAXIMA)\nVoce JA esta conversando com esta pessoa. NAO cumprimente de novo (nada de "Ola", "Oi", "Opa", "A paz do Senhor", "Bom dia") e NAO pergunte "como posso te ajudar?". Se ela mandou so "oi", "voce esta ai?" ou parecido, responda "Estou aqui sim!" e continue o assunto que estava pendente nas ultimas mensagens.'

    // Estrutura Express: o Junior pode conferir a compra e liberar o menu (quem confere e o sistema, nao a IA)
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
    return { reply, ok: !!rj.ok && !!reply && reply.indexOf('Não consegui gerar uma resposta') !== 0 }
}

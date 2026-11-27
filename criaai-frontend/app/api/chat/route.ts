import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { falouEmReembolso } from '@/lib/juniorReembolso'
import { responderChatDoAluno } from '@/lib/chatResponder'

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
    // Outro aparelho do mesmo aluno ja pediu a resposta desta mensagem: nao responde duas vezes
    {
      const desde = Date.parse(String(corpo?.enviadaEm || ''))
      if (desde) {
        const ja = await supabase.from('chat_messages').select('id').eq('user_id', user.id).eq('role', 'assistant').gt('created_at', new Date(desde).toISOString()).limit(1)
        if (ja.data && ja.data.length) return NextResponse.json({ reply: null, jaRespondido: true })
      }
    }


    // Salva a mensagem do aluno (e a resposta do Junior, se houver) para o monitoramento
    const saveConversation = async function(replyText: string | null) {
      // Todas as falas do aluno desde a ultima resposta do Junior (ele pode mandar varias enquanto espera)
      let iAssist = -1
      for (let k = messages.length - 1; k >= 0; k--) { if (messages[k].role === 'assistant') { iAssist = k; break } }
      const lastUserMessage = { content: messages.slice(iAssist + 1).filter(function(m) { return m.role === 'user' }).map(function(m) { return m.content }).join('\n') }
      const userContentToSave = (lastUserMessage?.content || '') + (imageBase64 ? ' [imagem anexada]' : '') + (corpo?.arquivoNome ? ' [arquivo enviado: ' + String(corpo.arquivoNome).slice(0, 120) + ']' : '')

      // Guarda o print numa pasta privada (so o admin consegue ver) para poder consultar depois
      let imagePath: string | null = null
      // Video ou arquivo que o aluno ja subiu direto para a pasta dele (so aceita a pasta do proprio aluno)
      const arq = typeof corpo?.arquivoPath === 'string' ? corpo.arquivoPath : ''
      if (arq && arq.indexOf(user!.id + '/') === 0 && arq.indexOf('..') < 0) imagePath = arq.slice(0, 300)
      if (imageBase64 && typeof imageBase64 === 'string' && !corpo?.jaSalvo) { // com o print ja guardado (api/chat/salvar) nao sobe de novo
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
        // Trava: so confia no "ja salvo" se a fala do aluno estiver mesmo no servidor (senao a resposta ficava sem a pergunta)
        let jaNoServidor = false
        if (corpo?.jaSalvo) {
          const ult = await supabase.from('chat_messages').select('role').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1)
          jaNoServidor = !!(ult.data && ult.data[0] && ult.data[0].role === 'user')
        }
        const rows: any[] = jaNoServidor ? [] : [{ user_id: user!.id, role: 'user', content: userContentToSave.trim(), image_path: imagePath }]
        // Hora real em que o aluno mandou (o painel mostrava a mesma hora da resposta, parecendo que o Junior respondeu na hora)
        const enviadaEm = Date.parse(String(corpo?.enviadaEm || ''))
        if (rows.length && enviadaEm && enviadaEm < Date.now() && Date.now() - enviadaEm < 30 * 60 * 1000) rows[0].created_at = new Date(enviadaEm).toISOString()
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

    // A resposta do Junior e gerada em lib/chatResponder.ts (o mesmo codigo do robo que responde com o app fechado)
    let jaTemExpress = false
    try { jaTemExpress = (await supabase.rpc('tem_estrutura_express')).data === true } catch (e) {}
    const gerada = await responderChatDoAluno({ db: supabase, userId: user.id, email: user.email || '', messages: messages, imageBase64: imageBase64, jaTemExpress: jaTemExpress })
    const reply: string = gerada.reply

    await saveConversation(reply)

    return NextResponse.json({ reply })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

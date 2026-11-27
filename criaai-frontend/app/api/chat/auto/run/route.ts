import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { adminClient } from '@/lib/whatsapp'
import { falouEmReembolso } from '@/lib/juniorReembolso'
import { responderChatDoAluno, temExpressDoAluno } from '@/lib/chatResponder'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

function igual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

const ESPERA_MIN_S = 240        // a tela do aluno responde em 1-2 min; o robo so entra se passou disso (aluno fechou o app)
const JANELA_H = 24             // nao responde conversa parada ha mais de 24 horas
const MAX_TENTATIVAS = 3
const POR_RODADA = 4

// Responde, pelo servidor, o aluno do chat do site que ficou sem resposta (fechou o app antes do Junior responder).
// O agendador do banco chama isto a cada minuto.
export async function POST(req: NextRequest) {
  const admin: any = adminClient()
  const header = req.headers.get('x-auto-secret') || ''
  const s = await admin.from('wa_auto_secret').select('secret').eq('id', 1).maybeSingle()
  const segredo = String(s.data?.secret || '')
  if (!header || !segredo || !igual(header, segredo)) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })

  const agora = Date.now()
  const desde = new Date(agora - JANELA_H * 3600 * 1000).toISOString()
  const r = await admin.from('chat_messages').select('id, user_id, role, content, image_path, created_at').gte('created_at', desde).order('created_at', { ascending: false }).limit(3000)
  const linhas: any[] = r.data || []
  // A ultima mensagem de cada aluno: so interessa quem terminou numa fala do aluno
  const ultima: Record<string, any> = {}
  for (const l of linhas) if (!ultima[l.user_id]) ultima[l.user_id] = l
  const candidatos = Object.keys(ultima).filter(function(u) {
    const l = ultima[u]
    return l.role === 'user' && agora - new Date(l.created_at).getTime() >= ESPERA_MIN_S * 1000
  })
  if (!candidatos.length) return NextResponse.json({ ok: true, candidatos: 0, respondidos: 0 })

  const takes = await admin.from('chat_takeovers').select('user_id, active').in('user_id', candidatos)
  const comHumano: Record<string, boolean> = {}
  for (const t of (takes.data || []) as any[]) if (t.active === true) comHumano[t.user_id] = true

  let respondidos = 0
  const fila = candidatos.filter(function(u) { return !comHumano[u] }).sort(function(a, b) { return new Date(ultima[a].created_at).getTime() - new Date(ultima[b].created_at).getTime() })
  for (const uid of fila) {
    if (respondidos >= POR_RODADA) break
    const ult = ultima[uid]
    // Reembolso: o Junior nao responde, fica para o Breno
    if (falouEmReembolso(String(ult.content || ''))) continue
    // Controle de tentativas por mensagem (nao tenta para sempre nem duas vezes ao mesmo tempo)
    const t = await admin.from('chat_auto_tentativas').select('tentativas, atualizado_em').eq('user_id', uid).eq('msg_id', ult.id).maybeSingle()
    if (t.data) {
      if (t.data.tentativas >= MAX_TENTATIVAS) continue
      if (agora - new Date(t.data.atualizado_em).getTime() < 90 * 1000) continue
    }
    await admin.from('chat_auto_tentativas').upsert({ user_id: uid, msg_id: ult.id, tentativas: (t.data ? t.data.tentativas : 0) + 1, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id,msg_id' })
    try {
      // Historico recente do aluno, em ordem; termina na fala dele
      const hist = linhas.filter(function(l) { return l.user_id === uid && (l.role === 'user' || l.role === 'assistant') }).slice(0, 30).reverse()
      const tem = function(l: any) { return String(l.content || '').replace(/\s*\[imagem anexada\]\s*$/, '').trim() }
      const messages = hist.map(function(l) { return { role: l.role as 'user' | 'assistant', content: tem(l) } }).filter(function(m) { return m.content || m.role === 'user' })
      // So as falas do aluno desde a ultima resposta do Junior contam como "pendentes"
      let imageBase64: string | null = null
      const pend = hist.slice().reverse()
      for (const l of pend) {
        if (l.role === 'assistant') break
        const ip = String(l.image_path || '')
        if (ip && ip.indexOf('audio:') !== 0 && !imageBase64) {
          try {
            const dl = await admin.storage.from('chat-prints').download(ip)
            if (dl.data) {
              const buf = Buffer.from(await dl.data.arrayBuffer())
              const ext = ip.split('.').pop()
              imageBase64 = 'data:image/' + (ext === 'jpg' ? 'jpeg' : ext) + ';base64,' + buf.toString('base64')
            }
          } catch (e) { /* sem o print, responde so com o texto */ }
        }
      }
      // Dados da conta
      const pf = await admin.from('profiles').select('email').eq('id', uid).maybeSingle()
      const email = String((pf.data as any)?.email || '')
      const jaTemExpress = await temExpressDoAluno(admin, uid)
      const g = await responderChatDoAluno({ db: admin, userId: uid, email, messages, imageBase64, jaTemExpress })
      if (!g.ok || !g.reply) continue
      // Antes de guardar, confere de novo que ninguem respondeu enquanto a IA pensava (tela do aluno, atendente)
      const rec = await admin.from('chat_messages').select('id, role').eq('user_id', uid).order('created_at', { ascending: false }).limit(1)
      if (!rec.data || !rec.data[0] || rec.data[0].role !== 'user') continue
      const tk = await admin.from('chat_takeovers').select('active').eq('user_id', uid).maybeSingle()
      if (tk.data && tk.data.active === true) continue
      await admin.from('chat_messages').insert({ user_id: uid, role: 'assistant', content: g.reply, image_path: null })
      respondidos++
    } catch (e) {
      console.error('[chat/auto] erro:', e instanceof Error ? e.message : 'desconhecido')
    }
  }
  return NextResponse.json({ ok: true, candidatos: candidatos.length, respondidos })
}

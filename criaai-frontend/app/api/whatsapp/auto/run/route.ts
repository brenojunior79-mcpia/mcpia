import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { adminClient, requireAdmin, waConfig } from '@/lib/whatsapp'
import { processarFluxos } from '@/lib/waAuto'
import { fecharDia } from '@/lib/waFechamento'
import { retomarFalhas, responderForaDoHorario } from '@/lib/waRetomada'
import { atualizarPrecosHostinger } from '@/lib/juniorHostinger'
import { estadoAgendaIA, responderPendentesGeral, acompanharSilencioFluxo } from '@/lib/waIA'
import { avisarEncerramentoSuporte } from '@/lib/waEncerramento'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

function igual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

// Roda os passos que ja chegaram na hora. O agendador do banco chama isto a cada minuto.
export async function POST(req: NextRequest) {
  const admin = adminClient()
  const header = req.headers.get('x-auto-secret') || ''
  let permitido = false
  if (header) {
    const s = await admin.from('wa_auto_secret').select('secret').eq('id', 1).maybeSingle()
    const segredo = String(s.data?.secret || '')
    permitido = !!segredo && igual(header, segredo)
  } else {
    permitido = !!(await requireAdmin())
  }
  if (!permitido) return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
  const cfg = waConfig()
  if (!cfg.token) return NextResponse.json({ error: 'WhatsApp nao conectado.' }, { status: 400 })
  const r = await processarFluxos(admin, cfg.token)
  // Agenda do assistente: quando a janela abre (ex.: 8h), responde o que chegou de madrugada. Uma vez por dia.
  let abertura = 0
  try {
    const ag = await estadoAgendaIA(admin)
    if (ag.agendaAtiva && ag.dentro) {
      const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
      const claim = await admin.from('wa_ia_config').update({ agenda_varrida: hoje }).eq('id', 1).or('agenda_varrida.is.null,agenda_varrida.neq.' + hoje).select('id')
      if (!claim.error && claim.data && claim.data.length > 0) abertura = await responderPendentesGeral(admin)
    }
  } catch (e) { console.error('[wa-ia] abertura da agenda:', e) }
  // Quem escreveu fora do horario (e so recebeu o aviso de horario): responde todas, a cada minuto, ate acabar
  let foraHorario = 0
  try { const ag2 = await estadoAgendaIA(admin); if (ag2.agendaAtiva && ag2.dentro) foraHorario = await responderForaDoHorario(admin) } catch (e) { console.error('[wa-fora-horario]', e) }
  // Ultimos minutos do horario do suporte: avisa quem esta em conversa que o suporte vai encerrar
  let avisosFim = 0
  try { avisosFim = await avisarEncerramentoSuporte(admin) } catch (e) { console.error('[wa-aviso-encerramento]', e) }
  // Depois do fluxo: se a pessoa ficou 15 min em silencio, o Junior pergunta se ela conseguiu acessar as aulas
  let acompanhamento = 0
  try { acompanhamento = await acompanharSilencioFluxo(admin) } catch (e) { console.error('[wa-ia] acompanhamento:', e) }
  // Falhas passageiras do assistente (ex.: acabou o credito da OpenAI): tenta responder de novo, ate 3 vezes por mensagem
  let retomadas = 0
  try { retomadas = await retomarFalhas(admin) } catch (e) { console.error('[wa-retomada]', e) }
  // Preco da Hostinger (1x por dia)
  try { await atualizarPrecosHostinger(admin) } catch (e) { /* segue */ }
  // Fim do horario de atendimento: ultima resposta para quem esperava e depois marca tudo como lido e finaliza as conversas
  let fechamento = 'fora'
  try { fechamento = await fecharDia(admin) } catch (e) { console.error('[wa-fechamento]', e) }
  return NextResponse.json({ ok: true, ...r, abertura, foraHorario, avisosFim, acompanhamento, retomadas, fechamento })
}

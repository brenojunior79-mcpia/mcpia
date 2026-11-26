// Aviso de que o suporte vai encerrar (ordem do Breno): sai nos ultimos minutos do horario de atendimento, so no SUPORTE (alunos).
// O recuperacao atende 24h e nunca recebe esse aviso. Os textos comecam sempre igual para o sistema reconhecer que o aviso ja foi dado hoje.
export const AVISO_ENCERRAR_INICIO = 'Em breve vamos encerrar o nosso suporte'
export const MIN_AVISO_PROATIVO = 5    // ordem do Breno (26/11/2026): comeca a encerrar as 17h55 (5 min antes do fim); o sistema manda o aviso sozinho nos ultimos 5 minutos para quem esta em conversa
export const MIN_AVISO_NA_RESPOSTA = 5  // e o Junior junta o aviso as respostas dos ultimos 5 minutos

// "18:00" -> "18h"; "13:30" -> "13h30"
export function horaFalada(hm: string): string {
  const m = String(hm || '').match(/^(\d{2}):(\d{2})$/)
  if (!m) return String(hm || '')
  return String(Number(m[1])) + 'h' + (m[2] === '00' ? '' : m[2])
}

export function avisoEncerramento(fim: string, junto: boolean): string {
  return AVISO_ENCERRAR_INICIO + ' de hoje (às ' + horaFalada(fim) + '). ' + (junto ? 'Consegui te ajudar? 🙏' : 'Você já conseguiu resolver tudo? 🙏')
}

export function inicioDoDiaSP(d: Date = new Date()): number {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  return new Date(dia + 'T00:00:00-03:00').getTime()
}

// Ja avisou hoje nesta conversa? (olha as mensagens que o sistema enviou)
export function avisouEncerramentoHoje(linhas: any[]): boolean {
  const ini = inicioDoDiaSP()
  return linhas.some(function(m) { return m.direction === 'out' && new Date(m.created_at).getTime() >= ini && String(m.body || '').indexOf(AVISO_ENCERRAR_INICIO) >= 0 })
}

// Horario de atendimento: configuracao e conta de "esta aberto agora?"
export type Dia = { on: boolean; start: string; end: string }
export type Horario = {
  away_enabled: boolean
  away_message: string
  cooldown_hours: number
  tz: string
  days: Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', Dia>
}
export const DIAS: { k: keyof Horario['days']; nome: string }[] = [
  { k: 'mon', nome: 'Segunda' }, { k: 'tue', nome: 'Terça' }, { k: 'wed', nome: 'Quarta' }, { k: 'thu', nome: 'Quinta' },
  { k: 'fri', nome: 'Sexta' }, { k: 'sat', nome: 'Sábado' }, { k: 'sun', nome: 'Domingo' },
]

export const PADRAO: Horario = {
  away_enabled: false,
  away_message: 'Olá! 👋 Nosso atendimento funciona de segunda a sexta, das 9h às 18h. Deixe sua mensagem aqui que responderemos assim que voltarmos. 🙏',
  cooldown_hours: 12,
  tz: 'America/Sao_Paulo',
  days: {
    mon: { on: true, start: '09:00', end: '18:00' }, tue: { on: true, start: '09:00', end: '18:00' }, wed: { on: true, start: '09:00', end: '18:00' },
    thu: { on: true, start: '09:00', end: '18:00' }, fri: { on: true, start: '09:00', end: '18:00' },
    sat: { on: false, start: '09:00', end: '13:00' }, sun: { on: false, start: '09:00', end: '13:00' },
  },
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

// Aceita qualquer coisa vinda do banco/tela e devolve uma configuracao valida
export function normalizar(input: any): Horario {
  const base: Horario = JSON.parse(JSON.stringify(PADRAO))
  if (!input || typeof input !== 'object') return base
  base.away_enabled = input.away_enabled === true
  if (typeof input.away_message === 'string') base.away_message = input.away_message.trim().slice(0, 1000)
  const c = Number(input.cooldown_hours)
  if (c >= 1 && c <= 72) base.cooldown_hours = Math.round(c)
  for (const d of DIAS) {
    const x = input.days && input.days[d.k]
    if (!x) continue
    base.days[d.k] = {
      on: x.on === true,
      start: HHMM.test(String(x.start)) ? String(x.start) : base.days[d.k].start,
      end: HHMM.test(String(x.end)) ? String(x.end) : base.days[d.k].end,
    }
  }
  return base
}

export function agoraNoFuso(tz: string, d: Date = new Date()): { dia: keyof Horario['days']; hm: string } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d)
  const wd = (parts.find(function(p) { return p.type === 'weekday' })?.value || 'Mon').slice(0, 3).toLowerCase() as keyof Horario['days']
  let h = parts.find(function(p) { return p.type === 'hour' })?.value || '00'
  if (h === '24') h = '00'
  const m = parts.find(function(p) { return p.type === 'minute' })?.value || '00'
  return { dia: wd, hm: h.padStart(2, '0') + ':' + m.padStart(2, '0') }
}

export function abertoAgora(h: Horario, d: Date = new Date()): boolean {
  const n = agoraNoFuso(h.tz, d)
  const dia = h.days[n.dia]
  return !!dia && dia.on && n.hm >= dia.start && n.hm < dia.end
}

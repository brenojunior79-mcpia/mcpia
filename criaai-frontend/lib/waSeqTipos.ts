// Construtor visual de fluxos do WhatsApp: tipos e funcoes usados pela tela e pelo servidor (sem codigo de servidor aqui)
import type { Metodo } from '@/lib/waAutoTipos'

export type Unidade = 'segundos' | 'minutos' | 'horas' | 'dias'
export type ParamModelo = { mode: 'nome' | 'produto' | 'link' | 'texto'; value: string }

export type PassoSeq =
  | { id: string; tipo: 'atraso'; valor: number; unidade: Unidade }
  | { id: string; tipo: 'resposta'; valor: number; unidade: Unidade; aoExpirar: 'continuar' | 'encerrar' }
  | { id: string; tipo: 'ia' }
  | { id: string; tipo: 'texto'; texto: string }
  | { id: string; tipo: 'audio'; path: string; mime: string; nome: string }
  | { id: string; tipo: 'imagem'; path: string; mime: string; nome: string; legenda: string }
  | { id: string; tipo: 'video'; path: string; mime: string; nome: string; legenda: string }
  | { id: string; tipo: 'modelo'; template: string; language: string; params: ParamModelo[] }

export type GatilhoSeq =
  | { tipo: 'palavra'; palavras: string[]; match: 'contem' | 'igual' }
  | { tipo: 'evento'; evento: string; metodo?: Metodo; produto?: string }

export type Sequencia = {
  id?: string
  name: string
  enabled: boolean
  connection_id: string | null
  trigger: GatilhoSeq
  steps: PassoSeq[]
  cancel_on_purchase: boolean
}

export const VAZIA_SEQ: Sequencia = {
  name: 'Novo fluxo', enabled: false, connection_id: null,
  trigger: { tipo: 'palavra', palavras: [], match: 'contem' }, steps: [], cancel_on_purchase: true,
}

const MULT: Record<Unidade, number> = { segundos: 1, minutos: 60, horas: 3600, dias: 86400 }
export const MAX_ATRASO_S = 30 * 86400

export function segundosDoAtraso(p: { valor: number; unidade: Unidade }): number {
  return Math.round(Number(p.valor) * (MULT[p.unidade] || 60))
}

export function textoAtraso(p: { valor: number; unidade: Unidade }): string {
  const v = Number(p.valor) || 0
  const u = p.unidade === 'segundos' ? 'segundo(s)' : p.unidade === 'minutos' ? 'minuto(s)' : p.unidade === 'horas' ? 'hora(s)' : 'dia(s)'
  return 'Aguarde ' + v + ' ' + u + ' e depois continue'
}

export function novoId(): string {
  return 'p' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3)
}

export const ROTULO_TIPO: Record<PassoSeq['tipo'], string> = {
  atraso: 'Atraso inteligente', resposta: 'Depois que a pessoa responder', ia: 'Transferir para a IA', texto: 'Mensagem de texto', audio: 'Mensagem de áudio', imagem: 'Mensagem com imagem', video: 'Mensagem com vídeo', modelo: 'Modelo aprovado da Meta',
}

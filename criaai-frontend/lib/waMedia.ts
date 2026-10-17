// Tipos de arquivo que o WhatsApp aceita e limites (em bytes)
export type Kind = 'image' | 'video' | 'audio' | 'document'

const AUDIO_FIX: Record<string, string> = { 'audio/x-m4a': 'audio/mp4', 'audio/m4a': 'audio/mp4', 'audio/mp3': 'audio/mpeg', 'audio/x-aac': 'audio/aac' }
const AUDIO_OK = ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg']
const DOC_OK = ['application/pdf', 'text/plain', 'text/csv', 'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']

export function limpaMime(m: string): string {
  const x = String(m || '').split(';')[0].trim().toLowerCase()
  return AUDIO_FIX[x] || x
}

// Devolve o tipo da mensagem e o limite de tamanho, ou o motivo de nao aceitar
export function classificar(mimeIn: string): { kind: Kind; mime: string; max: number } | { erro: string } {
  const mime = limpaMime(mimeIn)
  if (mime === 'image/jpeg' || mime === 'image/png') return { kind: 'image', mime, max: 5 * 1024 * 1024 }
  if (mime === 'video/mp4' || mime === 'video/3gpp') return { kind: 'video', mime, max: 16 * 1024 * 1024 }
  if (AUDIO_OK.indexOf(mime) >= 0) return { kind: 'audio', mime, max: 16 * 1024 * 1024 }
  if (DOC_OK.indexOf(mime) >= 0) return { kind: 'document', mime, max: 20 * 1024 * 1024 }
  if (mime.indexOf('audio/') === 0) return { erro: 'Esse formato de áudio não é aceito pelo WhatsApp. Use mp3, m4a, aac, ogg ou amr.' }
  if (mime.indexOf('image/') === 0) return { erro: 'Imagem só pode ser JPG ou PNG.' }
  if (mime.indexOf('video/') === 0) return { erro: 'Vídeo só pode ser MP4 ou 3GP.' }
  return { erro: 'Esse tipo de arquivo não é aceito. Use PDF, Word, Excel, PowerPoint ou texto.' }
}

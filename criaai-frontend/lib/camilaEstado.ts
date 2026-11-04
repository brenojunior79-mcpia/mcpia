import { rascunhoVazio } from '@/lib/anunciosAssistente'
import { adminClient } from '@/lib/whatsapp'

export type EstadoSalvo = { rascunho: any; midia: any; dialogo: { r: 'u' | 'c'; t: string }[]; atualizado: string | null }

// Le o que ficou salvo da conversa (para a Camila continuar de onde parou)
export async function lerEstado(userId: string): Promise<EstadoSalvo | null> {
  const r = await adminClient().from('camila_anuncio_estado').select('rascunho, midia, dialogo, atualizado_em').eq('user_id', userId).maybeSingle()
  const d: any = r.data
  if (!d) return null
  const base: any = rascunhoVazio()
  const rasc = d.rascunho && typeof d.rascunho === 'object' ? d.rascunho : null
  const temAlgo = (rasc && Object.keys(base).some(function(k) { return k !== 'idadeMin' && k !== 'idadeMax' && k !== 'genero' && k !== 'botao' && rasc[k] })) || !!d.midia
  const dialogo = Array.isArray(d.dialogo) ? d.dialogo : []
  if (!temAlgo && !dialogo.length) return null
  return { rascunho: rasc, midia: d.midia || null, dialogo: dialogo, atualizado: d.atualizado_em || null }
}

export async function salvarEstado(userId: string, campos: { rascunho?: any; midia?: any; dialogo?: any }) {
  const linha: any = { user_id: userId, atualizado_em: new Date().toISOString() }
  if (campos.rascunho !== undefined) linha.rascunho = campos.rascunho
  if (campos.midia !== undefined) linha.midia = campos.midia
  if (campos.dialogo !== undefined) linha.dialogo = campos.dialogo
  await adminClient().from('camila_anuncio_estado').upsert(linha, { onConflict: 'user_id' })
}


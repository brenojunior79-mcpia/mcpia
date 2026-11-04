import { NextRequest, NextResponse } from 'next/server'
import { faltando, graph, limparRascunho, rascunhoVazio, usuarioAssistente } from '@/lib/anunciosAssistente'
import { adminClient } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const esperar = function(ms: number) { return new Promise(function(r) { setTimeout(r, ms) }) }

// Cria campanha + conjunto + anuncio, SEMPRE PAUSADOS. So roda depois que a pessoa clica em confirmar na tela.
export async function POST(req: NextRequest) {
  const u = await usuarioAssistente()
  if ('erro' in u) return NextResponse.json({ error: u.erro }, { status: u.status })
  let b: any = {}
  try { b = await req.json() } catch (e) {}
  const midiaPath = String(b?.midia?.path || '')
  const midiaTipo = b?.midia?.tipo === 'imagem' ? 'imagem' : 'video'
  if (midiaPath.indexOf('anuncios/' + u.id + '/') !== 0 || midiaPath.indexOf('..') >= 0) return NextResponse.json({ error: 'Anexe o video ou a imagem do anuncio.' }, { status: 400 })

  // Confere de novo no servidor: paginas e pixels precisam existir na conta
  const [pg, px] = await Promise.all([
    graph('me/accounts', u.token, { query: { fields: 'id,name', limit: '50' } }),
    graph(u.conta + '/adspixels', u.token, { query: { fields: 'id,name', limit: '50' } }),
  ])
  const paginas = pg.ok ? ((pg.data.data || []) as any[]).map(function(p) { return { id: String(p.id) } }) : []
  const pixels = px.ok ? ((px.data.data || []) as any[]).map(function(p) { return { id: String(p.id) } }) : []
  const r = limparRascunho(b.rascunho, paginas, pixels, rascunhoVazio())
  const falta = faltando(r, true)
  if (falta.length) return NextResponse.json({ error: 'Ainda falta: ' + falta.join(', ') + '.' }, { status: 400 })

  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
  const nome = 'Assistente - ' + String(r.produto).slice(0, 60) + ' - ' + hoje

  // 1) Sobe a midia primeiro (se der erro aqui, nada fica criado na conta)
  const assinada = await adminClient().storage.from('wa-media').createSignedUrl(midiaPath, 3600)
  if (assinada.error || !assinada.data) return NextResponse.json({ error: 'Nao achei o arquivo enviado. Anexe de novo.' }, { status: 400 })
  let videoId = String(b?.midia?.videoId || '')
  let imageHash = ''
  let capa = ''
  if (midiaTipo === 'video') {
    if (!videoId) {
      const up = await graph(u.conta + '/advideos', u.token, { metodo: 'POST', corpo: { file_url: assinada.data.signedUrl, name: nome } })
      if (!up.ok) return NextResponse.json({ error: 'O Facebook nao aceitou o video: ' + up.erro }, { status: 400 })
      videoId = String(up.data.id)
    }
    let pronto = false
    for (let i = 0; i < 14 && !pronto; i++) {
      const st = await graph(videoId, u.token, { query: { fields: 'status' } })
      const s = st.ok && st.data && st.data.status ? String(st.data.status.video_status || '') : ''
      if (s === 'ready') pronto = true
      else if (s === 'error') return NextResponse.json({ error: 'O Facebook nao conseguiu processar esse video. Tente outro arquivo (mp4).' }, { status: 400 })
      else await esperar(3000)
    }
    if (!pronto) return NextResponse.json({ pendente: true, videoId, error: 'O Facebook ainda esta processando o video. Aguarde 1 minuto e toque em criar de novo.' }, { status: 202 })
    const th = await graph(videoId + '/thumbnails', u.token, { query: { fields: 'uri,is_preferred' } })
    const lista: any[] = th.ok ? (th.data.data || []) : []
    const pref = lista.find(function(t) { return t.is_preferred }) || lista[0]
    capa = pref ? String(pref.uri) : ''
    if (!capa) return NextResponse.json({ pendente: true, videoId, error: 'O Facebook ainda esta gerando a capa do video. Aguarde 1 minuto e toque em criar de novo.' }, { status: 202 })
  } else {
    try {
      const resp = await fetch(assinada.data.signedUrl)
      const blob = await resp.blob()
      const fd = new FormData()
      fd.append('access_token', u.token)
      fd.append('filename', blob, 'anuncio.' + (midiaPath.split('.').pop() || 'jpg'))
      const ru = await fetch('https://graph.facebook.com/v26.0/' + u.conta + '/adimages', { method: 'POST', body: fd })
      const dj: any = await ru.json().catch(function() { return null })
      const imgs = dj && dj.images ? dj.images : null
      const primeiro = imgs ? imgs[Object.keys(imgs)[0]] : null
      if (!primeiro || !primeiro.hash) return NextResponse.json({ error: 'O Facebook nao aceitou a imagem: ' + ((dj && dj.error && (dj.error.error_user_msg || dj.error.message)) || 'erro desconhecido') }, { status: 400 })
      imageHash = String(primeiro.hash)
    } catch (e) { return NextResponse.json({ error: 'Nao consegui enviar a imagem ao Facebook.' }, { status: 500 }) }
  }

  // 2) Campanha de vendas (pausada)
  const camp = await graph(u.conta + '/campaigns', u.token, { metodo: 'POST', corpo: { name: nome, objective: 'OUTCOME_SALES', status: 'PAUSED', special_ad_categories: [], is_adset_budget_sharing_enabled: false } })
  if (!camp.ok) return NextResponse.json({ error: 'Nao consegui criar a campanha: ' + camp.erro }, { status: 400 })
  const campId = String(camp.data.id)
  const tokenUsuario = u.token
  async function desfazer() { await graph(campId, tokenUsuario, { metodo: 'DELETE' }) }

  // 3) Conjunto de anuncios: orcamento diario, publico no Brasil e pixel de compra
  const targeting: any = { geo_locations: { countries: ['BR'] }, age_min: r.idadeMin, age_max: r.idadeMax, targeting_automation: { advantage_audience: 0 } }
  if (r.genero === 'homens') targeting.genders = [1]
  if (r.genero === 'mulheres') targeting.genders = [2]
  const conj = await graph(u.conta + '/adsets', u.token, { metodo: 'POST', corpo: {
    name: nome, campaign_id: campId, status: 'PAUSED',
    daily_budget: Math.round(Number(r.orcamentoDiario) * 100),
    billing_event: 'IMPRESSIONS', optimization_goal: 'OFFSITE_CONVERSIONS', bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    promoted_object: { pixel_id: r.pixelId, custom_event_type: 'PURCHASE' },
    targeting,
  } })
  if (!conj.ok) { await desfazer(); return NextResponse.json({ error: 'Nao consegui criar o conjunto de anuncios: ' + conj.erro }, { status: 400 }) }

  // 4) Criativo (pagina + midia + legenda + botao)
  const cta = { type: r.botao, value: { link: r.link } }
  const spec: any = { page_id: r.paginaId }
  if (midiaTipo === 'video') spec.video_data = { video_id: videoId, image_url: capa, message: r.legenda, title: r.titulo, call_to_action: cta }
  else spec.link_data = { image_hash: imageHash, link: r.link, message: r.legenda, name: r.titulo, call_to_action: cta }
  const cri = await graph(u.conta + '/adcreatives', u.token, { metodo: 'POST', corpo: { name: nome, object_story_spec: spec } })
  if (!cri.ok) { await desfazer(); return NextResponse.json({ error: 'Nao consegui criar o criativo: ' + cri.erro }, { status: 400 }) }

  // 5) Anuncio (pausado)
  const ad = await graph(u.conta + '/ads', u.token, { metodo: 'POST', corpo: { name: nome, adset_id: String(conj.data.id), creative: { creative_id: String(cri.data.id) }, status: 'PAUSED' } })
  if (!ad.ok) { await desfazer(); return NextResponse.json({ error: 'Nao consegui criar o anuncio: ' + ad.erro }, { status: 400 }) }

  return NextResponse.json({ success: true, campanhaId: campId, conjuntoId: String(conj.data.id), anuncioId: String(ad.data.id), nome })
}

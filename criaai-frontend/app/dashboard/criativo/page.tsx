'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { botaoClaro } from '@/components/criativo/ui'
import styles from '../dashboard.module.css'
import CardRoteiro, { Roteiro, ROTEIRO_VAZIO, roteiroEmTexto } from '@/components/criativo/CardRoteiro'
import CardNarracao, { Narracao } from '@/components/criativo/CardNarracao'
import CardVideos, { Clipe } from '@/components/criativo/CardVideos'
import CardEdicao, { Gerado } from '@/components/criativo/CardEdicao'

type Aba = 'roteiro' | 'narracao' | 'videos' | 'edicao'

export default function CriativoPage() {
  const [aba, setAba] = useState<Aba>('roteiro')
  const [roteiro, setRoteiro] = useState<Roteiro>(ROTEIRO_VAZIO)
  const [roteiroId, setRoteiroId] = useState<string | null>(null)
  const [textoNarracao, setTextoNarracao] = useState('')
  const [narracao, setNarracao] = useState<Narracao | null>(null)
  const [clipes, setClipes] = useState<Clipe[]>([])
  const [gerados, setGerados] = useState<Gerado[]>([])
  const [saldo, setSaldo] = useState<any>(null)
  useEffect(function() {
    function ler() { fetch('/api/criativo/saldo', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) { if (j && typeof j.restante === 'number') setSaldo(j) }).catch(function() {}) }
    ler()
    window.addEventListener('criativo-saldo', ler)
    return function() { window.removeEventListener('criativo-saldo', ler) }
  }, [])
  const sb = useRef<any>(null)
  if (!sb.current) sb.current = createClient()
  const [carregando, setCarregando] = useState(true)
  const [apagando, setApagando] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)

  // Criativos salvos na conta: aparecem de novo sempre que a pessoa volta aqui
  useEffect(function() {
    let vivo = true
    ;(async function() {
      try {
        const r = await sb.current.from('criativos_gerados').select('id, path, mb, duracao, n_videos, created_at').order('created_at', { ascending: false }).limit(60)
        const linhas: any[] = r.data || []
        if (!linhas.length) return
        const su = await sb.current.storage.from('criativos-gerados').createSignedUrls(linhas.map(function(x) { return x.path }), 6 * 3600)
        const mapa: Record<string, string> = {}
        for (const x of (su.data || []) as any[]) { if (x && x.path && x.signedUrl) mapa[x.path] = x.signedUrl }
        const lista: Gerado[] = linhas.filter(function(x) { return mapa[x.path] }).map(function(x) {
          return { id: x.id, url: mapa[x.path], mb: Number(x.mb) || 0, duracao: Number(x.duracao) || 0, nVideos: Number(x.n_videos) || 0, criadoEm: new Date(x.created_at).getTime(), path: x.path, salvo: 'ok' as const }
        })
        if (vivo) setGerados(function(atual) {
          // junta com o que acabou de ser gerado nesta visita, sem repetir
          const ids = new Set(atual.map(function(g) { return g.id }))
          return atual.concat(lista.filter(function(g) { return !ids.has(g.id) }))
        })
      } catch (e) { console.error('[criativo] carregar salvos:', e) }
      finally { if (vivo) setCarregando(false) }
    })()
    return function() { vivo = false }
  }, [])

  function marcar(id: string, p: Partial<Gerado>) { setGerados(function(l) { return l.map(function(x) { return x.id === id ? { ...x, ...p } : x }) }) }

  // Guarda o criativo na conta da pessoa (nao atrapalha a geracao: se falhar, aparece "Tentar salvar de novo")
  async function salvar(g: Gerado) {
    if (!g.blob) return
    marcar(g.id, { salvo: 'salvando' })
    try {
      const u = await sb.current.auth.getUser()
      const uid = u && u.data && u.data.user ? u.data.user.id : ''
      if (!uid) throw new Error('sem login')
      const path = uid + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.mp4'
      const up = await sb.current.storage.from('criativos-gerados').upload(path, g.blob, { contentType: 'video/mp4', upsert: false })
      if (up.error) throw new Error(up.error.message)
      const ins = await sb.current.from('criativos_gerados').insert({ user_id: uid, path, mb: Number(g.mb.toFixed(2)), duracao: Number(g.duracao.toFixed(1)), n_videos: g.nVideos }).select('id').single()
      if (ins.error || !ins.data) { await sb.current.storage.from('criativos-gerados').remove([path]); throw new Error(ins.error ? ins.error.message : 'sem id') }
      marcar(g.id, { salvo: 'ok', path, blob: undefined })
    } catch (e: any) {
      console.error('[criativo] salvar:', e && e.message ? e.message : e)
      marcar(g.id, { salvo: 'erro' })
    }
  }

  async function remover(g: Gerado) {
    if (g.salvo === 'ok' && g.path) {
      setApagando(g.id)
      try {
        const d = await sb.current.from('criativos_gerados').delete().eq('path', g.path)
        if (d.error) throw new Error(d.error.message)
        await sb.current.storage.from('criativos-gerados').remove([g.path])
      } catch (e) { console.error('[criativo] apagar:', e); setApagando(null); return }
      setApagando(null)
    }
    if (g.url.indexOf('blob:') === 0) URL.revokeObjectURL(g.url)
    setGerados(function(l) { return l.filter(function(x) { return x.id !== g.id }) })
  }

  // Baixa o arquivo (o endereco do salvo e de outro site, entao busca o arquivo e entrega pelo navegador)
  async function baixar(g: Gerado, nome: string) {
    try {
      let href = g.url
      if (href.indexOf('blob:') !== 0) {
        const r = await fetch(href)
        if (!r.ok) throw new Error('falhou')
        href = URL.createObjectURL(await r.blob())
      }
      const a = document.createElement('a')
      a.href = href; a.download = nome
      document.body.appendChild(a); a.click(); a.remove()
      if (href !== g.url) setTimeout(function() { URL.revokeObjectURL(href) }, 10000)
    } catch (e) { window.open(g.url, '_blank') }
  }
  const mmss = function(t: number) { const m = Math.floor(t / 60); const r = Math.round(t % 60); return m + ':' + String(r).padStart(2, '0') }
  const hora = function(ms: number) { try { return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) } catch (e) { return '' } }

  const cards: { id: Aba; n: number; icone: string; titulo: string; sub: string; pronto: boolean }[] = [
    { id: 'roteiro', n: 1, icone: '✍️', titulo: 'Roteiro', sub: 'Gancho, corpo, mecanismo e CTA', pronto: !!roteiroEmTexto(roteiro) },
    { id: 'narracao', n: 2, icone: '🎙️', titulo: 'Narração', sub: 'Voz e velocidade do áudio', pronto: !!narracao },
    { id: 'videos', n: 3, icone: '🎞️', titulo: 'Vídeos', sub: 'Escolha os vídeos do criativo', pronto: clipes.length > 0 },
    { id: 'edicao', n: 4, icone: '✂️', titulo: 'Edição', sub: 'Vídeos, áudio e música em um Reels UGC', pronto: false },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.pageTitle}>Gerador de Criativos</div>
          <div className={styles.pageSub}>Do roteiro ao vídeo pronto, em 4 passos</div>
        </div>
      </div>

      <div className={styles.content}>
        {saldo && !saldo.ilimitado && saldo.novo && (
          <div style={{ maxWidth: 860, marginBottom: 14, padding: '12px 16px', borderRadius: 14, background: saldo.restante > 0 ? 'rgba(34,197,94,0.10)' : 'rgba(124,92,252,0.10)', border: '1px solid ' + (saldo.restante > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(124,92,252,0.3)'), display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{saldo.restante > 0 ? '🎁' : '🛠️'}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {saldo.restante > 0 ? 'Você pode gerar ' + saldo.restante + ' criativo' + (saldo.restante === 1 ? '' : 's') + ' de teste.' : 'Este recurso está em atualização no momento.'}
            </span>
          </div>
        )}
        {saldo && !saldo.ilimitado && !saldo.novo && (
          <div style={{ maxWidth: 860, marginBottom: 14, padding: '12px 16px', borderRadius: 14, background: saldo.restante > 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)', border: '1px solid ' + (saldo.restante > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'), display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20 }}>{saldo.restante > 0 ? '🎟️' : '🔒'}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {saldo.restante > 0 ? 'Você ainda pode gerar ' + saldo.restante + ' criativo' + (saldo.restante === 1 ? '' : 's') + '. Cada criativo pronto usa 1 crédito.' : (saldo.temPlano || saldo.limite > 0 ? 'Seus créditos de criativo acabaram.' : 'Assine um plano para gerar criativos.')}
            </span>
            {saldo.restante <= 0 && <a href="/dashboard/planos" style={{ background: '#7c5cfc', color: '#fff', borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>Ver planos</a>}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
          {cards.map(function(c) {
            const on = aba === c.id
            return (
              <button key={c.id} onClick={function() { setAba(c.id) }} style={{ cursor: 'pointer', textAlign: 'left', padding: '14px 16px', borderRadius: 16, color: 'var(--text)', background: on ? 'rgba(124,92,252,0.10)' : 'var(--surface)', border: on ? '2px solid #7c5cfc' : '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{c.icone}</span>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, flex: 1 }}>{c.n}. {c.titulo}</span>
                  {c.pronto && <span style={{ color: '#15803d', fontWeight: 800, fontSize: 13 }}>✓ pronto</span>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 4 }}>{c.sub}</div>
              </button>
            )
          })}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, maxWidth: 860, boxShadow: 'var(--shadow-sm)' }}>
          {aba === 'roteiro' && (
            <CardRoteiro roteiro={roteiro} setRoteiro={setRoteiro} roteiroId={roteiroId} setRoteiroId={setRoteiroId} onUsar={function() { setTextoNarracao(roteiroEmTexto(roteiro)); setAba('narracao') }} onUsarTexto={function(t) { setTextoNarracao(t); setAba('narracao') }} />
          )}
          {aba === 'narracao' && (
            <CardNarracao texto={textoNarracao} setTexto={setTextoNarracao} narracao={narracao} setNarracao={setNarracao} />
          )}
          {aba === 'videos' && <CardVideos clipes={clipes} setClipes={setClipes} onSeguir={function() { setAba('edicao') }} />}
          {aba === 'edicao' && <CardEdicao clipes={clipes} narracao={narracao} onIrVideos={function() { setAba('videos') }} onIrNarracao={function() { setAba('narracao') }} onGerado={function(g) { setGerados(function(l) { const novo: Gerado = { ...g, salvo: 'salvando' }; return [novo].concat(l) }); salvar(g) }} />}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, maxWidth: 860, boxShadow: 'var(--shadow-sm)', marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 22 }}>🎬</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, flex: 1 }}>Criativos gerados{gerados.length ? ' (' + gerados.length + ')' : ''}</span>
          </div>
          {gerados.length === 0 ? (
            <div style={{ fontSize: 13.5, color: 'var(--muted2)', marginTop: 8 }}>{carregando ? 'Carregando os seus criativos...' : 'Os criativos que você montar ficam salvos aqui, na sua conta, para abrir e baixar quando quiser.'}</div>
          ) : (
            <>
              <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 6 }}>Ficam salvos na sua conta: é só voltar aqui quando quiser para assistir e baixar.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginTop: 14 }}>
                {gerados.map(function(g, i) {
                  return (
                    <div key={g.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: 10 }}>
                      <video src={g.url} controls playsInline preload="metadata" style={{ width: '100%', aspectRatio: '9 / 16', borderRadius: 10, background: '#000', display: 'block', objectFit: 'cover' }} />
                      <div style={{ fontWeight: 800, fontSize: 13.5, marginTop: 8 }}>Criativo {gerados.length - i}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>{mmss(g.duracao)} · {g.mb.toFixed(1)} MB · {g.nVideos} vídeo(s) · {hora(g.criadoEm)}</div>
                      <div style={{ fontSize: 11.5, marginTop: 4, fontWeight: 700, color: g.salvo === 'ok' ? '#15803d' : g.salvo === 'erro' ? '#b91c1c' : 'var(--muted2)' }}>
                        {g.salvo === 'ok' ? '✓ Salvo na sua conta' : g.salvo === 'erro' ? 'Não consegui salvar. Baixe este agora.' : 'Salvando...'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button onClick={function() { baixar(g, 'criativo-' + (gerados.length - i) + '.mp4') }} style={{ ...botaoClaro, flex: 1, textAlign: 'center', padding: '8px 6px', fontSize: 12.5 }}>⬇ Baixar</button>
                        {g.salvo === 'erro' && <button onClick={function() { salvar(g) }} style={{ ...botaoClaro, padding: '8px 10px', fontSize: 12.5 }} title="Tentar salvar de novo">↻</button>}
                        {confirmando === g.id
                          ? <button onClick={function() { setConfirmando(null); remover(g) }} disabled={apagando === g.id} style={{ ...botaoClaro, padding: '8px 10px', fontSize: 12.5, color: '#b91c1c' }}>Apagar mesmo?</button>
                          : <button onClick={function() { setConfirmando(g.id) }} style={{ ...botaoClaro, padding: '8px 10px', fontSize: 12.5 }} title="Apagar este criativo">🗑</button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
